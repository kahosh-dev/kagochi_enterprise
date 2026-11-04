# Code Review — Kagochi Farm Analytics Upgrade
Branch: `feature/farm-analytics-upgrade`  
Reviewer: Automated Review Step  
Date: 2025-07-02

---

## Build Evidence

| Item | Result |
|------|--------|
| Backend typecheck | OK |
| Backend tests (49 existing + new) | All pass |
| Frontend `npm run build` | 1917 modules, 0 errors |

Both commits record passing builds. The latest commit (`2cec3b3`) adds only the MortalityView period-preset fix with a frontend build re-run (`1917 modules, 0 errors`). Build criterion is satisfied.

---

## Review Criteria Assessment

### 1. Correctness of survivor calculation (GET /api/farm/survivor-summary)

**PASS.** `buildSurvivorSummary` in `analytics.ts` groups events per target and computes:

```
survivors = initialCount + additions + transfersIn - deaths - sales - transfersOut
```

Batches/animals with no events are also included using their `initialCount` (poultry from `poultry_batches.initial_count`, livestock as 1 per row). Result is clamped to 0. Formula matches the requirement exactly.

### 2. No negative population (POST /api/farm/population-events)

**PASS.** `createPopulationEvent` in `database.ts` (lines ~339–365) fetches `initialCount` from the DB for the target, calls `getSurvivorCount` for existing net events, and throws `Error('NEGATIVE_POPULATION')` before inserting if `initialCount + netEvents - data.count < 0`. The route handler catches this and returns HTTP 409 with `{ error: "This would make the population go negative." }`. The frontend (`SurvivorView`) also adds a client-side pre-check using cached `summary.targets`.

### 3. Mortality rate correctness

**PASS.**

- **startPopulation = 0 → cannotCalculate = true, mortalityRatePercent = null.** In `buildMortaltySeries`, after computing `startPop` via `allEventsBeforeMap`, the code sets `cannotCalculate = startPop === 0`. The return object sets `mortalityRatePercent: null` when `cannotCalculate` is true.

- **Population at start of period.** `allEventsBeforeMap(bStart)` filters to events with `date < bStart` (strictly before the bucket opens) and sums all event types plus initial counts. This correctly uses the population at the start, not current.

- **startPopulation = 0 with deaths = 0.** In this scenario `cannotCalculate = true` and `mortalityRatePercent = null` — returns `0` only when `cannotCalculate` is false and `deaths = 0`. Correct.

### 4. Vaccination scheduled ≠ administered (no auto-complete)

**PASS.** The `VaccinationsView` add-form explicitly sets `status: "upcoming"` and `dateAdministered: null` when calling `addVaccination`. The `vaccinationSchema` in `schemas.ts` defaults `status` to `"upcoming"`. `status: "completed"` is only set in the separate `handleMarkDone` path, which requires the user to explicitly click "Mark Done". No code path auto-sets a vaccination to completed on save.

### 5. No data deletion

**PASS.** The diff contains no `DROP TABLE`, `DELETE FROM`, `TRUNCATE`, or destructive migration. All `CREATE TABLE IF NOT EXISTS` DDL is additive. Existing tables are untouched.

### 6. Build succeeded

**PASS.** Commit message for `818b1c2` records: `backend typecheck OK, all 49 tests pass, frontend npm run build OK (1917 modules)`. Commit `2cec3b3` records: `frontend npm run build passed (1917 modules, 0 errors)`.

### 7. New views wired up in App.tsx and SideNav

**PASS.**
- `App.tsx`: imports `SurvivorView`, `MortalityView`, `VaccinationsView`; renders all three when `activeView` matches `"survivors"`, `"mortality"`, `"vaccinations"`.
- `SideNav.tsx`: Vaccinations added to FARM RECORDS section; new POPULATION TRACKING section contains Survivor Tracking and Mortality Monitor.

### 8. Farmer-friendly language

**PASS.**
- `MortalityView`: heading "Animal Deaths & Mortality Rates"; KPI card label "Animals that died"; chart section heading "Animals that died — by {granularity} period"; table column header "Animals that died". "Mortality events" does not appear.
- `SurvivorView`: event-type label for `death` is "Animals that died" (from `EVENT_LABELS` map).
- Labels throughout use plain English: "Birds/animals added", "Sold", "Transferred in/out", "Target Batch / Animal".

### 9. Date range filter in MortalityView

**PASS.** The latest commit (`2cec3b3`) replaced rolling-window presets with calendar-aligned ones. The filter bar now contains exactly: **Today** (`today`), **This Week** (`week`), **This Month** (`month`), **This Year** (`year`), **Custom**. Custom reveals two date inputs. Default is `month`. Matches the requirement.

### 10. AI context includes population_events

**PASS.** `farmContext.ts` imports `listPopulationEvents` and calls it with `ownerId`. The result is passed to `buildSurvivorSummary` and the output is included in the returned context object as `survivorTracking` (contains `totalPoultryBirds`, `totalLivestockAnimals`, and per-target survivor/death stats). `ai.ts` adds rule 7 directing the model to use this data.

---

## No Blockers Found

All ten criteria are satisfied. No high or medium severity findings.

---

## Verdict

**APPROVED**
