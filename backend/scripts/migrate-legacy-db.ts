/*
 * Copies farm records from the old root-level database (server/kagochi.db,
 * now legacy/server/kagochi.db) into the active backend database.
 *
 *   npm run migrate:legacy -- --from ../legacy/server/kagochi.db [--dry-run]
 *
 * Safe to run more than once:
 *  - a timestamped backup of the active database is written to backups/ first;
 *  - INSERT OR IGNORE never overwrites a row that already exists (same id);
 *  - users missing from the active database are copied with role "farmer".
 */
import { existsSync, mkdirSync } from "fs";
import { resolve } from "path";
import { parseArgs } from "util";
import Database from "better-sqlite3";
import { config } from "../src/config.js";
import { db } from "../src/database.js";

const { values } = parseArgs({ options: { from: { type: "string" }, "dry-run": { type: "boolean", default: false } } });
const source = values.from ? resolve(process.cwd(), values.from) : null;
const dryRun = values["dry-run"];

if (!source || !existsSync(source)) {
  console.error("Error: --from must point to an existing legacy kagochi.db file.");
  process.exit(1);
}
if (source === config.databasePath) {
  console.error("Error: source and target are the same database.");
  process.exit(1);
}

const legacy = new Database(source, { readonly: true, fileMustExist: true });

const tables: { table: string; columns: string[] }[] = [
  { table: "users", columns: ["id", "name", "email", "password_hash", "created_at"] },
  { table: "farms", columns: ["id", "owner_id", "farm_name", "location", "phone", "created_at"] },
  { table: "poultry_batches", columns: ["id", "owner_id", "breed", "purpose", "initial_count", "current_count", "age_weeks", "date_added"] },
  { table: "livestock", columns: ["id", "owner_id", "name", "type", "breed", "age_years", "date_added"] },
  { table: "production", columns: ["id", "owner_id", "type", "quantity", "unit", "date"] },
  { table: "feeding", columns: ["id", "owner_id", "animal_type", "feed_type", "quantity", "unit", "date"] },
  { table: "expenses", columns: ["id", "owner_id", "category", "description", "amount", "date"] },
];

function tableExists(database: Database.Database, table: string) {
  return Boolean(database.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(table));
}

if (!dryRun) {
  const backupDir = resolve(process.cwd(), "..", "backups");
  mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = resolve(backupDir, `kagochi-before-migration-${stamp}.db`);
  await db.backup(backupPath);
  console.log(`Backup of active database written to ${backupPath}`);
}

const summary: { table: string; inLegacy: number; copied: number; skipped: number }[] = [];

const migrate = db.transaction(() => {
  for (const { table, columns } of tables) {
    if (!tableExists(legacy, table)) continue;
    const rows = legacy.prepare(`SELECT ${columns.join(", ")} FROM ${table}`).all() as Record<string, unknown>[];
    const insert = db.prepare(
      `INSERT OR IGNORE INTO ${table} (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`
    );
    let copied = 0;
    for (const row of rows) {
      if (table === "users" && db.prepare("SELECT 1 FROM users WHERE email = ? AND id != ?").get(row.email, row.id)) {
        continue; // same email already used by a different account; leave it alone
      }
      if ("owner_id" in row && !db.prepare("SELECT 1 FROM users WHERE id = ?").get(row.owner_id)) continue;
      copied += insert.run(...columns.map((c) => row[c])).changes;
    }
    summary.push({ table, inLegacy: rows.length, copied, skipped: rows.length - copied });
  }
  if (dryRun) throw new Error("dry-run");
});

try {
  migrate();
} catch (error) {
  if ((error as Error).message !== "dry-run") throw error;
}

console.log(dryRun ? "DRY RUN — nothing was written. Would copy:" : "Migration complete:");
console.table(summary);
console.log("Rows are skipped when they already exist (same id) or their owner account is missing.");
