import Database from "better-sqlite3";
import { config } from "./config.js";
import { resourceTables, type ResourceName, type RecordValues, type RecordRow, type UserRow } from "./store.js";

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

  // Livestock migrations
  ensureColumn("livestock", "category", "TEXT NOT NULL DEFAULT 'cow'");
  ensureColumn("livestock", "tag_number", "TEXT NOT NULL DEFAULT ''");
  ensureColumn("livestock", "sex", "TEXT NOT NULL DEFAULT 'female'");
  ensureColumn("livestock", "dam_id", "TEXT NOT NULL DEFAULT ''");
  ensureColumn("livestock", "status", "TEXT NOT NULL DEFAULT 'active'");
  ensureColumn("livestock", "notes", "TEXT NOT NULL DEFAULT ''");

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

  // Vaccinations migrations (ensure both old and new schemas are handled)
  ensureColumn("vaccinations", "target_type", "TEXT NOT NULL DEFAULT ''");
  ensureColumn("vaccinations", "disease", "TEXT NOT NULL DEFAULT ''");
  ensureColumn("vaccinations", "dose", "TEXT NOT NULL DEFAULT ''");
  ensureColumn("vaccinations", "administered_by", "TEXT NOT NULL DEFAULT ''");
  ensureColumn("vaccinations", "count_vaccinated", "INTEGER NOT NULL DEFAULT 0");

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_poultry_owner ON poultry_batches(owner_id, date_added);
    CREATE INDEX IF NOT EXISTS idx_livestock_owner ON livestock(owner_id, date_added);
    CREATE INDEX IF NOT EXISTS idx_production_owner ON production(owner_id, date);
    CREATE INDEX IF NOT EXISTS idx_feeding_owner ON feeding(owner_id, date);
    CREATE INDEX IF NOT EXISTS idx_expenses_owner ON expenses(owner_id, date);
    CREATE INDEX IF NOT EXISTS idx_income_owner ON income(owner_id, date);
    CREATE INDEX IF NOT EXISTS idx_vaccinations_owner ON vaccinations(owner_id, date_due);
    CREATE INDEX IF NOT EXISTS idx_vac_schedules_owner ON vaccination_schedules(owner_id, species, category);
    CREATE INDEX IF NOT EXISTS idx_pop_events_owner ON population_events(owner_id, date);
    CREATE INDEX IF NOT EXISTS idx_pop_events_target ON population_events(owner_id, target_id);
  `);
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
  const { table, columns, dateColumn } = resourceTables[resource];
  return db
    .prepare(`SELECT id, ${columns.join(", ")} FROM ${table} WHERE owner_id = ? ORDER BY ${dateColumn} DESC, rowid DESC`)
    .all(ownerId) as RecordRow[];
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
    if (
      column === "purchase_price" ||
      column === "selling_price" ||
      column === "cost" ||
      column === "booster_interval_days" ||
      column === "age_days_due" ||
      column === "quantity" ||
      column === "count_vaccinated"
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
): PopulationEventRow[] {
  let sql = `SELECT id, owner_id, species, target_id, target_name, event_type, count, date, reason, notes
             FROM population_events WHERE owner_id = ?`;
  const params: unknown[] = [ownerId];
  if (species) { sql += ` AND species = ?`; params.push(species); }
  if (targetId) { sql += ` AND target_id = ?`; params.push(targetId); }
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

/** Inserts a new population event. Throws Error('NEGATIVE_POPULATION') if the event
 *  would make survivors go below zero. */
export function createPopulationEvent(
  id: string,
  ownerId: string,
  data: Omit<PopulationEventRow, 'id' | 'owner_id'>,
): void {
  const reducingTypes = ['death', 'sale', 'transfer_out'];
  if (reducingTypes.includes(data.event_type)) {
    // Fetch initial count
    let initialCount = 0;
    if (data.species === 'poultry') {
      const batch = db.prepare(
        `SELECT initial_count FROM poultry_batches WHERE id = ? AND owner_id = ?`
      ).get(data.target_id, ownerId) as { initial_count: number } | undefined;
      initialCount = batch?.initial_count ?? 0;
    } else {
      // Each livestock row = 1 animal
      const animal = db.prepare(
        `SELECT id FROM livestock WHERE id = ? AND owner_id = ?`
      ).get(data.target_id, ownerId);
      initialCount = animal ? 1 : 0;
    }
    const netEvents = getSurvivorCount(ownerId, data.target_id);
    if (initialCount + netEvents - data.count < 0) {
      throw new Error('NEGATIVE_POPULATION');
    }
  }

  db.prepare(`
    INSERT INTO population_events (id, owner_id, species, target_id, target_name, event_type, count, date, reason, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, ownerId, data.species, data.target_id, data.target_name, data.event_type, data.count, data.date, data.reason, data.notes);
}

export function deletePopulationEvent(id: string, ownerId: string): { changes: number } {
  return db.prepare(`DELETE FROM population_events WHERE id = ? AND owner_id = ?`).run(id, ownerId) as { changes: number };
}
