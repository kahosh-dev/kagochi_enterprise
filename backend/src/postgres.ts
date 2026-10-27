import pg from "pg";
import { config } from "./config.js";

const { Pool } = pg;

export const postgresPool: pg.Pool = config.databaseUrl
  ? new Pool({
      connectionString: config.databaseUrl,
      // Neon connections must use SSL.
      ssl: { rejectUnauthorized: true },
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    })
  : (null as unknown as pg.Pool);

if (postgresPool) {
  postgresPool.on("error", (error) => {
    console.error("Unexpected idle PostgreSQL connection error:", error.message);
  });
}

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
    date_added TEXT NOT NULL,
    stage TEXT NOT NULL DEFAULT 'adult',
    source TEXT NOT NULL DEFAULT '',
    purchase_price REAL NOT NULL DEFAULT 0,
    notes TEXT NOT NULL DEFAULT ''
  )`,

  `ALTER TABLE poultry_batches ADD COLUMN IF NOT EXISTS stage TEXT NOT NULL DEFAULT 'adult'`,
  `ALTER TABLE poultry_batches ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE poultry_batches ADD COLUMN IF NOT EXISTS purchase_price REAL NOT NULL DEFAULT 0`,
  `ALTER TABLE poultry_batches ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT ''`,

  `CREATE TABLE IF NOT EXISTS livestock (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
    notes TEXT NOT NULL DEFAULT ''
  )`,

  `ALTER TABLE livestock ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'cow'`,
  `ALTER TABLE livestock ADD COLUMN IF NOT EXISTS tag_number TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE livestock ADD COLUMN IF NOT EXISTS sex TEXT NOT NULL DEFAULT 'female'`,
  `ALTER TABLE livestock ADD COLUMN IF NOT EXISTS dam_id TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE livestock ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'`,
  `ALTER TABLE livestock ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT ''`,

  `CREATE TABLE IF NOT EXISTS production (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit TEXT NOT NULL,
    date TEXT NOT NULL,
    destination TEXT NOT NULL DEFAULT 'produced',
    selling_price REAL NOT NULL DEFAULT 0,
    notes TEXT NOT NULL DEFAULT ''
  )`,

  `ALTER TABLE production ADD COLUMN IF NOT EXISTS destination TEXT NOT NULL DEFAULT 'produced'`,
  `ALTER TABLE production ADD COLUMN IF NOT EXISTS selling_price REAL NOT NULL DEFAULT 0`,
  `ALTER TABLE production ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT ''`,

  `CREATE TABLE IF NOT EXISTS feeding (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    animal_type TEXT NOT NULL,
    feed_type TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit TEXT NOT NULL,
    date TEXT NOT NULL,
    cost REAL NOT NULL DEFAULT 0,
    supplier TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT ''
  )`,

  `ALTER TABLE feeding ADD COLUMN IF NOT EXISTS cost REAL NOT NULL DEFAULT 0`,
  `ALTER TABLE feeding ADD COLUMN IF NOT EXISTS supplier TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE feeding ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT ''`,

  `CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    date TEXT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS income (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 0,
    unit TEXT NOT NULL DEFAULT ''
  )`,

  `CREATE TABLE IF NOT EXISTS vaccinations (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    species TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    target_name TEXT NOT NULL,
    vaccine_name TEXT NOT NULL,
    disease TEXT NOT NULL,
    date_administered TEXT NOT NULL DEFAULT '',
    date_due TEXT NOT NULL,
    dose TEXT NOT NULL DEFAULT '',
    administered_by TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'scheduled',
    notes TEXT NOT NULL DEFAULT ''
  )`,

  `CREATE TABLE IF NOT EXISTS vaccination_schedules (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    species TEXT NOT NULL,
    category TEXT NOT NULL,
    vaccine_name TEXT NOT NULL,
    target_disease TEXT NOT NULL,
    age_days_due INTEGER NOT NULL,
    booster_interval_days INTEGER NOT NULL DEFAULT 0,
    notes TEXT NOT NULL DEFAULT ''
  )`,

  `CREATE INDEX IF NOT EXISTS idx_poultry_owner_date ON poultry_batches(owner_id, date_added)`,
  `CREATE INDEX IF NOT EXISTS idx_livestock_owner_date ON livestock(owner_id, date_added)`,
  `CREATE INDEX IF NOT EXISTS idx_production_owner_date ON production(owner_id, date)`,
  `CREATE INDEX IF NOT EXISTS idx_feeding_owner_date ON feeding(owner_id, date)`,
  `CREATE INDEX IF NOT EXISTS idx_expenses_owner_date ON expenses(owner_id, date)`,
  `CREATE INDEX IF NOT EXISTS idx_income_owner_date ON income(owner_id, date)`,
  `CREATE INDEX IF NOT EXISTS idx_vaccinations_owner_date ON vaccinations(owner_id, date_due)`,
  `CREATE INDEX IF NOT EXISTS idx_vac_schedules_owner_date ON vaccination_schedules(owner_id, species, category)`,
];

/**
 * Creates missing PostgreSQL tables and indexes.
 * Call this only after DATABASE_URL has been deliberately configured
 * for the intended database.
 */
export async function initializePostgresSchema(): Promise<void> {
  if (!postgresPool) {
    throw new Error(
      "DATABASE_URL is not configured. PostgreSQL has not been connected."
    );
  }

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
