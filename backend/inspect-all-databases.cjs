const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

const root = path.join(process.env.USERPROFILE, "Desktop");
const names = new Set(["kagochi.db", "kagochi.db.bak", "kagochi.sqlite"]);
const tables = [
  "users", "farms", "poultry_batches", "livestock",
  "production", "feeding", "expenses"
];

function inspect(folder) {
  let entries;
  try {
    entries = fs.readdirSync(folder, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(folder, entry.name);

    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== ".git") {
        inspect(fullPath);
      }
    } else if (names.has(entry.name)) {
      try {
        const db = new Database(fullPath, {
          readonly: true,
          fileMustExist: true
        });

        console.log("\nDATABASE:", fullPath);

        for (const table of tables) {
          try {
            const result = db.prepare(
              `SELECT COUNT(*) AS n FROM "${table}"`
            ).get();
            console.log(`${table}: ${result.n}`);
          } catch {
            console.log(`${table}: table missing`);
          }
        }

        db.close();
      } catch (error) {
        console.log("\nCould not inspect:", fullPath, error.message);
      }
    }
  }
}

inspect(root);
