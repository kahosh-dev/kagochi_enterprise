/**
 * Safe, idempotent migration script to copy data from SQLite to Neon PostgreSQL.
 *
 * Usage:
 *   npm run migrate:postgres [-- --from ./src/kagochi.db] [--dry-run]
 *
 * Safety properties:
 *  - Non-destructive: Uses ON CONFLICT (id) DO NOTHING so existing PostgreSQL data is never overwritten.
 *  - Never deletes users, farms, or records.
 *  - Preserves existing password hashes and IDs.
 *  - Handles missing optional columns gracefully with sensible schema defaults.
 *  - In --dry-run mode, rolls back all inserts inside a transaction.
 */
import { existsSync } from "fs";
import { resolve } from "path";
import { parseArgs } from "util";
import Database from "better-sqlite3";
import { config } from "../src/config.js";
import { initializePostgresSchema, postgresPool, verifyPostgresConnection } from "../src/postgres.js";

const { values } = parseArgs({
  options: {
    from: { type: "string" },
    "dry-run": { type: "boolean", default: false },
  },
});

const sourcePath = values.from ? resolve(process.cwd(), values.from) : config.databasePath;
const dryRun = values["dry-run"] ?? false;

if (!existsSync(sourcePath)) {
  console.error(`Error: Source SQLite database not found at ${sourcePath}`);
  process.exit(1);
}

if (!config.databaseUrl) {
  console.error("Error: DATABASE_URL is not set. Configure your Neon PostgreSQL connection string.");
  process.exit(1);
}

const sqlite = new Database(sourcePath, { readonly: true, fileMustExist: true });

interface TableConfig {
  table: string;
  columns: string[];
}

const tablesToMigrate: TableConfig[] = [
  {
    table: "users",
    columns: ["id", "name", "email", "password_hash", "role", "token_version", "created_at"],
  },
  {
    table: "farms",
    columns: ["id", "owner_id", "farm_name", "location", "phone", "created_at"],
  },
  {
    table: "poultry_batches",
    columns: [
      "id", "owner_id", "breed", "purpose", "initial_count", "current_count",
      "age_weeks", "date_added", "stage", "source", "purchase_price", "notes",
    ],
  },
  {
    table: "livestock",
    columns: [
      "id", "owner_id", "name", "type", "breed", "age_years", "date_added",
      "category", "tag_number", "sex", "dam_id", "status", "notes",
    ],
  },
  {
    table: "production",
    columns: ["id", "owner_id", "type", "quantity", "unit", "date", "destination", "selling_price", "notes"],
  },
  {
    table: "feeding",
    columns: ["id", "owner_id", "animal_type", "feed_type", "quantity", "unit", "date", "cost", "supplier", "notes"],
  },
  {
    table: "expenses",
    columns: ["id", "owner_id", "category", "description", "amount", "date"],
  },
  {
    table: "income",
    columns: ["id", "owner_id", "category", "description", "amount", "date", "quantity", "unit"],
  },
  {
    table: "vaccinations",
    columns: [
      "id", "owner_id", "species", "target_type", "target_id", "target_name",
      "vaccine_name", "disease", "date_administered", "date_due", "dose",
      "administered_by", "status", "count_vaccinated", "notes",
    ],
  },
  {
    table: "vaccination_schedules",
    columns: ["id", "owner_id", "species", "category", "vaccine_name", "target_disease", "age_days_due", "booster_interval_days", "notes"],
  },
  {
    table: "population_events",
    columns: ["id", "owner_id", "species", "target_id", "target_name", "event_type", "count", "date", "reason", "notes"],
  },
];

function sqliteTableExists(table: string): boolean {
  return Boolean(sqlite.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(table));
}

function getSqliteColumns(table: string): Set<string> {
  const cols = sqlite.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return new Set(cols.map((c) => c.name));
}

async function migrate() {
  console.log(`Connecting to Neon PostgreSQL...`);
  const { host, database } = await verifyPostgresConnection();
  console.log(`Connected to host: ${host}, database: ${database}`);

  console.log("Ensuring PostgreSQL schema is initialized...");
  await initializePostgresSchema();

  const client = await postgresPool.connect();
  const summary: { table: string; inSource: number; migrated: number; skippedExisting: number }[] = [];

  try {
    await client.query("BEGIN");

    for (const { table, columns } of tablesToMigrate) {
      if (!sqliteTableExists(table)) {
        summary.push({ table, inSource: 0, migrated: 0, skippedExisting: 0 });
        continue;
      }

      const availableCols = getSqliteColumns(table);
      const selectCols = columns.filter((c) => availableCols.has(c));
      const sourceRows = sqlite.prepare(`SELECT ${selectCols.join(", ")} FROM ${table}`).all() as Record<string, unknown>[];

      let migrated = 0;
      let skippedExisting = 0;

      for (const row of sourceRows) {
        // Build values array with defaults for missing columns
        const rowValues = columns.map((col) => {
          const val = row[col];
          if (val !== undefined && val !== null) return val;
          if (col === "role") return "farmer";
          if (col === "token_version") return 0;
          if (col === "stage") return "adult";
          if (col === "category") return "cow";
          if (col === "sex") return "female";
          if (col === "status") return table === "livestock" ? "active" : "upcoming";
          if (col === "destination") return "produced";
          if (
            col === "purchase_price" ||
            col === "selling_price" ||
            col === "cost" ||
            col === "booster_interval_days" ||
            col === "age_days_due" ||
            col === "quantity" ||
            col === "count_vaccinated"
          ) {
            return 0;
          }
          return "";
        });

        const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
        const insertSql = `
          INSERT INTO ${table} (${columns.join(", ")})
          VALUES (${placeholders})
          ON CONFLICT (id) DO NOTHING
        `;

        const res = await client.query(insertSql, rowValues);
        if (res.rowCount && res.rowCount > 0) {
          migrated++;
        } else {
          skippedExisting++;
        }
      }

      summary.push({
        table,
        inSource: sourceRows.length,
        migrated,
        skippedExisting,
      });
    }

    if (dryRun) {
      await client.query("ROLLBACK");
      console.log("\n[DRY RUN] Rolled back all changes. No data was written.");
    } else {
      await client.query("COMMIT");
      console.log("\n[SUCCESS] Migration committed to Neon PostgreSQL.");
    }

    console.table(summary);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Migration failed, changes rolled back:", error);
    throw error;
  } finally {
    client.release();
    sqlite.close();
    await postgresPool.end();
  }
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
