import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import { resourceDefinitions } from "../src/schemas.js";
import { sqliteStore } from "../src/sqliteStore.js";
import * as db from "../src/database.js";
import { hashPassword } from "../src/auth.js";
import { makePeriod, summarizeFarm, summarizeIncome, summarizeExpenses, summarizeVaccinations } from "../src/analytics.js";

const TEST_USER_ID = crypto.randomUUID();
const TODAY = new Date().toISOString().slice(0, 10);

before(async () => {
  const uniqueEmail = `farmer-${crypto.randomUUID()}@kagochi.test`;
  db.createUser(TEST_USER_ID, "Test Farmer", uniqueEmail, await hashPassword("securePassword123"), "farmer");
});

describe("Save Actions Persistence & Validation", () => {
  describe("Feeding Records", () => {
    it("validates, saves, reads, updates, and persists feeding records", async () => {
      const { schema, toColumns } = resourceDefinitions.feeding;

      const inputData = {
        animalType: "Poultry",
        feedType: "Layers Mash",
        quantity: 50,
        unit: "kg" as const,
        date: TODAY,
        cost: 3200,
        supplier: "Unga Farm Care",
        notes: "Morning feeding for Batch A",
      };

      const parsed = schema.safeParse(inputData);
      assert.equal(parsed.success, true);

      const recordId = crypto.randomUUID();
      const columns = toColumns(parsed.data as never);

      await sqliteStore.createRecord("feeding", recordId, TEST_USER_ID, columns);

      // Verify retrieval (simulating page reload/refresh)
      const listAfterSave = await sqliteStore.listRecords("feeding", TEST_USER_ID);
      const saved = listAfterSave.find((r) => r.id === recordId);
      assert.ok(saved, "Feeding record must exist after creation");
      assert.equal(saved.animal_type, "Poultry");
      assert.equal(saved.feed_type, "Layers Mash");
      assert.equal(Number(saved.quantity), 50);
      assert.equal(saved.unit, "kg");
      assert.equal(saved.date, TODAY);
      assert.equal(Number(saved.cost), 3200);
      assert.equal(saved.supplier, "Unga Farm Care");
      assert.equal(saved.notes, "Morning feeding for Batch A");

      // Update record
      const updatedInput = {
        ...inputData,
        quantity: 60,
        cost: 3800,
        notes: "Updated feeding amount",
      };
      const updatedParsed = schema.safeParse(updatedInput);
      assert.equal(updatedParsed.success, true);
      await sqliteStore.updateRecord("feeding", recordId, TEST_USER_ID, toColumns(updatedParsed.data as never));

      // Verify update persists
      const listAfterUpdate = await sqliteStore.listRecords("feeding", TEST_USER_ID);
      const updated = listAfterUpdate.find((r) => r.id === recordId);
      assert.equal(Number(updated!.quantity), 60);
      assert.equal(Number(updated!.cost), 3800);
      assert.equal(updated!.notes, "Updated feeding amount");

      // Delete record
      await sqliteStore.deleteRecord("feeding", recordId, TEST_USER_ID);
      const listAfterDelete = await sqliteStore.listRecords("feeding", TEST_USER_ID);
      assert.equal(listAfterDelete.find((r) => r.id === recordId), undefined);
    });

    it("rejects invalid feeding data", () => {
      const { schema } = resourceDefinitions.feeding;
      assert.equal(schema.safeParse({ feedType: "", quantity: 10, unit: "kg", date: TODAY }).success, false);
      assert.equal(schema.safeParse({ animalType: "Poultry", feedType: "Layers Mash", quantity: -5, unit: "kg", date: TODAY }).success, false);
      assert.equal(schema.safeParse({ animalType: "Poultry", feedType: "Layers Mash", quantity: 5, unit: "invalid_unit", date: TODAY }).success, false);
    });
  });

  describe("Money In / Farm Income", () => {
    it("validates, saves, reads, updates, and persists income records", async () => {
      const { schema, toColumns } = resourceDefinitions.income;

      const inputData = {
        category: "Egg Sales",
        description: "Sold 25 trays of brown eggs",
        amount: 11250,
        date: TODAY,
        quantity: 25,
        unit: "trays",
      };

      const parsed = schema.safeParse(inputData);
      assert.equal(parsed.success, true);

      const recordId = crypto.randomUUID();
      const columns = toColumns(parsed.data as never);

      await sqliteStore.createRecord("income", recordId, TEST_USER_ID, columns);

      // Verify retrieval (simulating page reload/refresh)
      const listAfterSave = await sqliteStore.listRecords("income", TEST_USER_ID);
      const saved = listAfterSave.find((r) => r.id === recordId);
      assert.ok(saved, "Income record must exist after creation");
      assert.equal(saved.category, "Egg Sales");
      assert.equal(saved.description, "Sold 25 trays of brown eggs");
      assert.equal(Number(saved.amount), 11250);
      assert.equal(saved.date, TODAY);
      assert.equal(Number(saved.quantity), 25);
      assert.equal(saved.unit, "trays");

      // Verify financial summary incorporates the new income
      const period = makePeriod(TODAY, 7);
      const summary = summarizeIncome(listAfterSave, period);
      assert.ok(summary.total >= 11250);

      // Update record
      const updatedInput = {
        ...inputData,
        amount: 13500,
        quantity: 30,
      };
      const updatedParsed = schema.safeParse(updatedInput);
      assert.equal(updatedParsed.success, true);
      await sqliteStore.updateRecord("income", recordId, TEST_USER_ID, toColumns(updatedParsed.data as never));

      const listAfterUpdate = await sqliteStore.listRecords("income", TEST_USER_ID);
      const updated = listAfterUpdate.find((r) => r.id === recordId);
      assert.equal(Number(updated!.amount), 13500);
      assert.equal(Number(updated!.quantity), 30);

      // Cleanup
      await sqliteStore.deleteRecord("income", recordId, TEST_USER_ID);
    });

    it("rejects invalid income data", () => {
      const { schema } = resourceDefinitions.income;
      assert.equal(schema.safeParse({ category: "", description: "test", amount: 100, date: TODAY }).success, false);
      assert.equal(schema.safeParse({ category: "Egg Sales", description: "", amount: 100, date: TODAY }).success, false);
      assert.equal(schema.safeParse({ category: "Egg Sales", description: "test", amount: 0, date: TODAY }).success, false);
      assert.equal(schema.safeParse({ category: "Egg Sales", description: "test", amount: -50, date: TODAY }).success, false);
    });
  });

  describe("Money Out / Farm Expenses", () => {
    it("validates, saves, reads, updates, and persists expense records", async () => {
      const { schema, toColumns } = resourceDefinitions.expenses;

      const inputData = {
        category: "Poultry Feed",
        description: "5 bags of Starter Crumbs",
        amount: 14500,
        date: TODAY,
      };

      const parsed = schema.safeParse(inputData);
      assert.equal(parsed.success, true);

      const recordId = crypto.randomUUID();
      const columns = toColumns(parsed.data as never);

      await sqliteStore.createRecord("expenses", recordId, TEST_USER_ID, columns);

      // Verify retrieval (simulating page reload/refresh)
      const listAfterSave = await sqliteStore.listRecords("expenses", TEST_USER_ID);
      const saved = listAfterSave.find((r) => r.id === recordId);
      assert.ok(saved, "Expense record must exist after creation");
      assert.equal(saved.category, "Poultry Feed");
      assert.equal(saved.description, "5 bags of Starter Crumbs");
      assert.equal(Number(saved.amount), 14500);
      assert.equal(saved.date, TODAY);

      // Verify financial summary incorporates the new expense
      const period = makePeriod(TODAY, 7);
      const summary = summarizeExpenses(listAfterSave, period);
      assert.ok(summary.total >= 14500);

      // Update record
      const updatedInput = {
        ...inputData,
        amount: 16000,
      };
      const updatedParsed = schema.safeParse(updatedInput);
      assert.equal(updatedParsed.success, true);
      await sqliteStore.updateRecord("expenses", recordId, TEST_USER_ID, toColumns(updatedParsed.data as never));

      const listAfterUpdate = await sqliteStore.listRecords("expenses", TEST_USER_ID);
      const updated = listAfterUpdate.find((r) => r.id === recordId);
      assert.equal(Number(updated!.amount), 16000);

      // Cleanup
      await sqliteStore.deleteRecord("expenses", recordId, TEST_USER_ID);
    });

    it("rejects invalid expense data", () => {
      const { schema } = resourceDefinitions.expenses;
      assert.equal(schema.safeParse({ category: "", description: "test", amount: 100, date: TODAY }).success, false);
      assert.equal(schema.safeParse({ category: "Feed", description: "", amount: 100, date: TODAY }).success, false);
      assert.equal(schema.safeParse({ category: "Feed", description: "test", amount: 0, date: TODAY }).success, false);
      assert.equal(schema.safeParse({ category: "Feed", description: "test", amount: -200, date: TODAY }).success, false);
    });
  });

  describe("Vaccinations", () => {
    it("validates, saves, reads, updates, and persists vaccination records with all fields", async () => {
      const { schema, toColumns } = resourceDefinitions.vaccinations;

      const inputData = {
        species: "poultry" as const,
        targetType: "batch",
        targetId: "batch-flock-1",
        targetName: "Broiler Batch A",
        vaccineName: "Newcastle Disease Vaccine (Lasota)",
        disease: "Newcastle Disease",
        dateDue: TODAY,
        dateAdministered: TODAY,
        dose: "Drinking water",
        administeredBy: "Dr. Kamau (Veterinarian)",
        status: "completed" as const,
        countVaccinated: 500,
        notes: "Administered via morning drinking water. All birds healthy.",
      };

      const parsed = schema.safeParse(inputData);
      assert.equal(parsed.success, true);

      const recordId = crypto.randomUUID();
      const columns = toColumns(parsed.data as never);

      await sqliteStore.createRecord("vaccinations", recordId, TEST_USER_ID, columns);

      // Verify retrieval (simulating page reload/refresh)
      const listAfterSave = await sqliteStore.listRecords("vaccinations", TEST_USER_ID);
      const saved = listAfterSave.find((r) => r.id === recordId);
      assert.ok(saved, "Vaccination record must exist after creation");
      assert.equal(saved.species, "poultry");
      assert.equal(saved.target_type, "batch");
      assert.equal(saved.target_name, "Broiler Batch A");
      assert.equal(saved.vaccine_name, "Newcastle Disease Vaccine (Lasota)");
      assert.equal(saved.disease, "Newcastle Disease");
      assert.equal(saved.date_due, TODAY);
      assert.equal(saved.date_administered, TODAY);
      assert.equal(saved.dose, "Drinking water");
      assert.equal(saved.administered_by, "Dr. Kamau (Veterinarian)");
      assert.equal(saved.status, "completed");
      assert.equal(Number(saved.count_vaccinated), 500);
      assert.equal(saved.notes, "Administered via morning drinking water. All birds healthy.");

      // Test status categorization
      const period = makePeriod(TODAY, 1);
      const vacSummary = summarizeVaccinations(listAfterSave, period);
      assert.ok(vacSummary.completedCount >= 1);

      // Update vaccination
      const updatedInput = {
        ...inputData,
        countVaccinated: 520,
        notes: "Updated headcount after final count",
      };
      const updatedParsed = schema.safeParse(updatedInput);
      assert.equal(updatedParsed.success, true);
      await sqliteStore.updateRecord("vaccinations", recordId, TEST_USER_ID, toColumns(updatedParsed.data as never));

      const listAfterUpdate = await sqliteStore.listRecords("vaccinations", TEST_USER_ID);
      const updated = listAfterUpdate.find((r) => r.id === recordId);
      assert.equal(Number(updated!.count_vaccinated), 520);
      assert.equal(updated!.notes, "Updated headcount after final count");

      // Cleanup
      await sqliteStore.deleteRecord("vaccinations", recordId, TEST_USER_ID);
    });

    it("handles cattle vaccinations with scheduled status and future dates", async () => {
      const { schema, toColumns } = resourceDefinitions.vaccinations;
      const futureDate = "2026-11-20";

      const inputData = {
        species: "cattle" as const,
        targetType: "animal",
        targetId: "cow-baraka",
        targetName: "Baraka (Dairy Cow)",
        vaccineName: "ECF Vaccine (Muguga Cocktail)",
        disease: "East Coast Fever",
        dateDue: futureDate,
        dateAdministered: "",
        dose: "Subcutaneous injection (1.5ml)",
        administeredBy: "Farm Vet",
        status: "scheduled" as const,
        countVaccinated: 1,
        notes: "Keep animal rested after injection",
      };

      const parsed = schema.safeParse(inputData);
      assert.equal(parsed.success, true);

      const recordId = crypto.randomUUID();
      await sqliteStore.createRecord("vaccinations", recordId, TEST_USER_ID, toColumns(parsed.data as never));

      const list = await sqliteStore.listRecords("vaccinations", TEST_USER_ID);
      const saved = list.find((r) => r.id === recordId);
      assert.ok(saved);
      assert.equal(saved.species, "cattle");
      assert.equal(saved.target_name, "Baraka (Dairy Cow)");
      assert.equal(saved.status, "scheduled");
      assert.equal(saved.date_due, futureDate);

      // Cleanup
      await sqliteStore.deleteRecord("vaccinations", recordId, TEST_USER_ID);
    });

    it("rejects invalid vaccination data", () => {
      const { schema } = resourceDefinitions.vaccinations;
      assert.equal(schema.safeParse({ species: "invalid", vaccineName: "Newcastle", targetName: "Batch", dateDue: TODAY }).success, false);
      assert.equal(schema.safeParse({ species: "poultry", vaccineName: "", targetName: "Batch", dateDue: TODAY }).success, false);
      assert.equal(schema.safeParse({ species: "poultry", vaccineName: "Newcastle", targetName: "", dateDue: TODAY }).success, false);
      assert.equal(schema.safeParse({ species: "poultry", vaccineName: "Newcastle", targetName: "Batch", dateDue: "not-a-date" }).success, false);
    });
  });
});
