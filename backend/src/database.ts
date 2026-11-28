import Database from "better-sqlite3";
import crypto from "node:crypto";
import { config } from "./config.js";
import { resourceTables, type ResourceName, type RecordValues, type RecordRow, type UserRow } from "./store.js";
import { DEFAULT_VACCINES } from "./vaccineDefaults.js";
import { DEFAULT_FEED_TYPES } from "./feedTypeDefaults.js";
import { hasNonNegativePopulation, livestockStatusFromEvents, populationAtDate, type PopulationEventLike } from "./population.js";

let _db: Database.Database | null = null;

function initSqlite(database: Database.Database): void {
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");

  /*
   * Schema. Table and column names are backward-compatible so
   * existing kagochi.db files keep working; new columns and tables are added
   * non-destructively by the migration step below.
   */
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS farms (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      farm_name TEXT NOT NULL,
      location TEXT,
      phone TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS poultry_batches (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      breed TEXT NOT NULL,
      purpose TEXT NOT NULL,
      initial_count INTEGER NOT NULL,
      current_count INTEGER NOT NULL,
      age_weeks INTEGER NOT NULL,
      date_added TEXT NOT NULL,
      stage TEXT NOT NULL DEFAULT 'adult',
      source TEXT NOT NULL DEFAULT '',
      purchase_price REAL NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      hatch_date TEXT NOT NULL DEFAULT '',
      is_hatch_date_estimated INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS livestock (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      breed TEXT NOT NULL,
      age_years REAL NOT NULL,
      date_added TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'cow',
      tag_number TEXT NOT NULL DEFAULT '',
      sex TEXT NOT NULL DEFAULT 'female',
      dam_id TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      notes TEXT NOT NULL DEFAULT '',
      date_of_birth TEXT NOT NULL DEFAULT '',
      is_birth_date_estimated INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS production (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      type TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit TEXT NOT NULL,
      date TEXT NOT NULL,
      destination TEXT NOT NULL DEFAULT 'produced',
      selling_price REAL NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      animal_type TEXT NOT NULL DEFAULT '',
      group_name TEXT NOT NULL DEFAULT '',
      target_id TEXT NOT NULL DEFAULT '',
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS feeding (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      animal_type TEXT NOT NULL,
      feed_type TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit TEXT NOT NULL,
      date TEXT NOT NULL,
      cost REAL NOT NULL DEFAULT 0,
      supplier TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      group_name TEXT NOT NULL DEFAULT '',
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS income (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 0,
      unit TEXT NOT NULL DEFAULT '',
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS vaccinations (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      species TEXT NOT NULL,
      target_type TEXT NOT NULL DEFAULT '',
      target_id TEXT NOT NULL DEFAULT '',
      target_name TEXT NOT NULL,
      vaccine_name TEXT NOT NULL,
      disease TEXT NOT NULL DEFAULT '',
      date_administered TEXT NOT NULL DEFAULT '',
      date_due TEXT NOT NULL,
      dose TEXT NOT NULL DEFAULT '',
      administered_by TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'upcoming',
      count_vaccinated INTEGER NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS vaccination_schedules (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      species TEXT NOT NULL,
      category TEXT NOT NULL,
      vaccine_name TEXT NOT NULL,
      target_disease TEXT NOT NULL,
      age_days_due INTEGER NOT NULL,
      booster_interval_days INTEGER NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
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

    CREATE TABLE IF NOT EXISTS event_audit_log (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      event_id TEXT NOT NULL,
      action TEXT NOT NULL CHECK(action IN ('create', 'update', 'delete', 'undo')),
      changed_by TEXT NOT NULL,
      changed_at TEXT NOT NULL,
      before_state TEXT NOT NULL DEFAULT '{}',
      after_state TEXT NOT NULL DEFAULT '{}',
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS vaccines (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      species TEXT NOT NULL,
      name TEXT NOT NULL,
      disease TEXT NOT NULL,
      default_method TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      is_active INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS feed_types (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      animal_type TEXT NOT NULL,
      category TEXT NOT NULL,
      name TEXT NOT NULL,
      default_unit TEXT NOT NULL DEFAULT 'kg',
      is_active INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  /*
   * Non-destructive migrations: only add what is missing.
   */
  function hasColumn(table: string, column: string): boolean {
    try {
      const columns = database.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
      return columns.some((c) => c.name === column);
    } catch {
      return false;
    }
  }

  function ensureColumn(table: string, column: string, def: string) {
    if (!hasColumn(table, column)) {
      try {
        database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`);
      } catch {
        // ignore if already exists
      }
    }
  }

  // User migrations
  ensureColumn("users", "role", "TEXT NOT NULL DEFAULT 'farmer'");
  ensureColumn("users", "token_version", "INTEGER NOT NULL DEFAULT 0");

  // Poultry migrations
  ensureColumn("poultry_batches", "stage", "TEXT NOT NULL DEFAULT 'adult'");
  ensureColumn("poultry_batches", "source", "TEXT NOT NULL DEFAULT ''");
  ensureColumn("poultry_batches", "purchase_price", "REAL NOT NULL DEFAULT 0");
  ensureColumn("poultry_batches", "notes", "TEXT NOT NULL DEFAULT ''");
  ensureColumn("poultry_batches", "hatch_date", "TEXT NOT NULL DEFAULT ''");
  ensureColumn("poultry_batches", "is_hatch_date_estimated", "INTEGER NOT NULL DEFAULT 0");

  // Livestock migrations
  ensureColumn("livestock", "category", "TEXT NOT NULL DEFAULT 'cow'");
  ensureColumn("livestock", "tag_number", "TEXT NOT NULL DEFAULT ''");
  ensureColumn("livestock", "sex", "TEXT NOT NULL DEFAULT 'female'");
  ensureColumn("livestock", "dam_id", "TEXT NOT NULL DEFAULT ''");
  ensureColumn("livestock", "status", "TEXT NOT NULL DEFAULT 'active'");
  ensureColumn("livestock", "notes", "TEXT NOT NULL DEFAULT ''");
  ensureColumn("livestock", "date_of_birth", "TEXT NOT NULL DEFAULT ''");
  ensureColumn("livestock", "is_birth_date_estimated", "INTEGER NOT NULL DEFAULT 0");

  // Backfill estimated hatch_date for existing poultry rows without hatch_date
  try {
    const unmigratedPoultry = database.prepare(
      "SELECT id, age_weeks, date_added FROM poultry_batches WHERE hatch_date IS NULL OR hatch_date = ''"
    ).all() as { id: string; age_weeks: number; date_added: string }[];
    const updatePoultryHatch = database.prepare(
      "UPDATE poultry_batches SET hatch_date = ?, is_hatch_date_estimated = 1 WHERE id = ?"
    );
    for (const p of unmigratedPoultry) {
      const baseDate = (p.date_added && p.date_added.slice(0, 10)) || new Date().toISOString().slice(0, 10);
      const daysAgo = (p.age_weeks || 0) * 7;
      const d = new Date(Date.parse(`${baseDate}T00:00:00Z`) - daysAgo * 86_400_000);
      const estimatedDate = !Number.isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : baseDate;
      updatePoultryHatch.run(estimatedDate, p.id);
    }
  } catch {
    // ignore if columns not accessible
  }

  // Backfill estimated date_of_birth for existing livestock rows without date_of_birth
  try {
    const unmigratedLivestock = database.prepare(
      "SELECT id, age_years, date_added FROM livestock WHERE date_of_birth IS NULL OR date_of_birth = ''"
    ).all() as { id: string; age_years: number; date_added: string }[];
    const updateLivestockDob = database.prepare(
      "UPDATE livestock SET date_of_birth = ?, is_birth_date_estimated = 1 WHERE id = ?"
    );
    for (const l of unmigratedLivestock) {
      const baseDate = (l.date_added && l.date_added.slice(0, 10)) || new Date().toISOString().slice(0, 10);
      const daysAgo = Math.round((l.age_years || 0) * 365.25);
      const d = new Date(Date.parse(`${baseDate}T00:00:00Z`) - daysAgo * 86_400_000);
      const estimatedDate = !Number.isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : baseDate;
      updateLivestockDob.run(estimatedDate, l.id);
    }
  } catch {
    // ignore if columns not accessible
  }

  // Production migrations
  ensureColumn("production", "destination", "TEXT NOT NULL DEFAULT 'produced'");
  ensureColumn("production", "selling_price", "REAL NOT NULL DEFAULT 0");
  ensureColumn("production", "notes", "TEXT NOT NULL DEFAULT ''");
  ensureColumn("production", "animal_type", "TEXT NOT NULL DEFAULT ''");
  ensureColumn("production", "group_name", "TEXT NOT NULL DEFAULT ''");
  ensureColumn("production", "target_id", "TEXT NOT NULL DEFAULT ''");

  // Feeding migrations
  ensureColumn("feeding", "cost", "REAL NOT NULL DEFAULT 0");
  ensureColumn("feeding", "supplier", "TEXT NOT NULL DEFAULT ''");
  ensureColumn("feeding", "notes", "TEXT NOT NULL DEFAULT ''");
  ensureColumn("feeding", "group_name", "TEXT NOT NULL DEFAULT ''");

  // Livestock stage eligibility migration
  ensureColumn("livestock", "has_calved", "INTEGER NOT NULL DEFAULT 0");

  // Vaccinations migrations (ensure both old and new schemas are handled)
  ensureColumn("vaccinations", "target_type", "TEXT NOT NULL DEFAULT ''");
  ensureColumn("vaccinations", "disease", "TEXT NOT NULL DEFAULT ''");
  ensureColumn("vaccinations", "dose", "TEXT NOT NULL DEFAULT ''");
  ensureColumn("vaccinations", "administered_by", "TEXT NOT NULL DEFAULT ''");
  ensureColumn("vaccinations", "count_vaccinated", "INTEGER NOT NULL DEFAULT 0");

  // Vaccines reference table migrations
  ensureColumn("vaccines", "notes", "TEXT NOT NULL DEFAULT ''");
  ensureColumn("vaccines", "is_active", "INTEGER NOT NULL DEFAULT 1");

  // Feed types reference table migrations
  ensureColumn("feed_types", "default_unit", "TEXT NOT NULL DEFAULT 'kg'");
  ensureColumn("feed_types", "is_active", "INTEGER NOT NULL DEFAULT 1");

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_poultry_owner ON poultry_batches(owner_id, date_added);
    CREATE INDEX IF NOT EXISTS idx_livestock_owner ON livestock(owner_id, date_added);
    CREATE INDEX IF NOT EXISTS idx_production_owner ON production(owner_id, date);
    CREATE INDEX IF NOT EXISTS idx_feeding_owner ON feeding(owner_id, date);
    CREATE INDEX IF NOT EXISTS idx_expenses_owner ON expenses(owner_id, date);
    CREATE INDEX IF NOT EXISTS idx_income_owner ON income(owner_id, date);
    CREATE INDEX IF NOT EXISTS idx_vaccinations_owner ON vaccinations(owner_id, date_due);
    CREATE INDEX IF NOT EXISTS idx_vac_schedules_owner ON vaccination_schedules(owner_id, species, category);
    CREATE INDEX IF NOT EXISTS idx_vaccines_owner ON vaccines(owner_id, species, is_active);
    CREATE INDEX IF NOT EXISTS idx_feed_types_owner ON feed_types(owner_id, animal_type, is_active);
    CREATE INDEX IF NOT EXISTS idx_pop_events_owner ON population_events(owner_id, date);
    CREATE INDEX IF NOT EXISTS idx_pop_events_target ON population_events(owner_id, target_id);
  `);

  // Seed default vaccines & feed types for existing users if they have none
  try {
    const existingUsers = database.prepare("SELECT id FROM users").all() as { id: string }[];
    for (const u of existingUsers) {
      seedDefaultVaccinesForOwnerDb(database, u.id);
      seedDefaultFeedTypesForOwnerDb(database, u.id);
    }
  } catch {
    // ignore
  }
}

export function seedDefaultFeedTypesForOwnerDb(dbInstance: Database.Database, ownerId: string) {
  try {
    const existing = dbInstance.prepare("SELECT COUNT(*) as c FROM feed_types WHERE owner_id = ?").get(ownerId) as { c: number } | undefined;
    if (!existing || existing.c === 0) {
      const insert = dbInstance.prepare(
        "INSERT INTO feed_types (id, owner_id, animal_type, category, name, default_unit, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)"
      );
      for (const ft of DEFAULT_FEED_TYPES) {
        insert.run(crypto.randomUUID(), ownerId, ft.animal_type, ft.category, ft.name, ft.default_unit);
      }
    }
  } catch {
    // ignore
  }
}

export function seedDefaultFeedTypesForOwner(ownerId: string) {
  seedDefaultFeedTypesForOwnerDb(db, ownerId);
}

export function seedDefaultVaccinesForOwnerDb(dbInstance: Database.Database, ownerId: string) {
  try {
    const existing = dbInstance.prepare("SELECT COUNT(*) as c FROM vaccines WHERE owner_id = ?").get(ownerId) as { c: number } | undefined;
    if (!existing || existing.c === 0) {
      const insert = dbInstance.prepare(
        "INSERT INTO vaccines (id, owner_id, species, name, disease, default_method, notes, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)"
      );
      for (const v of DEFAULT_VACCINES) {
        insert.run(crypto.randomUUID(), ownerId, v.species, v.name, v.disease, v.default_method, v.notes);
      }
    }
  } catch {
    // ignore
  }
}

export function seedDefaultVaccinesForOwner(ownerId: string) {
  seedDefaultVaccinesForOwnerDb(db, ownerId);
}

/**
 * Lazily opens and initializes the SQLite database on first access.
 * If the application is running with PostgreSQL in production,
 * getDb() is never called and no local SQLite file is created.
 */
export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(config.databasePath);
    initSqlite(_db);
  }
  return _db;
}

export const db: Database.Database = new Proxy({} as Database.Database, {
  get(_target, prop) {
    const instance = getDb();
    const val = (instance as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === "function" ? val.bind(instance) : val;
  },
});

/* ------------------------------------------------------------------ */
/* Users                                                              */
/* ------------------------------------------------------------------ */
const userColumns = "id, name, email, password_hash, role, token_version, created_at";

export function findUserByEmail(email: string): UserRow | undefined {
  return db
    .prepare(`SELECT ${userColumns} FROM users WHERE LOWER(email) = LOWER(?)`)
    .get(email.toLowerCase().trim()) as UserRow | undefined;
}

export function findUserById(id: string): UserRow | undefined {
  return db.prepare(`SELECT ${userColumns} FROM users WHERE id = ?`).get(id) as UserRow | undefined;
}

export function createUser(id: string, name: string, email: string, passwordHash: string, role: "farmer" | "admin" = "farmer") {
  return db
    .prepare(
      `INSERT INTO users (id, name, email, password_hash, role, token_version, created_at)
       VALUES (?, ?, ?, ?, ?, 0, ?)`
    )
    .run(id, name.trim(), email.toLowerCase().trim(), passwordHash, role, new Date().toISOString());
}

export function incrementTokenVersion(id: string) {
  return db.prepare("UPDATE users SET token_version = token_version + 1 WHERE id = ?").run(id);
}

export function setUserPassword(id: string, passwordHash: string) {
  return db
    .prepare("UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?")
    .run(passwordHash, id);
}

export function setUserRole(id: string, role: "farmer" | "admin") {
  return db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, id);
}

export function countAdmins(): number {
  const row = db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'").get() as { n: number };
  return row.n;
}

export function getAllUsers() {
  return db
    .prepare("SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC")
    .all() as { id: string; name: string; email: string; role: string; created_at: string }[];
}

export function adminUpdateUser(id: string, name: string, email: string, role: "farmer" | "admin") {
  return db
    .prepare("UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?")
    .run(name.trim(), email.toLowerCase().trim(), role, id);
}

export function adminDeleteUser(id: string) {
  return db.prepare("DELETE FROM users WHERE id = ?").run(id);
}

/* ------------------------------------------------------------------ */
/* Farm profile                                                       */
/* ------------------------------------------------------------------ */
export function createFarm(id: string, ownerId: string, farmName: string, location: string, phone: string) {
  return db
    .prepare(
      `INSERT INTO farms (id, owner_id, farm_name, location, phone, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(id, ownerId, farmName.trim(), location.trim(), phone.trim(), new Date().toISOString());
}

export function findFarmByOwnerId(ownerId: string) {
  return db
    .prepare("SELECT id, farm_name, location, phone, created_at FROM farms WHERE owner_id = ? LIMIT 1")
    .get(ownerId) as
    | { id: string; farm_name: string; location: string; phone: string; created_at: string }
    | undefined;
}

/* ------------------------------------------------------------------ */
/* Farm records                                                       */
/* ------------------------------------------------------------------ */
export { resourceTables, type ResourceName, type RecordValues, type RecordRow, type UserRow };

export function listRecords(resource: ResourceName, ownerId: string): RecordRow[] {
  if (resource === "vaccines") {
    seedDefaultVaccinesForOwner(ownerId);
  }
  if (resource === "feed_types") {
    seedDefaultFeedTypesForOwner(ownerId);
  }
  const { table, columns, dateColumn } = resourceTables[resource];
  return db
    .prepare(`SELECT id, ${columns.join(", ")} FROM ${table} WHERE owner_id = ? ORDER BY ${dateColumn} DESC, rowid DESC`)
    .all(ownerId) as RecordRow[];
}

export function listRecordsForPeriod(
  resource: ResourceName,
  ownerId: string,
  from: string | undefined,
  to: string,
): RecordRow[] {
  const { table, columns, dateColumn } = resourceTables[resource];
  const predicates = ["owner_id = ?", `${dateColumn} <= ?`];
  const params: (string | number)[] = [ownerId, to];
  if (from) {
    predicates.push(`${dateColumn} >= ?`);
    params.push(from);
  }
  return db
    .prepare(`SELECT id, ${columns.join(", ")} FROM ${table} WHERE ${predicates.join(" AND ")} ORDER BY ${dateColumn} DESC, rowid DESC`)
    .all(...params) as RecordRow[];
}

function orderedValues(resource: ResourceName, values: RecordValues) {
  return resourceTables[resource].columns.map((column) => {
    const value = values[column];
    if (value !== undefined && value !== null) return value;
    if (column === "stage") return "adult";
    if (column === "category") return "cow";
    if (column === "sex") return "female";
    if (column === "status") return resource === "livestock" ? "active" : "upcoming";
    if (column === "destination") return "produced";
    if (column === "default_unit") return "kg";
    if (column === "is_active") return 1;
    if (
      column === "purchase_price" ||
      column === "selling_price" ||
      column === "cost" ||
      column === "booster_interval_days" ||
      column === "age_days_due" ||
      column === "quantity" ||
      column === "count_vaccinated" ||
      column === "is_hatch_date_estimated" ||
      column === "is_birth_date_estimated"
    ) {
      return 0;
    }
    return "";
  });
}

export function createRecord(resource: ResourceName, id: string, ownerId: string, values: RecordValues) {
  const { table, columns } = resourceTables[resource];
  const placeholders = columns.map(() => "?").join(", ");
  return db
    .prepare(`INSERT INTO ${table} (id, owner_id, ${columns.join(", ")}) VALUES (?, ?, ${placeholders})`)
    .run(id, ownerId, ...orderedValues(resource, values));
}

export function updateRecord(resource: ResourceName, id: string, ownerId: string, values: RecordValues) {
  const { table, columns } = resourceTables[resource];
  const assignments = columns.map((column) => `${column} = ?`).join(", ");
  return db
    .prepare(`UPDATE ${table} SET ${assignments} WHERE id = ? AND owner_id = ?`)
    .run(...orderedValues(resource, values), id, ownerId);
}

export function deleteRecord(resource: ResourceName, id: string, ownerId: string) {
  const { table } = resourceTables[resource];
  return db.prepare(`DELETE FROM ${table} WHERE id = ? AND owner_id = ?`).run(id, ownerId);
}

/* ------------------------------------------------------------------ */
/* Population Events                                                   */
/* ------------------------------------------------------------------ */
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

/** Returns all events for this owner, optionally filtered by species and/or targetId. */
export function listPopulationEvents(
  ownerId: string,
  species?: string,
  targetId?: string,
  from?: string,
  to?: string,
): PopulationEventRow[] {
  let sql = `SELECT id, owner_id, species, target_id, target_name, event_type, count, date, reason, notes
             FROM population_events WHERE owner_id = ?`;
  const params: unknown[] = [ownerId];
  if (species) { sql += ` AND species = ?`; params.push(species); }
  if (targetId) { sql += ` AND target_id = ?`; params.push(targetId); }
  if (from) { sql += ` AND date >= ?`; params.push(from); }
  if (to) { sql += ` AND date <= ?`; params.push(to); }
  sql += ` ORDER BY date DESC, rowid DESC`;
  return db.prepare(sql).all(...params) as PopulationEventRow[];
}

/** Returns the net survivor count contributed by events alone (not counting initial_count). */
export function getSurvivorCount(ownerId: string, targetId: string): number {
  const row = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN event_type IN ('addition','transfer_in') THEN count ELSE 0 END), 0)
      - COALESCE(SUM(CASE WHEN event_type IN ('death','sale','transfer_out') THEN count ELSE 0 END), 0)
      AS net
    FROM population_events
    WHERE owner_id = ? AND target_id = ?
  `).get(ownerId, targetId) as { net: number };
  return row.net;
}

function batchCurrentCount(targetId: string, ownerId: string): number {
  const row = db.prepare(`SELECT current_count FROM poultry_batches WHERE id = ? AND owner_id = ?`).get(targetId, ownerId) as { current_count: number } | undefined;
  return Number(row?.current_count ?? 0);
}

/** Inserts a new population event. Throws Error('NEGATIVE_POPULATION') if the event
 *  would make survivors go below zero. */
export function createPopulationEvent(
  id: string,
  ownerId: string,
  data: Omit<PopulationEventRow, 'id' | 'owner_id'>,
  options: { allowSnapshotReconciliation?: boolean } = {},
): void {
  const run = db.transaction(() => {
    let initialCount: number;
    let dateAdded: string;
    if (data.species === 'poultry') {
      const batch = db.prepare(
        `SELECT initial_count, current_count, date_added FROM poultry_batches WHERE id = ? AND owner_id = ?`
      ).get(data.target_id, ownerId) as { initial_count: number; current_count: number; date_added: string } | undefined;
      if (!batch) throw new Error('POPULATION_TARGET_NOT_FOUND');
      initialCount = Number(batch.initial_count);
      dateAdded = batch.date_added;
    } else {
      const animal = db.prepare(
        `SELECT id, date_added FROM livestock WHERE id = ? AND owner_id = ?`
      ).get(data.target_id, ownerId) as { id: string; date_added: string } | undefined;
      if (!animal) throw new Error('POPULATION_TARGET_NOT_FOUND');
      if (data.count !== 1) throw new Error('CATTLE_EVENT_COUNT_MUST_BE_ONE');
      if (data.event_type === 'addition') throw new Error('CATTLE_ADDITION_REQUIRES_ANIMAL_RECORD');
      initialCount = 1;
      dateAdded = animal.date_added;
    }
    if (data.date < String(dateAdded).slice(0, 10)) throw new Error('POPULATION_EVENT_BEFORE_TARGET');

    const existing = db.prepare(
      `SELECT id, event_type, count, date FROM population_events WHERE owner_id = ? AND species = ? AND target_id = ?`
    ).all(ownerId, data.species, data.target_id) as PopulationEventLike[];
    if (!options.allowSnapshotReconciliation) {
      if (data.species === 'poultry' && batchCurrentCount(data.target_id, ownerId) !== populationAtDate(initialCount, existing)) {
        throw new Error('POPULATION_SNAPSHOT_REQUIRES_BACKFILL');
      }
      if (data.species === 'cattle') {
        const storedStatus = String((db.prepare(`SELECT status FROM livestock WHERE id = ? AND owner_id = ?`).get(data.target_id, ownerId) as { status: string } | undefined)?.status ?? 'active');
        if (storedStatus !== livestockStatusFromEvents(existing)) throw new Error('POPULATION_SNAPSHOT_REQUIRES_BACKFILL');
      }
    }
    const proposed = [...existing, { id, event_type: data.event_type, count: data.count, date: data.date }];
    if (!hasNonNegativePopulation(initialCount, proposed)) throw new Error('NEGATIVE_POPULATION');

    db.prepare(`
      INSERT INTO population_events (id, owner_id, species, target_id, target_name, event_type, count, date, reason, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, ownerId, data.species, data.target_id, data.target_name, data.event_type, data.count, data.date, data.reason, data.notes);
    db.prepare(`INSERT INTO event_audit_log (id, owner_id, event_id, action, changed_by, changed_at, before_state, after_state) VALUES (?, ?, ?, 'create', ?, ?, ?, ?)`)
      .run(crypto.randomUUID(), ownerId, id, ownerId, new Date().toISOString(), JSON.stringify({}), JSON.stringify(data));

    const liveCount = Math.max(0, populationAtDate(initialCount, proposed));
    if (data.species === 'poultry') {
      db.prepare(`UPDATE poultry_batches SET current_count = ? WHERE id = ? AND owner_id = ?`).run(liveCount, data.target_id, ownerId);
    } else {
      const status = livestockStatusFromEvents(proposed);
      db.prepare(`UPDATE livestock SET status = ? WHERE id = ? AND owner_id = ?`).run(status, data.target_id, ownerId);
    }
  });
  run.immediate();
}

export function deletePopulationEvent(id: string, ownerId: string, action: "delete" | "undo" = "delete"): { changes: number } {
  const run = db.transaction(() => {
    const event = db.prepare(
      `SELECT species, target_id, target_name, event_type, count, date, reason, notes FROM population_events WHERE id = ? AND owner_id = ?`
    ).get(id, ownerId) as { species: 'poultry' | 'cattle'; target_id: string; target_name: string; event_type: string; count: number; date: string; reason: string; notes: string } | undefined;
    if (!event) return { changes: 0 };
    const allEvents = db.prepare(`SELECT id, event_type, count, date FROM population_events WHERE owner_id = ? AND species = ? AND target_id = ?`).all(ownerId, event.species, event.target_id) as PopulationEventLike[];
    const remaining = allEvents.filter((item) => item.id !== id);
    const initialCount = event.species === 'poultry'
      ? Number((db.prepare(`SELECT initial_count FROM poultry_batches WHERE id = ? AND owner_id = ?`).get(event.target_id, ownerId) as { initial_count: number } | undefined)?.initial_count ?? 0)
      : 1;
    if (!hasNonNegativePopulation(initialCount, remaining)) throw new Error('NEGATIVE_POPULATION');
    if (event.species === 'poultry') {
      const cached = batchCurrentCount(event.target_id, ownerId);
      if (cached !== populationAtDate(initialCount, allEvents)) throw new Error('POPULATION_SNAPSHOT_REQUIRES_BACKFILL');
    } else {
      const status = String((db.prepare(`SELECT status FROM livestock WHERE id = ? AND owner_id = ?`).get(event.target_id, ownerId) as { status: string } | undefined)?.status ?? 'active');
      if (status !== livestockStatusFromEvents(allEvents)) throw new Error('POPULATION_SNAPSHOT_REQUIRES_BACKFILL');
    }
    const deleted = db.prepare(`DELETE FROM population_events WHERE id = ? AND owner_id = ?`).run(id, ownerId);
    db.prepare(`INSERT INTO event_audit_log (id, owner_id, event_id, action, changed_by, changed_at, before_state, after_state) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(crypto.randomUUID(), ownerId, id, action, ownerId, new Date().toISOString(), JSON.stringify(event), JSON.stringify({}));
    if (event.species === 'poultry') {
      const batch = db.prepare(`SELECT initial_count FROM poultry_batches WHERE id = ? AND owner_id = ?`).get(event.target_id, ownerId) as { initial_count: number } | undefined;
      if (batch) {
        const events = db.prepare(`SELECT id, event_type, count, date FROM population_events WHERE owner_id = ? AND species = 'poultry' AND target_id = ?`).all(ownerId, event.target_id) as PopulationEventLike[];
        db.prepare(`UPDATE poultry_batches SET current_count = ? WHERE id = ? AND owner_id = ?`).run(Math.max(0, populationAtDate(Number(batch.initial_count), events)), event.target_id, ownerId);
      }
    } else {
      const events = db.prepare(`SELECT id, event_type, count, date FROM population_events WHERE owner_id = ? AND species = 'cattle' AND target_id = ?`).all(ownerId, event.target_id) as PopulationEventLike[];
      const liveCount = populationAtDate(1, events);
      const lastReducing = [...events].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)).filter((row) => ['death', 'sale', 'transfer_out'].includes(row.event_type)).at(-1);
      const status = liveCount > 0 ? 'active' : lastReducing?.event_type === 'death' ? 'deceased' : lastReducing?.event_type === 'sale' ? 'sold' : 'transferred';
      db.prepare(`UPDATE livestock SET status = ? WHERE id = ? AND owner_id = ?`).run(status, event.target_id, ownerId);
    }
    return { changes: Number(deleted.changes) };
  });
  return run.immediate();
}
