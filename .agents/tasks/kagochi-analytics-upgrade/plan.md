# Implementation Plan — Kagochi Farm Analytics Upgrade

Branch: `feature/farm-analytics-upgrade` (already checked out)  
All commands run from workspace root: `c:\Users\kahosh\Desktop\kagochi_enterprise`  
Backend tests: `npm test` inside `backend/`  
Frontend build: `npm run build` inside `frontend/`

---

## Step 1 — Add `vaccinations` table + `population_events` table to database.ts

**What to do.**  
In `backend/src/database.ts`, add two new `CREATE TABLE IF NOT EXISTS` blocks inside
the existing `db.exec(...)` call (or in a new `db.exec` immediately after it), then add
three `ensureColumn`-style migrations using the existing `hasColumn()` helper:

1. `vaccinations` table (new, for vaccination management).
2. `population_events` table (new, for survivor tracking).
3. `count_vaccinated` column migration on `vaccinations` (in case the table already
   existed without it in a future upgrade scenario).

**Exact DDL to add inside `db.exec` (before the index block):**

```sql
CREATE TABLE IF NOT EXISTS vaccinations (
  id               TEXT PRIMARY KEY,
  owner_id         TEXT NOT NULL,
  species          TEXT NOT NULL,
  target_id        TEXT NOT NULL DEFAULT '',
  target_name      TEXT NOT NULL,
  vaccine_name     TEXT NOT NULL,
  date_due         TEXT NOT NULL,
  date_administered TEXT,
  status           TEXT NOT NULL DEFAULT 'upcoming',
  count_vaccinated INTEGER NOT NULL DEFAULT 0,
  notes            TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS population_events (
  id          TEXT PRIMARY KEY,
  owner_id    TEXT NOT NULL,
  species     TEXT NOT NULL CHECK(species IN ('poultry','cattle')),
  target_id   TEXT NOT NULL,
  target_name TEXT NOT NULL,
  event_type  TEXT NOT NULL CHECK(event_type IN ('addition','death','sale','transfer_in','transfer_out')),
  count       INTEGER NOT NULL CHECK(count > 0),
  date        TEXT NOT NULL,
  reason      TEXT NOT NULL DEFAULT '',
  notes       TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Indexes to add after the existing index block:**

```sql
CREATE INDEX IF NOT EXISTS idx_vaccinations_owner   ON vaccinations(owner_id, date_due);
CREATE INDEX IF NOT EXISTS idx_pop_events_owner     ON population_events(owner_id, date);
CREATE INDEX IF NOT EXISTS idx_pop_events_target    ON population_events(owner_id, target_id);
```

**Migration for count_vaccinated column (after `hasColumn("users", "token_version")` block):**

```typescript
if (!hasColumn("vaccinations", "count_vaccinated")) {
  db.exec("ALTER TABLE vaccinations ADD COLUMN count_vaccinated INTEGER NOT NULL DEFAULT 0");
}
```

**Files:** `backend/src/database.ts`  
Do NOT touch any existing table DDL, existing `hasColumn` blocks, or any existing function.

**Verify:** `npm test` in `backend/` — all 49 existing tests still pass.

---

## Step 2 — Add vaccination + population_events types to resourceTables and export helper functions

**What to do.**  
Extend `database.ts` in two ways:

### 2a — Add `vaccinations` to `resourceTables`

Append to the `resourceTables` const:

```typescript
vaccinations: {
  table: "vaccinations",
  columns: ["species", "target_id", "target_name", "vaccine_name", "date_due",
            "date_administered", "status", "count_vaccinated", "notes"],
  dateColumn: "date_due",
},
```

`date_administered` is nullable; its value will be `null` or a TEXT date string. The
generic `orderedValues` helper already passes values through — callers must supply `null`
for absent dates, not `undefined`. Note this in the schema step.

### 2b — Add dedicated `population_events` functions

Because `population_events` has custom validation logic (negative-population guard) it is
NOT added to `resourceTables`. Instead, add these standalone exported functions below the
existing CRUD helpers:

```typescript
export interface PopulationEventRow {
  id: string;
  owner_id: string;
  species: 'poultry' | 'cattle';
  target_id: string;
  target_name: string;
  event_type: 'addition' | 'death' | 'sale' | 'transfer_in' | 'transfer_out';
  count: number;
  date: string;
  reason: string;
  notes: string;
}

/** Returns all events for this owner, newest first. */
export function listPopulationEvents(
  ownerId: string,
  species?: string,
  targetId?: string,
): PopulationEventRow[] { ... }

/** Returns the computed survivor count for a single target. */
export function getSurvivorCount(
  ownerId: string,
  targetId: string,
): number { ... }

