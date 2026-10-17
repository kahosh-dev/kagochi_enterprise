import Database from "better-sqlite3";
import { config } from "./config.js";

export const db = new Database(config.databasePath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

/*
 * Schema. Table and column names are unchanged from the original version so
 * existing kagochi.db files keep working; new columns are added by the
 * migration step below.
 */
db.exec(`
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
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS production (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    type TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit TEXT NOT NULL,
    date TEXT NOT NULL,
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
`);

/*
 * Non-destructive migrations: only add what is missing.
 * role: "farmer" (default) or "admin".
 * token_version: incremented on logout/password reset to revoke sessions.
 */
function hasColumn(table: string, column: string): boolean {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return columns.some((c) => c.name === column);
}

if (!hasColumn("users", "role")) {
  db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'farmer'");
}
if (!hasColumn("users", "token_version")) {
  db.exec("ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0");
}

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_poultry_owner ON poultry_batches(owner_id, date_added);
  CREATE INDEX IF NOT EXISTS idx_livestock_owner ON livestock(owner_id, date_added);
  CREATE INDEX IF NOT EXISTS idx_production_owner ON production(owner_id, date);
  CREATE INDEX IF NOT EXISTS idx_feeding_owner ON feeding(owner_id, date);
  CREATE INDEX IF NOT EXISTS idx_expenses_owner ON expenses(owner_id, date);
`);

/* ------------------------------------------------------------------ */
/* Users                                                              */
/* ------------------------------------------------------------------ */

export interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: string;
  token_version: number;
  created_at: string;
}

const userColumns = "id, name, email, password_hash, role, token_version, created_at";

export function findUserByEmail(email: string): UserRow | undefined {
  return db
    .prepare(`SELECT ${userColumns} FROM users WHERE email = ?`)
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
/* Farm records (poultry, livestock, production, feeding, expenses)   */
/* ------------------------------------------------------------------ */

/*
 * Every farm record table has the same shape: id, owner_id, data columns.
 * Table and column names below are fixed constants (never user input), and
 * every query filters by owner_id so a user can only touch their own rows.
 */
export const resourceTables = {
  poultry: {
    table: "poultry_batches",
    columns: ["breed", "purpose", "initial_count", "current_count", "age_weeks", "date_added"],
    dateColumn: "date_added",
  },
  livestock: {
    table: "livestock",
    columns: ["name", "type", "breed", "age_years", "date_added"],
    dateColumn: "date_added",
  },
  production: {
    table: "production",
    columns: ["type", "quantity", "unit", "date"],
    dateColumn: "date",
  },
  feeding: {
    table: "feeding",
    columns: ["animal_type", "feed_type", "quantity", "unit", "date"],
    dateColumn: "date",
  },
  expenses: {
    table: "expenses",
    columns: ["category", "description", "amount", "date"],
    dateColumn: "date",
  },
} as const;

export type ResourceName = keyof typeof resourceTables;
export type RecordValues = Record<string, string | number>;
export type RecordRow = { id: string } & Record<string, string | number>;

export function listRecords(resource: ResourceName, ownerId: string): RecordRow[] {
  const { table, columns, dateColumn } = resourceTables[resource];
  return db
    .prepare(`SELECT id, ${columns.join(", ")} FROM ${table} WHERE owner_id = ? ORDER BY ${dateColumn} DESC, rowid DESC`)
    .all(ownerId) as RecordRow[];
}

function orderedValues(resource: ResourceName, values: RecordValues) {
  return resourceTables[resource].columns.map((column) => {
    const value = values[column];
    if (value === undefined) throw new Error(`Missing value for ${column}`);
    return value;
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
