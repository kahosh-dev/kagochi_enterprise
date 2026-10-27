import Database from "better-sqlite3";
import { resolve } from "node:path";

for (const file of ["src/kagochi.db", "server/kagochi.db"]) {
  console.log("\nDATABASE:", file);

  try {
    const db = new Database(resolve(file), {
      readonly: true,
      fileMustExist: true
    });

    for (const table of [
      "users",
      "farms",
      "poultry_batches",
      "livestock",
      "production",
      "feeding",
      "expenses"
    ]) {
      const result = db
        .prepare(`SELECT COUNT(*) AS total FROM "${table}"`)
        .get();

      console.log(`${table}: ${result.total}`);
    }

    db.close();
  } catch (error) {
    console.log("Could not inspect:", error.message);
  }
}
