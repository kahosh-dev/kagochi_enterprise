import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { schemaStatements } from "../src/postgres.js";
import { orderedValues } from "../src/postgresStore.js";
import { resourceTables } from "../src/store.js";

describe("PostgreSQL Architecture & Schema Verification", () => {
  it("defines schema statements for all core farm resources and tables", () => {
    assert.ok(schemaStatements.length > 0);
    const combinedSql = schemaStatements.join("\n");

    const expectedTables = [
      "users",
      "farms",
      "poultry_batches",
      "livestock",
      "production",
      "feeding",
      "expenses",
      "income",
      "vaccinations",
      "vaccination_schedules",
      "population_events",
      "vaccines",
      "feed_types",
    ];

    for (const table of expectedTables) {
      assert.ok(
        combinedSql.includes(`CREATE TABLE IF NOT EXISTS ${table}`),
        `Missing CREATE TABLE for ${table}`
      );
    }
  });

  it("verifies all ALTER TABLE non-destructive migrations exist in PostgreSQL schema", () => {
    const combinedSql = schemaStatements.join("\n");
    assert.ok(combinedSql.includes("ALTER TABLE users ADD COLUMN IF NOT EXISTS role"));
    assert.ok(combinedSql.includes("ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version"));
    assert.ok(combinedSql.includes("ALTER TABLE vaccinations ADD COLUMN IF NOT EXISTS count_vaccinated"));
    assert.ok(combinedSql.includes("ALTER TABLE vaccinations ADD COLUMN IF NOT EXISTS target_type"));
    assert.ok(combinedSql.includes("ALTER TABLE poultry_batches ADD COLUMN IF NOT EXISTS stage"));
    assert.ok(combinedSql.includes("ALTER TABLE livestock ADD COLUMN IF NOT EXISTS category"));
  });

  it("verifies PostgreSQL indexes are defined for performance", () => {
    const combinedSql = schemaStatements.join("\n");
    assert.ok(combinedSql.includes("idx_poultry_owner_date"));
    assert.ok(combinedSql.includes("idx_livestock_owner_date"));
    assert.ok(combinedSql.includes("idx_production_owner_date"));
    assert.ok(combinedSql.includes("idx_expenses_owner_date"));
    assert.ok(combinedSql.includes("idx_vaccinations_owner_date"));
    assert.ok(combinedSql.includes("idx_pop_events_owner"));
  });

  it("orderedValues accurately fills default values for missing fields", () => {
    const poultryValues = orderedValues("poultry", { breed: "Kuroiler", initial_count: 50 });
    assert.equal(poultryValues[0], "Kuroiler"); // breed
    assert.equal(poultryValues[2], 50); // initial_count
    assert.equal(poultryValues[resourceTables.poultry.columns.indexOf("stage")], "adult");
    assert.equal(poultryValues[resourceTables.poultry.columns.indexOf("purchase_price")], 0);

    const livestockValues = orderedValues("livestock", { name: "Daisy", type: "Cattle" });
    assert.equal(livestockValues[0], "Daisy");
    assert.equal(livestockValues[resourceTables.livestock.columns.indexOf("category")], "cow");
    assert.equal(livestockValues[resourceTables.livestock.columns.indexOf("status")], "active");

    const vaccinationValues = orderedValues("vaccinations", { vaccine_name: "Gumboro" });
    assert.equal(vaccinationValues[resourceTables.vaccinations.columns.indexOf("count_vaccinated")], 0);
    assert.equal(vaccinationValues[resourceTables.vaccinations.columns.indexOf("status")], "upcoming");
  });
});
