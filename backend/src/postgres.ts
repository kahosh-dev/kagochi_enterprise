import pg from "pg";
import { config } from "./config.js";

const { Pool } = pg;

if (!config.databaseUrl) {
  throw new Error(
    "DATABASE_URL is not configured. PostgreSQL has not been connected."
  );
}

export const postgresPool = new Pool({
  connectionString: config.databaseUrl,
  // Neon connections must use SSL.
 ssl: { rejectUnauthorized: true },
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

postgresPool.on("error", (error) => {
  console.error("Unexpected idle PostgreSQL connection error:", error.message);
});

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'farmer',
    token_version INTEGER NOT NULL DEFAULT 0
  )`,

  `ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'farmer'`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0`,

  `CREATE TABLE IF NOT EXISTS farms (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    farm_name TEXT NOT NULL,
    location TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS poultry_batches (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    breed TEXT NOT NULL,
    purpose TEXT NOT NULL,
    initial_count INTEGER NOT NULL,
    current_count INTEGER NOT NULL,
    age_weeks INTEGER NOT NULL,
    date_added TEXT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS livestock (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    breed TEXT NOT NULL,
    age_years REAL NOT NULL,
    date_added TEXT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS production (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit TEXT NOT NULL,
    date TEXT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS feeding (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    animal_type TEXT NOT NULL,
    feed_type TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit TEXT NOT NULL,
    date TEXT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    date TEXT NOT NULL
  )`,

  `CREATE INDEX IF NOT EXISTS idx_poultry_owner_date ON poultry_batches(owner_id, date_added)`,
  `CREATE INDEX IF NOT EXISTS idx_livestock_owner_date ON livestock(owner_id, date_added)`,
  `CREATE INDEX IF NOT EXISTS idx_production_owner_date ON production(owner_id, date)`,
  `CREATE INDEX IF NOT EXISTS idx_feeding_owner_date ON feeding(owner_id, date)`,
  `CREATE INDEX IF NOT EXISTS idx_expenses_owner_date ON expenses(owner_id, date)`,
];

/**
 * Creates missing PostgreSQL tables and indexes.
 * Call this only after DATABASE_URL has been deliberately configured
 * for the intended database.
 */
export async function initializePostgresSchema(): Promise<void> {
  const client = await postgresPool.connect();

  try {
    await client.query("BEGIN");

    for (const statement of schemaStatements) {
      await client.query(statement);
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}