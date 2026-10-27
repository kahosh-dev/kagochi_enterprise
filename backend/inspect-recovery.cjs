const Database = require("better-sqlite3");

const files = [
  process.env.USERPROFILE + "/Desktop/New folder/kagochi_enterprise/backend/src/kagochi.db",
  process.env.USERPROFILE + "/Desktop/New folder/kagochi_enterprise/server/kagochi.db"
];

for (const file of files) {
  console.log("\n================================");
  console.log("DATABASE:", file);

  try {
    const db = new Database(file, { readonly: true, fileMustExist: true });

    const tables = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all();

    for (const item of tables) {
      const table = item.name.replace(/"/g, '""');
      const count = db.prepare(`SELECT COUNT(*) AS n FROM "${table}"`).get().n;
      console.log(`${item.name}: ${count} rows`);
    }

    db.close();
  } catch (error) {
    console.log("Inspection error:", error.message);
  }
}