/** Inserts a new event. Throws Error('NEGATIVE_POPULATION') if the event would
 *  make survivors go below zero. */
export function createPopulationEvent(
  id: string,
  ownerId: string,
  data: Omit<PopulationEventRow, 'id' | 'owner_id'>,
): void { ... }

export function deletePopulationEvent(
  id: string,
  ownerId: string,
): { changes: number } { ... }
```

**Survivor count formula inside `getSurvivorCount`:**

```sql
SELECT
  COALESCE(SUM(CASE WHEN event_type IN ('addition','transfer_in') THEN count ELSE 0 END), 0)
  - COALESCE(SUM(CASE WHEN event_type IN ('death','sale','transfer_out') THEN count ELSE 0 END), 0)
  AS net
FROM population_events
WHERE owner_id = ? AND target_id = ?
```

In `createPopulationEvent`: before inserting, fetch the target's initial_count (from
`poultry_batches` when species = 'poultry', or `1` for livestock since each row = one
animal) and add it to the existing event totals. If the event being inserted is a
reducing type ('death'/'sale'/'transfer_out') and `initial_count + net_events - count < 0`,
throw `new Error('NEGATIVE_POPULATION')`.

Poultry initial_count query:
```sql
SELECT initial_count FROM poultry_batches WHERE id = ? AND owner_id = ?
```
Livestock: treat initial_count as 1 per animal ID (each livestock row is one animal).

**Files:** `backend/src/database.ts`  
**Verify:** `npm test` in `backend/` — all 49 existing tests still pass.

---

## Step 3 — Add validation schemas for vaccinations and population_events

**What to do.**  
In `backend/src/schemas.ts`, add three new schemas after the existing `expenseSchema`
block and before the `resourceDefinitions` object:

### 3a — vaccinationSchema

```typescript
export const vaccinationSchema = z.object({
  species:           z.enum(["poultry", "cattle"]),
  targetId:          z.string().trim().max(100).default(""),
  targetName:        text(150),
  vaccineName:       text(150),
  dateDue:           isoDate,
  dateAdministered:  isoDate.nullable().optional(),
  status:            z.enum(["upcoming", "due_today", "overdue", "completed", "cancelled"]).default("upcoming"),
  countVaccinated:   z.number().int().min(0).default(0),
  notes:             z.string().trim().max(500).default(""),
});
```

Add `vaccinations` to `resourceDefinitions`:

```typescript
vaccinations: {
  label: "Vaccination record",
  schema: vaccinationSchema,
  toColumns: (d: z.infer<typeof vaccinationSchema>) => ({
    species:           d.species,
    target_id:         d.targetId,
    target_name:       d.targetName,
    vaccine_name:      d.vaccineName,
    date_due:          d.dateDue,
    date_administered: d.dateAdministered ?? null,
    status:            d.status,
    count_vaccinated:  d.countVaccinated,
    notes:             d.notes,
  }),
},
```

**Important:** `date_administered` can be `null`. The generic `orderedValues()` in
`database.ts` calls `values[column]` and throws if the value is `undefined`. Change the
guard in `orderedValues` from:
```typescript
if (value === undefined) throw new Error(...)
```
to:
```typescript
if (value === undefined) throw new Error(...)  // null is allowed (nullable columns)
```
i.e. keep the existing guard unchanged — `null` is already not `undefined`, so it passes
through correctly. No change needed to `orderedValues`.

### 3b — populationEventSchema (used only by the new manual routes)

```typescript
export const populationEventSchema = z.object({
  species:    z.enum(["poultry", "cattle"]),
  targetId:   z.string().trim().min(1).max(100),
  targetName: text(150),
  eventType:  z.enum(["addition","death","sale","transfer_in","transfer_out"]),
  count:      z.number().int().min(1, "Count must be at least 1.").max(100_000),
  date:       isoDate,
  reason:     z.string().trim().max(300).default(""),
  notes:      z.string().trim().max(500).default(""),
});
```

### 3c — mortalityQuerySchema and survivorQuerySchema

```typescript
export const mortalityQuerySchema = z.object({
  species:  z.enum(["poultry", "cattle"]).optional(),
  targetId: z.string().trim().max(100).optional(),
  from:     isoDate.optional(),
  to:       isoDate.optional(),
  period:   z.enum(["daily", "weekly", "monthly", "yearly"]).default("daily"),
});

