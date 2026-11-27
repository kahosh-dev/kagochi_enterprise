import pg from "pg";
import { config } from "./config.js";

const { Pool } = pg;

export const postgresPool: pg.Pool = config.databaseUrl
  ? new Pool({
      connectionString: config.databaseUrl,
      // Neon connections require SSL. Using rejectUnauthorized: false ensures reliable TLS connection
      // across container environments without custom root CA bundle issues.
      ssl: config.databaseUrl.includes("localhost") ||
        config.databaseUrl.includes("127.0.0.1") ||
        config.databaseUrl.includes("sslmode=disable")
        ? false
        : { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "true" },
      max: Number(process.env.PGMAX ?? 10),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    })
  : (null as unknown as pg.Pool);

if (postgresPool) {
  postgresPool.on("error", (error) => {
    console.error("Unexpected idle PostgreSQL connection error:", error.message);
  });
}

export const schemaStatements = [
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

  `ALTER TABLE farms ADD COLUMN IF NOT EXISTS location TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE farms ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT ''`,

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
    notes TEXT NOT NULL DEFAULT '',
    hatch_date TEXT NOT NULL DEFAULT '',
    is_hatch_date_estimated INTEGER NOT NULL DEFAULT 0
  )`,

  `ALTER TABLE poultry_batches ADD COLUMN IF NOT EXISTS stage TEXT NOT NULL DEFAULT 'adult'`,
  `ALTER TABLE poultry_batches ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE poultry_batches ADD COLUMN IF NOT EXISTS purchase_price REAL NOT NULL DEFAULT 0`,
  `ALTER TABLE poultry_batches ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE poultry_batches ADD COLUMN IF NOT EXISTS hatch_date TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE poultry_batches ADD COLUMN IF NOT EXISTS is_hatch_date_estimated INTEGER NOT NULL DEFAULT 0`,

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
    notes TEXT NOT NULL DEFAULT '',
    date_of_birth TEXT NOT NULL DEFAULT '',
    is_birth_date_estimated INTEGER NOT NULL DEFAULT 0
  )`,

  `ALTER TABLE livestock ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'cow'`,
  `ALTER TABLE livestock ADD COLUMN IF NOT EXISTS tag_number TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE livestock ADD COLUMN IF NOT EXISTS sex TEXT NOT NULL DEFAULT 'female'`,
  `ALTER TABLE livestock ADD COLUMN IF NOT EXISTS dam_id TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE livestock ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'`,
  `ALTER TABLE livestock ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE livestock ADD COLUMN IF NOT EXISTS date_of_birth TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE livestock ADD COLUMN IF NOT EXISTS is_birth_date_estimated INTEGER NOT NULL DEFAULT 0`,

  `CREATE TABLE IF NOT EXISTS production (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit TEXT NOT NULL,
    date TEXT NOT NULL,
    destination TEXT NOT NULL DEFAULT 'produced',
    selling_price REAL NOT NULL DEFAULT 0,
    notes TEXT NOT NULL DEFAULT '',
    animal_type TEXT NOT NULL DEFAULT '',
    group_name TEXT NOT NULL DEFAULT '',
    target_id TEXT NOT NULL DEFAULT ''
  )`,

  `ALTER TABLE production ADD COLUMN IF NOT EXISTS destination TEXT NOT NULL DEFAULT 'produced'`,
  `ALTER TABLE production ADD COLUMN IF NOT EXISTS selling_price REAL NOT NULL DEFAULT 0`,
  `ALTER TABLE production ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE production ADD COLUMN IF NOT EXISTS animal_type TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE production ADD COLUMN IF NOT EXISTS group_name TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE production ADD COLUMN IF NOT EXISTS target_id TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE production ADD COLUMN IF NOT EXISTS needs_review INTEGER DEFAULT 0`,
  `CREATE INDEX IF NOT EXISTS idx_production_target ON production(target_id)`,
  `CREATE INDEX IF NOT EXISTS idx_production_needs_review ON production(needs_review) WHERE needs_review = 1`,

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
    notes TEXT NOT NULL DEFAULT '',
    group_name TEXT NOT NULL DEFAULT ''
  )`,

  `ALTER TABLE feeding ADD COLUMN IF NOT EXISTS cost REAL NOT NULL DEFAULT 0`,
  `ALTER TABLE feeding ADD COLUMN IF NOT EXISTS supplier TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE feeding ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE feeding ADD COLUMN IF NOT EXISTS group_name TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE feeding ADD COLUMN IF NOT EXISTS needs_review INTEGER DEFAULT 0`,
  `CREATE INDEX IF NOT EXISTS idx_feeding_needs_review ON feeding(needs_review) WHERE needs_review = 1`,

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

  `ALTER TABLE income ADD COLUMN IF NOT EXISTS quantity REAL NOT NULL DEFAULT 0`,
  `ALTER TABLE income ADD COLUMN IF NOT EXISTS unit TEXT NOT NULL DEFAULT ''`,

  `CREATE TABLE IF NOT EXISTS vaccinations (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
    notes TEXT NOT NULL DEFAULT ''
  )`,

  `ALTER TABLE vaccinations ADD COLUMN IF NOT EXISTS target_type TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE vaccinations ADD COLUMN IF NOT EXISTS target_id TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE vaccinations ADD COLUMN IF NOT EXISTS disease TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE vaccinations ADD COLUMN IF NOT EXISTS dose TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE vaccinations ADD COLUMN IF NOT EXISTS administered_by TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE vaccinations ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'upcoming'`,
  `ALTER TABLE vaccinations ADD COLUMN IF NOT EXISTS count_vaccinated INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE vaccinations ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE vaccinations ADD COLUMN IF NOT EXISTS needs_review INTEGER DEFAULT 0`,
  `CREATE INDEX IF NOT EXISTS idx_vaccinations_needs_review ON vaccinations(needs_review) WHERE needs_review = 1`,

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

  `CREATE TABLE IF NOT EXISTS population_events (
    id          TEXT PRIMARY KEY,
    owner_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    species     TEXT NOT NULL CHECK(species IN ('poultry','cattle')),
    target_id   TEXT NOT NULL,
    target_name TEXT NOT NULL,
    event_type  TEXT NOT NULL CHECK(event_type IN ('addition','death','sale','transfer_in','transfer_out')),
    count       INTEGER NOT NULL CHECK(count > 0),
    date        TEXT NOT NULL,
    reason      TEXT NOT NULL DEFAULT '',
    notes       TEXT NOT NULL DEFAULT ''
  )`,

  `CREATE TABLE IF NOT EXISTS event_audit_log (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK(action IN ('create', 'update', 'delete', 'undo')),
    changed_by TEXT NOT NULL,
    changed_at TEXT NOT NULL,
    before_state TEXT DEFAULT '',
    after_state TEXT DEFAULT ''
  )`,

  `CREATE TABLE IF NOT EXISTS farm_daily_counts (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    target_id TEXT NOT NULL,
    target_name TEXT NOT NULL,
    species TEXT NOT NULL CHECK(species IN ('poultry', 'cattle')),
    live_count INTEGER NOT NULL,
    created_at TEXT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS vaccines (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    species TEXT NOT NULL,
    name TEXT NOT NULL,
    disease TEXT NOT NULL,
    default_method TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    is_active INTEGER NOT NULL DEFAULT 1
  )`,

  `ALTER TABLE vaccines ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE vaccines ADD COLUMN IF NOT EXISTS is_active INTEGER NOT NULL DEFAULT 1`,

  `CREATE TABLE IF NOT EXISTS feed_types (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    animal_type TEXT NOT NULL,
    category TEXT NOT NULL,
    name TEXT NOT NULL,
    default_unit TEXT NOT NULL DEFAULT 'kg',
    is_active INTEGER NOT NULL DEFAULT 1
  )`,

  `ALTER TABLE feed_types ADD COLUMN IF NOT EXISTS default_unit TEXT NOT NULL DEFAULT 'kg'`,
  `ALTER TABLE feed_types ADD COLUMN IF NOT EXISTS is_active INTEGER NOT NULL DEFAULT 1`,

  // Meat Production table (broilers and dual-purpose birds)
  `CREATE TABLE IF NOT EXISTS meat_production (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_id TEXT NOT NULL,
    target_name TEXT NOT NULL,
    species TEXT NOT NULL DEFAULT 'poultry',
    date TEXT NOT NULL,
    count_harvested INTEGER NOT NULL DEFAULT 0,
    total_weight_kg REAL NOT NULL DEFAULT 0,
    average_weight_kg REAL NOT NULL DEFAULT 0,
    selling_price_per_kg REAL NOT NULL DEFAULT 0,
    total_revenue REAL NOT NULL DEFAULT 0,
    destination TEXT NOT NULL DEFAULT 'sold',
    notes TEXT NOT NULL DEFAULT ''
  )`,

  `CREATE INDEX IF NOT EXISTS idx_meat_production_owner_date ON meat_production(owner_id, date)`,
  `CREATE INDEX IF NOT EXISTS idx_meat_production_target ON meat_production(owner_id, target_id)`,

  // Calving Events table (tracks births and promotes heifer to cow)
  `CREATE TABLE IF NOT EXISTS calving_events (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    dam_id TEXT NOT NULL,
    dam_name TEXT NOT NULL,
    calf_id TEXT,
    calf_name TEXT NOT NULL DEFAULT '',
    calf_sex TEXT NOT NULL DEFAULT 'female',
    calving_date TEXT NOT NULL,
    calving_ease TEXT NOT NULL DEFAULT 'normal',
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  )`,

  `CREATE INDEX IF NOT EXISTS idx_calving_events_owner_date ON calving_events(owner_id, calving_date)`,
  `CREATE INDEX IF NOT EXISTS idx_calving_events_dam ON calving_events(owner_id, dam_id)`,
  `CREATE INDEX IF NOT EXISTS idx_calving_events_calf ON calving_events(owner_id, calf_id)`,

  // Add has_calved flag to livestock for quick eligibility checks
  `ALTER TABLE livestock ADD COLUMN IF NOT EXISTS has_calved INTEGER NOT NULL DEFAULT 0`,
  `CREATE INDEX IF NOT EXISTS idx_livestock_has_calved ON livestock(owner_id, has_calved, sex)`,

  `CREATE INDEX IF NOT EXISTS idx_poultry_owner_date ON poultry_batches(owner_id, date_added)`,
  `CREATE INDEX IF NOT EXISTS idx_livestock_owner_date ON livestock(owner_id, date_added)`,
  `CREATE INDEX IF NOT EXISTS idx_production_owner_date ON production(owner_id, date)`,
  `CREATE INDEX IF NOT EXISTS idx_feeding_owner_date ON feeding(owner_id, date)`,
  `CREATE INDEX IF NOT EXISTS idx_expenses_owner_date ON expenses(owner_id, date)`,
  `CREATE INDEX IF NOT EXISTS idx_income_owner_date ON income(owner_id, date)`,
  `CREATE INDEX IF NOT EXISTS idx_vaccinations_owner_date ON vaccinations(owner_id, date_due)`,
  `CREATE INDEX IF NOT EXISTS idx_vac_schedules_owner_date ON vaccination_schedules(owner_id, species, category)`,
  `CREATE INDEX IF NOT EXISTS idx_vaccines_owner_date ON vaccines(owner_id, species, is_active)`,
  `CREATE INDEX IF NOT EXISTS idx_feed_types_owner_date ON feed_types(owner_id, animal_type, is_active)`,
  `CREATE INDEX IF NOT EXISTS idx_pop_events_owner ON population_events(owner_id, date)`,
  `CREATE INDEX IF NOT EXISTS idx_pop_events_target ON population_events(owner_id, target_id)`,
  `CREATE INDEX IF NOT EXISTS idx_event_audit_owner_date ON event_audit_log(owner_id, changed_at)`,
  `CREATE INDEX IF NOT EXISTS idx_event_audit_event ON event_audit_log(event_id)`,
  `CREATE INDEX IF NOT EXISTS idx_farm_daily_owner_target_date ON farm_daily_counts(owner_id, target_id, date)`,
  `CREATE INDEX IF NOT EXISTS idx_farm_daily_owner_date ON farm_daily_counts(owner_id, date)`,
];

/**
 * Verifies that PostgreSQL connection is alive and returns basic database info.
 * Never prints password or credentials.
 */
export async function verifyPostgresConnection(): Promise<{ host: string; database: string }> {
  if (!postgresPool) {
    throw new Error("DATABASE_URL is not configured. PostgreSQL has not been connected.");
  }

  const result = await postgresPool.query<{ current_database: string }>(
    "SELECT current_database()"
  );

  const hostMatch = config.databaseUrl?.match(/@([^:/]+)/);
  const host = hostMatch ? hostMatch[1] : "remote host";
  const database = result.rows[0]?.current_database ?? "unknown";

  return { host, database };
}

/**
 * Creates missing PostgreSQL tables and indexes non-destructively.
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

    // Backfill estimated hatch_date and date_of_birth
    await client.query(`
      UPDATE poultry_batches
      SET hatch_date = to_char((to_date(CASE WHEN date_added ~ '^\\d{4}-\\d{2}-\\d{2}' THEN substring(date_added from 1 for 10) ELSE to_char(CURRENT_DATE, 'YYYY-MM-DD') END, 'YYYY-MM-DD') - (age_weeks * 7 || ' days')::interval), 'YYYY-MM-DD'),
          is_hatch_date_estimated = 1
      WHERE hatch_date IS NULL OR hatch_date = ''
    `);

    await client.query(`
      UPDATE livestock
      SET date_of_birth = to_char((to_date(CASE WHEN date_added ~ '^\\d{4}-\\d{2}-\\d{2}' THEN substring(date_added from 1 for 10) ELSE to_char(CURRENT_DATE, 'YYYY-MM-DD') END, 'YYYY-MM-DD') - (round(age_years * 365.25) || ' days')::interval), 'YYYY-MM-DD'),
          is_birth_date_estimated = 1
      WHERE date_of_birth IS NULL OR date_of_birth = ''
    `);

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