export const survivorQuerySchema = z.object({
  species:  z.enum(["poultry", "cattle"]).optional(),
  targetId: z.string().trim().max(100).optional(),
});
```

**Files:** `backend/src/schemas.ts`  
**Verify:** `npm test` in `backend/` — all 49 existing tests still pass (no schema is
called from existing tests by name).

---

## Step 4 — Add population analytics functions to analytics.ts

**What to do.**  
Append to `backend/src/analytics.ts` (do not touch any existing functions):

### 4a — survivorSummary function

Pure function receiving raw event rows and batch/animal rows. Returns per-target stats.

```typescript
export interface PopulationEventRaw {
  target_id: string;
  target_name: string;
  species: string;
  event_type: string;
  count: number;
  date: string;
}

export interface SurvivorTarget {
  targetId: string;
  targetName: string;
  species: string;
  initialCount: number;
  additions: number;
  transfersIn: number;
  deaths: number;
  sales: number;
  transfersOut: number;
  survivors: number;
  survivorRatePercent: number | null;
}

export function buildSurvivorSummary(
  events: PopulationEventRaw[],
  poultryBatches: Row[],
  livestock: Row[],
): {
  targets: SurvivorTarget[];
  totalPoultryBirds: number;
  totalLivestockAnimals: number;
}
```

Logic:
- Group events by `target_id`.
- For each target, look up `initial_count` from poultry_batches (species=poultry) or use
  `1` per livestock row.
- Compute survivors = initialCount + additions + transfersIn - deaths - sales - transfersOut.
- `survivorRatePercent = survivors / (initialCount + additions + transfersIn) * 100`, null
  when denominator is zero.
- Clamp survivors to 0 (never negative in output, validation prevents it on write).

### 4b — mortalitySeries function

```typescript
export interface MortalityPoint {
  label: string;          // e.g. "2026-03-25" or "2026-W12" or "2026-03" or "2026"
  startPopulation: number | null;
  deaths: number;
  mortalityRatePercent: number | null;
  cannotCalculate: boolean;  // true when startPopulation = 0 or null
}

export function buildMortaltySeries(
  events: PopulationEventRaw[],
  poultryBatches: Row[],
  livestock: Row[],
  from: string,
  to: string,
  period: "daily" | "weekly" | "monthly" | "yearly",
  speciesFilter?: string,
  targetIdFilter?: string,
): MortalityPoint[]
```

Logic:
- Filter events to `event_type = 'death'` within [from, to].
- Optionally filter by species and targetId.
- Group deaths by the bucket: day (YYYY-MM-DD), week (YYYY-Www using ISO week), month
  (YYYY-MM), year (YYYY).
- For each bucket, `startPopulation` = survivors as of the day before the bucket opens
  (sum all events before the bucket start for matching targets).
- `mortalityRatePercent = deaths / startPopulation * 100` when startPopulation > 0.
- When startPopulation = 0 or null → set `cannotCalculate: true`, `mortalityRatePercent: null`.
- Return only buckets that have at least one death, plus immediately adjacent zero-death
  buckets needed to anchor chart endpoints (i.e., always include the first and last bucket
  in range even if deaths = 0).

**Files:** `backend/src/analytics.ts`  
**Verify:** `npm test` in `backend/` — all 49 existing tests still pass. (New functions are
added, not modifying existing ones.)

---

## Step 5 — Add new API routes to app.ts

**What to do.**  
In `backend/src/app.ts`, add imports and four new route handlers inside the analytics
section (after the existing `/farm/summary` route, before the AI section). Keep the
existing auto-generated resource loop — vaccinations will be auto-handled by it once
added to `resourceDefinitions` in Step 3.

### Imports to add

```typescript
import {
  listPopulationEvents,
  createPopulationEvent,
  deletePopulationEvent,
  type PopulationEventRow,
} from "./database.js";
import {
  populationEventSchema,
  mortalityQuerySchema,
  survivorQuerySchema,
} from "./schemas.js";
import { buildSurvivorSummary, buildMortaltySeries } from "./analytics.js";
// also add: listRecords for poultry/livestock lookups
```

`listRecords` is already imported via `* as store`. Use `store.listRecords("poultry", ...)`.

### Route 5a — GET /api/farm/population-events

```
GET /api/farm/population-events?species=poultry&targetId=<id>
Response: { populationEvents: PopulationEventRow[] }
```

### Route 5b — POST /api/farm/population-events

```
POST /api/farm/population-events
Body: populationEventSchema fields
Response 201: { message: "Population event recorded.", id }
Response 400: if validation fails
Response 409: { error: "This would make the population go negative." } on NEGATIVE_POPULATION
Response 409 (warning, not error): if a death event exists with the same target_id, date,
  and count already — return 200 with { message: "...", warning: "A death event with the
  same date and count already exists for this animal or batch. Please check for duplicates." }
  (Do not block saves on duplicate warning — just surface it.)
```

### Route 5c — DELETE /api/farm/population-events/:id

```
DELETE /api/farm/population-events/:id
Response 200: { message: "Population event deleted." }
Response 404: { error: "Population event not found." }
```

### Route 5d — GET /api/farm/survivor-summary

```
GET /api/farm/survivor-summary?species=poultry&targetId=<id>
Response: {
  targets: SurvivorTarget[],
  totalPoultryBirds: number,
  totalLivestockAnimals: number
}
```

Uses `buildSurvivorSummary(events, store.listRecords("poultry", ownerId), store.listRecords("livestock", ownerId))`.

### Route 5e — GET /api/farm/mortality-summary

```
GET /api/farm/mortality-summary?from=YYYY-MM-DD&to=YYYY-MM-DD&period=daily&species=poultry&targetId=<id>
```

Defaults: `from` = 30 days before today; `to` = today; `period` = "daily".

```typescript
Response: {
  series: MortalityPoint[],
  from: string,
  to: string,
  period: string,
}
```

When startPopulation is zero for every point, include the series but with
`cannotCalculate: true` on each point — do not return an error response.

**Files:** `backend/src/app.ts`  
**Verify:** `npm test` in `backend/` — all 49 existing tests still pass. Then manually
verify new routes exist:
```
npm run dev   (in backend/)
curl http://localhost:3001/api/farm/population-events  # expects 401 (no session)
```

---

## Step 6 — Add backend tests for new routes and analytics functions

**What to do.**  
Create `backend/test/populationEvents.test.ts` (new file). Follow the pattern in
`test/api.test.ts` (supertest agent, `before`/`after` hooks).

**Test scenarios to cover:**

1. `POST /api/farm/population-events` — valid addition saves and returns 201.
2. `POST /api/farm/population-events` — death count exceeding population returns 409 with
   `"would make the population go negative"`.
3. `POST /api/farm/population-events` — duplicate death on same date/target/count returns
   200 with a `warning` field.
4. `GET /api/farm/population-events?species=poultry` — returns only matching events.
5. `DELETE /api/farm/population-events/:id` — deletes and returns 200.
6. `GET /api/farm/survivor-summary` — returns correct survivors after add+death sequence:
   batch initial=100, addition=20, death=10 → survivors=110.
7. `GET /api/farm/mortality-summary?period=daily` — returns series with correct
   mortalityRatePercent; point where startPopulation=0 has `cannotCalculate: true`.
8. `GET /api/farm/vaccinations` — auto-CRUD: create, list, update, delete.
9. `POST /api/farm/vaccinations` with `count_vaccinated: 5` — round-trips correctly.
10. Another user cannot read or delete the first user's population events (ownership isolation).

Create `backend/test/analyticsPopulation.test.ts` (new file) for unit tests of
`buildSurvivorSummary` and `buildMortaltySeries`:

1. Correct survivors with all event types combined.
2. Survivor rate = null when denominator = 0.
3. Mortality series buckets deaths correctly by day/week/month.
4. cannotCalculate = true when startPopulation = 0.
5. Deaths filtered by species/targetId correctly.

**Files:** `backend/test/populationEvents.test.ts`, `backend/test/analyticsPopulation.test.ts`  
**Verify:** `npm test` in `backend/` — all new tests pass alongside the 49 existing ones.

---

## Step 7 — Add frontend types for new features

**What to do.**  
In `frontend/src/types/farm.ts`, append new interfaces (do not modify existing ones):

```typescript
export type PopulationEventType =
  | 'addition' | 'death' | 'sale' | 'transfer_in' | 'transfer_out';

export interface PopulationEvent {
  id: string;
  species: 'poultry' | 'cattle';
  targetId: string;
  targetName: string;
  eventType: PopulationEventType;
  count: number;
  date: string;
  reason: string;
  notes: string;
}

export interface SurvivorTarget {
  targetId: string;
  targetName: string;
  species: string;
  initialCount: number;
  additions: number;
  transfersIn: number;
  deaths: number;
  sales: number;
  transfersOut: number;
  survivors: number;
  survivorRatePercent: number | null;
}

export interface SurvivorSummary {
  targets: SurvivorTarget[];
  totalPoultryBirds: number;
  totalLivestockAnimals: number;
}

export interface MortalityPoint {
  label: string;
  startPopulation: number | null;
  deaths: number;
  mortalityRatePercent: number | null;
  cannotCalculate: boolean;
}

export interface MortalitySummary {
  series: MortalityPoint[];
  from: string;
  to: string;
  period: string;
}

export interface VaccinationRecord {
  id: string;
  species: 'poultry' | 'cattle';
  targetId: string;
  targetName: string;
  vaccineName: string;
  dateDue: string;
  dateAdministered: string | null;
  status: 'upcoming' | 'due_today' | 'overdue' | 'completed' | 'cancelled';
  countVaccinated: number;
  notes: string;
}
```

**Files:** `frontend/src/types/farm.ts`  
**Verify:** `npm run build` in `frontend/` — builds without TypeScript errors.

---

## Step 8 — Add frontend API service functions for new endpoints

**What to do.**  
In `frontend/src/services/storage.ts`, append new exported functions after the existing
`deleteExpense` block. Do not modify any existing function.

```typescript
// Population Events
function mapPopulationEvent(row: any): PopulationEvent { ... }
export async function loadPopulationEvents(params?: { species?: string; targetId?: string }): Promise<PopulationEvent[]>
export async function addPopulationEvent(event: Omit<PopulationEvent, 'id'>): Promise<{ id: string; warning?: string }>
export async function deletePopulationEvent(id: string): Promise<void>

// Survivor Summary
export async function loadSurvivorSummary(params?: { species?: string; targetId?: string }): Promise<SurvivorSummary>

// Mortality Summary
export async function loadMortalitySummary(params?: {
  from?: string; to?: string; period?: string; species?: string; targetId?: string;
}): Promise<MortalitySummary>

// Vaccinations
function mapVaccination(row: any): VaccinationRecord { ... }
export async function loadVaccinations(): Promise<VaccinationRecord[]>
export async function addVaccination(v: Omit<VaccinationRecord, 'id'>): Promise<VaccinationRecord>
export async function updateVaccination(id: string, v: Omit<VaccinationRecord, 'id'>): Promise<void>
export async function deleteVaccination(id: string): Promise<void>
```

All use `apiRequest`. Parameter serialization via `URLSearchParams` for query strings.

`mapVaccination` converts `row.date_due → dateDue`, `row.vaccine_name → vaccineName`,
`row.count_vaccinated → countVaccinated`, `row.date_administered → dateAdministered`,
`row.target_id → targetId`, `row.target_name → targetName`.

**Files:** `frontend/src/services/storage.ts`  
**Verify:** `npm run build` in `frontend/` — builds without TypeScript errors.

---

## Step 9 — Create SurvivorView.tsx

**What to do.**  
Create `frontend/src/views/SurvivorView.tsx`. Follow the layout pattern of
`PoultryView.tsx` (management-page, summary-card, management-card, form-grid CSS classes).

**Features:**
- On mount, load `loadSurvivorSummary()` and `loadPoultry()` and `loadLivestock()`.
- Display a KPI summary row: Total Poultry Survivors, Total Livestock Active, and (if any
  target is selected) that target's survivor rate %.
- A species/target filter row (two `<select>` elements: species and target) using
  `dashboard-filter-bar` and `filter-chip` CSS classes.
- A population ledger table per selected target (or all targets when none selected) with
  columns: Date | Event | Count | Reason | Survivor count after. Use `modern-table` CSS class.
- A form to record a new population event:
  - Fields: Species (select), Target (select, populated from loaded poultry/livestock),
    Event type (select with plain English labels: "Birds/animals added" = addition,
    "Animals that died" = death, "Sold" = sale, "Transferred in" = transfer_in,
    "Transferred out" = transfer_out), Count (number), Date (date), Reason (text), Notes
    (textarea).
  - On submit, call `addPopulationEvent`. If response includes a `warning`, show it in a
    yellow warning box (class `form-warning`) — do not block the save.
  - On 409 error ("would make population go negative"), display inline error in the form.
- Delete button on each event row; confirm before deleting.

**Language rules:** Use "Animals that died" not "Mortality events". Use "Birds/animals
added" not "Addition". All form labels must be plain English.

**Files:** `frontend/src/views/SurvivorView.tsx` (new)  
**Verify:** `npm run build` in `frontend/` — no errors.

---

## Step 10 — Create MortalityView.tsx

**What to do.**  
Create `frontend/src/views/MortalityView.tsx`. Pattern: `PerformanceView.tsx` layout.

**Features:**
- Period filter bar (matching dashboard pattern): "Last 7 days" | "Last 30 days" |
  "Last 90 days" | "This year" | Custom date range. Use `dashboard-filter-bar` CSS class.
- Period granularity selector: Daily | Weekly | Monthly | Yearly. Use `filter-chip` buttons.
- Species filter: All | Poultry | Livestock.
- On any filter change, call `loadMortalitySummary({ from, to, period, species })`.
- Chart: recharts is NOT in `frontend/package.json`. Use a simple inline SVG bar chart.
  - SVG width 100%, height 220px, bars proportional to `mortalityRatePercent`.
  - Points with `cannotCalculate: true` render with a striped/grey bar and tooltip
    "Cannot calculate — no population data for this period".
  - X-axis labels = `point.label`. Y-axis label = "Mortality Rate (%)".
- Below the chart, a summary table: columns Date | Deaths | Start Population | Mortality
  Rate. Use `modern-table` CSS class. Rows where cannotCalculate = true show "—" in the
  rate column with a note "Cannot calculate".
- Use "Animals that died" wherever "Mortality events" would appear.

**Files:** `frontend/src/views/MortalityView.tsx` (new)  
**Verify:** `npm run build` in `frontend/` — no errors.

---

## Step 11 — Create VaccinationsView.tsx

**What to do.**  
Create `frontend/src/views/VaccinationsView.tsx`. Pattern: `PoultryView.tsx`.

**Features:**

### Tab bar
Two tabs: "Schedule" (upcoming/overdue vaccinations) and "History" (completed
vaccinations). Use `filter-chip` CSS class for tab buttons.

### Status calculation (frontend-side, never auto-applied on save)
Derive display status from `dateDue` at render time — never send a computed status to the
server except when the user explicitly marks a vaccination as completed:
```
if status === 'completed' OR status === 'cancelled' → show as-is
else if dateDue < today → 'overdue'
else if dateDue === today → 'due today'
else → 'upcoming'
```

### Schedule tab
Table with columns: Target | Vaccine | Due Date | Status badge | Count Scheduled |
Actions (Mark Done / Edit / Delete). Use `modern-table`.

Status badges (CSS classes to create inline styles or small classes):
- `overdue` → red background
- `due today` → amber background
- `upcoming` → green background

"Mark Done" sets `status: 'completed'`, `dateAdministered: today`, calls `updateVaccination`.

### History tab
Table with columns: Target | Vaccine | Date Administered | Count Vaccinated | Notes.
Show only rows where `status === 'completed'`. Sort by `dateAdministered` descending.

### Form
Fields: Species, Target Name (text, auto-suggest from existing poultry/livestock names),
Target ID (hidden, matched from name), Vaccine Name, Due Date, Count Scheduled
(maps to `countVaccinated` field name on submit — this is the planned count; the actual
administered count is updated only when marking done), Notes.
`dateAdministered` and `status` are NOT in the add form; they are set only via "Mark Done".

**Critical:** the form must NOT include a status field that defaults to "administered" or
auto-marks anything as completed. New records are always saved with `status: "upcoming"`.

**Files:** `frontend/src/views/VaccinationsView.tsx` (new)  
**Verify:** `npm run build` in `frontend/` — no errors.

---

## Step 12 — Update HomeView.tsx with survivor/mortality tiles

**What to do.**  
In `frontend/src/views/HomeView.tsx`:

1. Add two new props to `HomeViewProps`:
   - `totalPoultryBirds: number` — from `survivorSummary.totalPoultryBirds`
   - `totalLivestockActive: number` — from `survivorSummary.totalLivestockAnimals`

2. Add two new KPI tiles after the existing four dashboard cards, in a new
   `<section className="dashboard-section">` named "Population Overview":
   - **Total Poultry Survivors** — shows `totalPoultryBirds` with a "🐓" icon; clicking
     navigates to `"survivors"`.
   - **Total Livestock Active** — shows `totalLivestockActive` with a "🐄" icon; clicking
     navigates to `"survivors"`.

3. Do NOT remove or modify the existing four image-cards (poultry, livestock, production,
   expenses).

**Files:** `frontend/src/views/HomeView.tsx`  
**Verify:** `npm run build` in `frontend/` — no type errors on the new props.

---

## Step 13 — Update App.tsx to wire up new views and load survivor data

**What to do.**  
In `frontend/src/App.tsx`:

1. Import new views:
   ```typescript
   import SurvivorView from "./views/SurvivorView";
   import MortalityView from "./views/MortalityView";
   import VaccinationsView from "./views/VaccinationsView";
   ```

2. Add state for survivor summary:
   ```typescript
   const [survivorSummary, setSurvivorSummary] = useState<{
     totalPoultryBirds: number;
     totalLivestockAnimals: number;
   }>({ totalPoultryBirds: 0, totalLivestockAnimals: 0 });
   ```

3. In the existing `loadDashboardData` effect, add a call to
   `loadSurvivorSummary()` alongside the existing `Promise.all`. On success, call
   `setSurvivorSummary(data)`. On error, log and ignore (do not break dashboard).

4. Pass new props to `HomeView`:
   ```tsx
   <HomeView
     poultryCount={poultryCount}
     livestockCount={livestockCount}
     productionCount={productionCount}
     expenseTotal={expenseTotal}
     totalPoultryBirds={survivorSummary.totalPoultryBirds}
     totalLivestockActive={survivorSummary.totalLivestockAnimals}
     onNavigate={setActiveView}
   />
   ```

5. Add view renders in the main render block:
   ```tsx
   {activeView === "survivors" && <SurvivorView />}
   {activeView === "mortality" && <MortalityView />}
   {activeView === "vaccinations" && <VaccinationsView />}
   ```

**Files:** `frontend/src/App.tsx`  
**Verify:** `npm run build` in `frontend/` — no type errors.

---

## Step 14 — Update SideNav.tsx to include new views

**What to do.**  
In `frontend/src/components/SideNav.tsx`, add three new items to `NAV_SECTIONS`:

- In the "FARM RECORDS" section, add after "Livestock":
  ```typescript
  { id: "vaccinations", label: "Vaccinations", img: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=80&q=70", description: "Vaccine schedule" },
  ```

- Add a new "POPULATION TRACKING" section after "FARM RECORDS":
  ```typescript
  {
    label: "POPULATION TRACKING",
    items: [
      { id: "survivors", label: "Survivor Tracking", img: "https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=80&q=70", description: "Population ledger" },
      { id: "mortality", label: "Mortality Monitor", img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=80&q=70", description: "Death rate trends" },
    ],
  },
  ```

**Files:** `frontend/src/components/SideNav.tsx`  
**Verify:** `npm run build` in `frontend/` — no errors.

---

## Step 15 — AI context: include survivor stats in farm context

**What to do.**  
In `backend/src/farmContext.ts`, extend `buildFarmContext` to load and include survivor
data:

```typescript
import { listPopulationEvents, type PopulationEventRow } from "./database.js";
import { buildSurvivorSummary } from "./analytics.js";

export function buildFarmContext(ownerId: string, periodDays: number) {
  const records = loadFarmRecords(ownerId);
  const summary = summarizeFarm(records, makePeriod(today(), periodDays));
  const { thresholds: _thresholds, ...farmSummary } = summary;

  // Load population events and build survivor context
  const events = listPopulationEvents(ownerId);
  const survivorContext = buildSurvivorSummary(
    events as any,
    records.poultry,
    records.livestock,
  );

  return {
    ...farmSummary,
    survivorTracking: {
      note: "Population events (additions, deaths, sales, transfers) are tracked per batch/animal. Survivor rates show the proportion still alive.",
      totalPoultryBirds: survivorContext.totalPoultryBirds,
      totalLivestockAnimals: survivorContext.totalLivestockAnimals,
      targets: survivorContext.targets.map(t => ({
        name: t.targetName,
        species: t.species,
        survivors: t.survivors,
        survivorRatePercent: t.survivorRatePercent,
        deaths: t.deaths,
        sales: t.sales,
      })),
    },
  };
}
```

Also update the AI prompt note in `backend/src/ai.ts` — in `SHARED_RULES`, add rule 7:
```
7. The farm_data includes survivorTracking with population events and survivor rates per batch/animal. Use this data when the farmer asks about animal populations or deaths.
```

**Files:** `backend/src/farmContext.ts`, `backend/src/ai.ts`  
**Verify:** `npm test` in `backend/` — all tests still pass. The AI test asserts
`!prompt.includes(bobId)` and `!prompt.includes("bob@example.com")` — survivor data has no
owner IDs, so this passes unchanged.

---

## Step 16 — Language cleanup: replace "Mortality events" with "Animals that died"

**What to do.**  
Search the entire codebase for the string "Mortality events" (case-insensitive) and
replace with "Animals that died" in all UI-facing strings. Based on current exploration,
this string does not yet appear in any file (vaccination and mortality views are being
created in this plan). Apply this rule proactively in all new views created in Steps 9-11
and verify no existing file uses the old phrase.

Also verify `PoultryView.tsx` and `LivestockView.tsx` — neither currently uses "Mortality
events". No change needed to those files for this step.

**Files:** All `.tsx` files in `frontend/src/views/` and `frontend/src/components/`  
**Verify:** `npm run build` in `frontend/` — no errors.
```
grep -ri "mortality events" frontend/src/
```
Should return zero results after Step 16.

---

## Step 17 — Final integration verification

**What to do.**  
Run the full test suite and frontend build to confirm nothing is broken:

1. `npm test` in `backend/` — all tests pass (49 original + new population/vaccination tests).
2. `npm run build` in `frontend/` — no TypeScript or Vite errors.
3. `npm run typecheck` in `backend/` — no TypeScript errors.

**Files:** No changes — verification only.  
**Verify:**
```powershell
npm test                  # run in backend/
npm run build             # run in frontend/
npm run typecheck         # run in backend/
```

---

## Digest

### Files the plan touches

| File | Block changed | Covered by test |
|------|--------------|-----------------|
| `backend/src/database.ts` | Add `vaccinations` + `population_events` DDL; add `vaccinations` to `resourceTables`; add `listPopulationEvents`, `getSurvivorCount`, `createPopulationEvent`, `deletePopulationEvent` | `test/populationEvents.test.ts` (new) |
| `backend/src/schemas.ts` | Add `vaccinationSchema`, `populationEventSchema`, `mortalityQuerySchema`, `survivorQuerySchema`; add `vaccinations` to `resourceDefinitions` | `test/populationEvents.test.ts` (validation cases) |
| `backend/src/analytics.ts` | Add `buildSurvivorSummary`, `buildMortaltySeries` (after line ~310, end of file) | `test/analyticsPopulation.test.ts` (new) |
| `backend/src/app.ts` | Add 5 new routes in analytics section; add new imports | `test/populationEvents.test.ts` (route tests) |
| `backend/src/farmContext.ts` | Extend `buildFarmContext` to include `survivorTracking` | `test/api.test.ts` AI advisor test (existing, still passes) |
| `backend/src/ai.ts` | Add rule 7 to `SHARED_RULES` string | `test/api.test.ts` AI advisor test |
| `backend/test/populationEvents.test.ts` | New file — 10 test cases | itself |
| `backend/test/analyticsPopulation.test.ts` | New file — 5 test cases | itself |
| `frontend/src/types/farm.ts` | Append 6 new interfaces/types | `npm run build` type check |
| `frontend/src/services/storage.ts` | Append population events, survivor, mortality, vaccination API functions | `npm run build` type check |
| `frontend/src/views/SurvivorView.tsx` | New file | `npm run build` type check |
| `frontend/src/views/MortalityView.tsx` | New file | `npm run build` type check |
| `frontend/src/views/VaccinationsView.tsx` | New file | `npm run build` type check |
| `frontend/src/views/HomeView.tsx` | Add `totalPoultryBirds`, `totalLivestockActive` props and two KPI tiles | `npm run build` type check |
| `frontend/src/App.tsx` | Import 3 new views, add `survivorSummary` state, extend `loadDashboardData`, wire 3 new view renders | `npm run build` type check |
| `frontend/src/components/SideNav.tsx` | Add 3 new nav items in 2 sections | `npm run build` type check |

### What was verified before writing this plan

- **Build command:** `npm test` (backend), `npm run build` (frontend), `npm run typecheck` (backend)
- **Tests today:** 49 pass, 0 fail (`npm test` run confirmed above)
- **recharts:** NOT in `frontend/package.json` — SVG bar chart used in MortalityView
- **Vaccination table:** does not exist yet — full CREATE TABLE IF NOT EXISTS required
- **population_events table:** does not exist yet — full CREATE TABLE IF NOT EXISTS required
- **`hasColumn` helper:** exists in `database.ts` lines ~95-98, already handles migrations
- **`resourceTables`:** const at line ~155; `vaccinations` appended; `populationEvents` NOT added (manual routes instead)
- **`orderedValues` guard:** checks `=== undefined`, passes `null` through correctly — no change needed
- **SideNav:** `NAV_SECTIONS` array pattern is plain JS object literal — straightforward to extend
- **App.tsx:** `activeView` string switch pattern with `{activeView === "..." && <View />}`
- **CSS classes confirmed present:** `management-page`, `summary-grid`, `summary-card`, `management-card`, `card-heading`, `form-grid`, `form-field`, `form-actions`, `primary-action`, `secondary-action`, `edit-button`, `delete-button`, `record-list`, `record-card`, `dashboard-filter-bar`, `filter-chip` (all used in existing views)
- **Branch confirmed:** `feature/farm-analytics-upgrade` is the current branch

### Dependency order

Steps 1–6 are purely backend and can be done without touching the frontend.  
Steps 7–8 (types + service) are frontend prerequisites for all view steps.  
Steps 9–11 (views) depend on Steps 7–8.  
Steps 12–14 (wiring) depend on Steps 9–11.  
Step 15 (AI context) depends on Steps 1–2 (DB functions).  
Step 16 (language) is a final pass on all view files — do last.  
Step 17 is final verification.
