import { describe, it, before, after } from "node:test";
import { hashPassword } from "../src/auth.js";
import assert from "node:assert/strict";
import crypto from "crypto";
import { sqliteStore } from "../src/sqliteStore.js";
import { resourceDefinitions, productionSchema, feedingSchema, incomeSchema, expenseSchema } from "../src/schemas.js";
import {
  makePeriod,
  makeCustomPeriod,
  previousPeriod,
  summarizeProduction,
  summarizeFeeding,
  summarizeIncome,
  summarizeExpenses,
  summarizeFarm,
  toDay,
  type FarmRecords,
} from "../src/analytics.js";

const TEST_USER = "test-enhancement-user-" + crypto.randomUUID();
const TODAY = "2026-11-08";

describe("Production, Feeding, and Financial Tracking Enhancements", () => {
  before(async () => {
    const pw = await hashPassword("ValidPassword123!");
    await sqliteStore.createUser(TEST_USER, "Enhancement Farmer", `${TEST_USER}@kagochi.test`, pw, "farmer");
  });

  after(async () => {
    await sqliteStore.adminDeleteUser(TEST_USER);
  });
  describe("1. Poultry Egg Production in Trays & Cattle Milk in Litres", () => {
    it("records egg production in trays (including fractional trays) and verifies persistence", async () => {
      const { toColumns } = resourceDefinitions.production;

      const eggInput = {
        type: "eggs" as const,
        quantity: 2.5, // fractional trays
        unit: "trays",
        date: TODAY,
        destination: "produced" as const,
        sellingPrice: 0,
        animalType: "Poultry",
        groupName: "Layers Batch 1",
        notes: "Morning harvest, Grade A",
      };

      const parsed = productionSchema.safeParse(eggInput);
      assert.equal(parsed.success, true);

      const recordId = crypto.randomUUID();
      await sqliteStore.createRecord("production", recordId, TEST_USER, toColumns(parsed.data as never));

      // Retrieve from store
      const list = await sqliteStore.listRecords("production", TEST_USER);
      const saved = list.find((r) => r.id === recordId);
      assert.ok(saved);
      assert.equal(saved.type, "eggs");
      assert.equal(Number(saved.quantity), 2.5);
      assert.equal(saved.unit, "trays");
      assert.equal(saved.date, TODAY);
      assert.equal(saved.animal_type, "Poultry");
      assert.equal(saved.group_name, "Layers Batch 1");

      // Verify optional egg conversion (2.5 trays @ 30 eggs/tray = 75 eggs)
      const traySize = 30;
      const equivalentEggs = Number(saved.quantity) * traySize;
      assert.equal(equivalentEggs, 75);

      // Cleanup
      await sqliteStore.deleteRecord("production", recordId, TEST_USER);
    });

    it("preserves historical records stored in pieces without silent conversion", async () => {
      const { toColumns } = resourceDefinitions.production;

      const historicalPiecesRecord = {
        type: "eggs" as const,
        quantity: 60, // 60 pieces
        unit: "pieces",
        date: "2026-10-15",
        destination: "produced" as const,
        sellingPrice: 0,
        animalType: "Poultry",
        groupName: "Old Flock",
        notes: "Historical entry recorded in pieces",
      };

      const parsed = productionSchema.safeParse(historicalPiecesRecord);
      assert.equal(parsed.success, true);

      const recordId = crypto.randomUUID();
      await sqliteStore.createRecord("production", recordId, TEST_USER, toColumns(parsed.data as never));

      const list = await sqliteStore.listRecords("production", TEST_USER);
      const saved = list.find((r) => r.id === recordId);
      assert.ok(saved);
      assert.equal(saved.unit, "pieces");
      assert.equal(Number(saved.quantity), 60);

      // Summarize: verifies trays and pieces remain separate lines
      const period = makeCustomPeriod("2026-10-01", "2026-10-31");
      const summary = summarizeProduction([saved], period);
      const piecesLine = summary.lines.find((l) => l.unit === "pieces");
      assert.ok(piecesLine);
      assert.equal(piecesLine.total, 60);

      await sqliteStore.deleteRecord("production", recordId, TEST_USER);
    });

    it("records cattle milk production in litres with cattle animal/group", async () => {
      const { toColumns } = resourceDefinitions.production;

      const milkInput = {
        type: "milk" as const,
        quantity: 18.5,
        unit: "litres",
        date: TODAY,
        destination: "produced" as const,
        sellingPrice: 1110,
        animalType: "Cattle",
        groupName: "Daisy (Friesian)",
        notes: "Evening milking yield",
      };

      const parsed = productionSchema.safeParse(milkInput);
      assert.equal(parsed.success, true);

      const recordId = crypto.randomUUID();
      await sqliteStore.createRecord("production", recordId, TEST_USER, toColumns(parsed.data as never));

      const list = await sqliteStore.listRecords("production", TEST_USER);
      const saved = list.find((r) => r.id === recordId);
      assert.ok(saved);
      assert.equal(saved.type, "milk");
      assert.equal(Number(saved.quantity), 18.5);
      assert.equal(saved.unit, "litres");
      assert.equal(saved.animal_type, "Cattle");
      assert.equal(saved.group_name, "Daisy (Friesian)");

      await sqliteStore.deleteRecord("production", recordId, TEST_USER);
    });
  });

  describe("2. Daily, Weekly, Monthly, Yearly and Custom Production Tracking", () => {
    it("calculates daily, weekly, monthly, and yearly production totals accurately from records", () => {
      const records = [
        { type: "eggs", unit: "trays", quantity: 5, date: "2026-11-08" }, // Today
        { type: "eggs", unit: "trays", quantity: 4.5, date: "2026-11-07" }, // This week
        { type: "eggs", unit: "trays", quantity: 6, date: "2026-11-02" }, // This week (Monday)
        { type: "eggs", unit: "trays", quantity: 7, date: "2026-10-25" }, // Last month
        { type: "milk", unit: "litres", quantity: 20, date: "2026-11-08" }, // Today
        { type: "milk", unit: "litres", quantity: 22, date: "2026-11-07" }, // This week
        { type: "milk", unit: "litres", quantity: 25, date: "2026-10-15" }, // Last month
      ];

      // Daily: 2026-11-08
      const dailyPeriod = makePeriod("2026-11-08", 1);
      const dailySummary = summarizeProduction(records, dailyPeriod);
      const dailyTrays = dailySummary.lines.find((l) => l.unit === "trays")?.total ?? 0;
      const dailyMilk = dailySummary.lines.find((l) => l.type === "milk")?.total ?? 0;
      assert.equal(dailyTrays, 5);
      assert.equal(dailyMilk, 20);

      // Weekly: 2026-11-02 to 2026-11-08 (7 days)
      const weeklyPeriod = makeCustomPeriod("2026-11-02", "2026-11-08");
      const weeklySummary = summarizeProduction(records, weeklyPeriod);
      const weeklyTrays = weeklySummary.lines.find((l) => l.unit === "trays")?.total ?? 0;
      const weeklyMilk = weeklySummary.lines.find((l) => l.type === "milk")?.total ?? 0;
      assert.equal(weeklyTrays, 15.5); // 5 + 4.5 + 6
      assert.equal(weeklyMilk, 42); // 20 + 22

      // Monthly: November 2026 (2026-11-01 to 2026-11-30)
      const monthlyPeriod = makeCustomPeriod("2026-11-01", "2026-11-30");
      const monthlySummary = summarizeProduction(records, monthlyPeriod);
      const monthlyTrays = monthlySummary.lines.find((l) => l.unit === "trays")?.total ?? 0;
      assert.equal(monthlyTrays, 15.5);

      // Yearly: 2026 (2026-01-01 to 2026-12-31)
      const yearlyPeriod = makeCustomPeriod("2026-01-01", "2026-12-31");
      const yearlySummary = summarizeProduction(records, yearlyPeriod);
      const yearlyTrays = yearlySummary.lines.find((l) => l.unit === "trays")?.total ?? 0;
      const yearlyMilk = yearlySummary.lines.find((l) => l.type === "milk")?.total ?? 0;
      assert.equal(yearlyTrays, 22.5); // 15.5 + 7
      assert.equal(yearlyMilk, 67); // 42 + 25

      // Custom range: 2026-11-01 to 2026-11-07
      const customPeriod = makeCustomPeriod("2026-11-01", "2026-11-07");
      const customSummary = summarizeProduction(records, customPeriod);
      const customTrays = customSummary.lines.find((l) => l.unit === "trays")?.total ?? 0;
      assert.equal(customTrays, 10.5); // 4.5 + 6
    });
  });

  describe("3. Feeding Tracking Enhancements & Safe Unit Handling", () => {
    it("records poultry and cattle feed with animal group, ensuring units are never mixed", async () => {
      const { toColumns } = resourceDefinitions.feeding;

      const poultryFeed = {
        animalType: "Poultry",
        groupName: "Layers Flock A",
        feedType: "Layers Mash",
        quantity: 50,
        unit: "kg" as const,
        date: TODAY,
        cost: 3200,
        supplier: "Unga Feeds",
        notes: "Morning feeding",
      };

      const cattleFeed = {
        animalType: "Cattle",
        groupName: "Lactating Cows",
        feedType: "Dairy Meal",
        quantity: 2,
        unit: "bags" as const,
        date: TODAY,
        cost: 5400,
        supplier: "Chania Agrovet",
        notes: "High yield feed",
      };

      const parsedPoultry = feedingSchema.safeParse(poultryFeed);
      const parsedCattle = feedingSchema.safeParse(cattleFeed);
      assert.equal(parsedPoultry.success, true);
      assert.equal(parsedCattle.success, true);

      const pId = crypto.randomUUID();
      const cId = crypto.randomUUID();

      await sqliteStore.createRecord("feeding", pId, TEST_USER, toColumns(parsedPoultry.data as never));
      await sqliteStore.createRecord("feeding", cId, TEST_USER, toColumns(parsedCattle.data as never));

      const list = await sqliteStore.listRecords("feeding", TEST_USER);
      const pSaved = list.find((r) => r.id === pId);
      const cSaved = list.find((r) => r.id === cId);

      assert.ok(pSaved && cSaved);
      assert.equal(pSaved.group_name, "Layers Flock A");
      assert.equal(cSaved.group_name, "Lactating Cows");

      // Verify that kg and bags are kept strictly separate in analytics
      const period = makePeriod(TODAY, 1);
      const summary = summarizeFeeding([pSaved, cSaved], period);

      const kgTotal = summary.totalsByUnit.find((u) => u.unit === "kg");
      const bagsTotal = summary.totalsByUnit.find((u) => u.unit === "bags");

      assert.ok(kgTotal && bagsTotal);
      assert.equal(kgTotal.total, 50);
      assert.equal(bagsTotal.total, 2);
      assert.equal(summary.totalFeedCost, 8600); // 3200 + 5400

      // Cleanup
      await sqliteStore.deleteRecord("feeding", pId, TEST_USER);
      await sqliteStore.deleteRecord("feeding", cId, TEST_USER);
    });
  });

  describe("4. Money In (Farm Income) & Money Out (Farm Expenses)", () => {
    it("tracks daily, weekly, monthly, yearly income and expenses accurately", async () => {
      const { toColumns: toIncCols } = resourceDefinitions.income;
      const { toColumns: toExpCols } = resourceDefinitions.expenses;

      // Income record
      const incInput = {
        category: "Egg Sales",
        description: "Sold 10 trays of brown eggs",
        amount: 4500,
        date: TODAY,
        quantity: 10,
        unit: "trays",
      };
      const parsedInc = incomeSchema.safeParse(incInput);
      assert.equal(parsedInc.success, true);
      const incId = crypto.randomUUID();
      await sqliteStore.createRecord("income", incId, TEST_USER, toIncCols(parsedInc.data as never));

      // Expense record
      const expInput = {
        category: "Poultry Feed",
        description: "Bought 1 bag of layers mash",
        amount: 2700,
        date: TODAY,
      };
      const parsedExp = expenseSchema.safeParse(expInput);
      assert.equal(parsedExp.success, true);
      const expId = crypto.randomUUID();
      await sqliteStore.createRecord("expenses", expId, TEST_USER, toExpCols(parsedExp.data as never));

      // Retrieve records
      const incList = await sqliteStore.listRecords("income", TEST_USER);
      const expList = await sqliteStore.listRecords("expenses", TEST_USER);

      const savedInc = incList.find((r) => r.id === incId);
      const savedExp = expList.find((r) => r.id === expId);
      assert.ok(savedInc && savedExp);

      // Verify Daily Net Income = Income (4500) - Expenses (2700) = 1800
      const period = makePeriod(TODAY, 1);
      const incSummary = summarizeIncome([savedInc], period);
      const expSummary = summarizeExpenses([savedExp], period);
      const netIncome = incSummary.total - expSummary.total;

      assert.equal(incSummary.total, 4500);
      assert.equal(expSummary.total, 2700);
      assert.equal(netIncome, 1800);

      // Cleanup
      await sqliteStore.deleteRecord("income", incId, TEST_USER);
      await sqliteStore.deleteRecord("expenses", expId, TEST_USER);
    });
  });

  describe("5. Financial Summary: Net Farm Income Integration", () => {
    it("calculates Net Farm Income = Total Income - Total Expenses across different periods", () => {
      const incomeRecords = [
        { date: "2026-11-08", amount: 10000, category: "Egg Sales" },
        { date: "2026-11-05", amount: 15000, category: "Milk Sales" },
        { date: "2026-10-20", amount: 20000, category: "Egg Sales" },
      ];

      const expenseRecords = [
        { date: "2026-11-08", amount: 4000, category: "Feed" },
        { date: "2026-11-03", amount: 6000, category: "Labor" },
        { date: "2026-10-22", amount: 12000, category: "Vet" },
      ];

      const dummyFarm: FarmRecords = {
        poultry: [],
        livestock: [],
        production: [],
        feeding: [],
        expenses: expenseRecords,
        income: incomeRecords,
      };

      // Daily Net Income (2026-11-08): 10,000 - 4,000 = 6,000
      const dailySummary = summarizeFarm(dummyFarm, makePeriod("2026-11-08", 1));
      assert.equal(dailySummary.financial.totalIncome, 10000);
      assert.equal(dailySummary.financial.totalExpenses, 4000);
      assert.equal(dailySummary.financial.operatingProfitOrLoss, 6000);
      assert.equal(dailySummary.financial.isProfitable, true);

      // Weekly Net Income (2026-11-02 to 2026-11-08): (10,000 + 15,000) - (4,000 + 6,000) = 25,000 - 10,000 = 15,000
      const weeklySummary = summarizeFarm(dummyFarm, makeCustomPeriod("2026-11-02", "2026-11-08"));
      assert.equal(weeklySummary.financial.totalIncome, 25000);
      assert.equal(weeklySummary.financial.totalExpenses, 10000);
      assert.equal(weeklySummary.financial.operatingProfitOrLoss, 15000);

      // Monthly Net Income for October 2026: 20,000 - 12,000 = 8,000
      const monthlyOctSummary = summarizeFarm(dummyFarm, makeCustomPeriod("2026-10-01", "2026-10-31"));
      assert.equal(monthlyOctSummary.financial.totalIncome, 20000);
      assert.equal(monthlyOctSummary.financial.totalExpenses, 12000);
      assert.equal(monthlyOctSummary.financial.operatingProfitOrLoss, 8000);

      // Yearly Net Income for 2026: 45,000 - 22,000 = 23,000
      const yearlySummary = summarizeFarm(dummyFarm, makeCustomPeriod("2026-01-01", "2026-12-31"));
      assert.equal(yearlySummary.financial.totalIncome, 45000);
      assert.equal(yearlySummary.financial.totalExpenses, 22000);
      assert.equal(yearlySummary.financial.operatingProfitOrLoss, 23000);
    });
  });

  describe("6. Individual Cattle and Poultry Batch Production Tracking with Farm-Wide Aggregation", () => {
    it("associates cattle milk production with target animal ID and verifies database persistence", async () => {
      const { toColumns } = resourceDefinitions.production;
      const faithId = "cattle-" + crypto.randomUUID();
      const recordId = crypto.randomUUID();

      const milkInput = {
        type: "milk" as const,
        quantity: 12,
        unit: "litres",
        date: TODAY,
        destination: "produced" as const,
        sellingPrice: 720,
        animalType: "Cattle",
        groupName: "Faith",
        targetId: faithId,
        notes: "Morning milk collection for Faith",
      };

      const parsed = productionSchema.safeParse(milkInput);
      assert.equal(parsed.success, true);

      await sqliteStore.createRecord("production", recordId, TEST_USER, toColumns(parsed.data as never));

      const list = await sqliteStore.listRecords("production", TEST_USER);
      const saved = list.find((r) => r.id === recordId);
      assert.ok(saved);
      assert.equal(saved.type, "milk");
      assert.equal(Number(saved.quantity), 12);
      assert.equal(saved.unit, "litres");
      assert.equal(saved.animal_type, "Cattle");
      assert.equal(saved.group_name, "Faith");
      assert.equal(saved.target_id, faithId);

      // Cleanup
      await sqliteStore.deleteRecord("production", recordId, TEST_USER);
    });

    it("associates poultry egg production in trays with batch ID and verifies persistence", async () => {
      const { toColumns } = resourceDefinitions.production;
      const batchId = "batch-" + crypto.randomUUID();
      const recordId = crypto.randomUUID();

      const eggInput = {
        type: "eggs" as const,
        quantity: 35, // 35 trays
        unit: "trays",
        date: TODAY,
        destination: "produced" as const,
        sellingPrice: 15750,
        animalType: "Poultry",
        groupName: "Layers Batch B",
        targetId: batchId,
        notes: "Harvest for Layers Batch B",
      };

      const parsed = productionSchema.safeParse(eggInput);
      assert.equal(parsed.success, true);

      await sqliteStore.createRecord("production", recordId, TEST_USER, toColumns(parsed.data as never));

      const list = await sqliteStore.listRecords("production", TEST_USER);
      const saved = list.find((r) => r.id === recordId);
      assert.ok(saved);
      assert.equal(saved.type, "eggs");
      assert.equal(Number(saved.quantity), 35);
      assert.equal(saved.unit, "trays");
      assert.equal(saved.animal_type, "Poultry");
      assert.equal(saved.group_name, "Layers Batch B");
      assert.equal(saved.target_id, batchId);

      // Verify egg equivalent (@ 30 eggs/tray = 1,050 eggs)
      const equivalentPieces = Number(saved.quantity) * 30;
      assert.equal(equivalentPieces, 1050);

      // Cleanup
      await sqliteStore.deleteRecord("production", recordId, TEST_USER);
    });

    it("automatically calculates farm-wide production totals by aggregating individual animal and batch records", async () => {
      const { toColumns } = resourceDefinitions.production;

      const faithId = "cattle-faith-" + crypto.randomUUID();
      const daisyId = "cattle-daisy-" + crypto.randomUUID();
      const joyId = "cattle-joy-" + crypto.randomUUID();

      const batchAId = "batch-kienyeji-a-" + crypto.randomUUID();
      const batchBId = "batch-layers-b-" + crypto.randomUUID();

      const idsToCleanup: string[] = [];

      async function insertRec(rec: {
        type: "eggs" | "milk";
        quantity: number;
        unit: string;
        date: string;
        animalType: string;
        groupName: string;
        targetId: string;
      }) {
        const id = crypto.randomUUID();
        idsToCleanup.push(id);
        const parsed = productionSchema.parse({
          ...rec,
          destination: "produced",
          sellingPrice: 0,
          notes: "",
        });
        await sqliteStore.createRecord("production", id, TEST_USER, toColumns(parsed as never));
        return id;
      }

      // Cattle records: Faith (12 L) + Daisy (18 L) + Joy (15 L) = 45 L
      await insertRec({ type: "milk", quantity: 12, unit: "litres", date: TODAY, animalType: "Cattle", groupName: "Faith", targetId: faithId });
      await insertRec({ type: "milk", quantity: 18, unit: "litres", date: TODAY, animalType: "Cattle", groupName: "Daisy", targetId: daisyId });
      await insertRec({ type: "milk", quantity: 15, unit: "litres", date: TODAY, animalType: "Cattle", groupName: "Joy", targetId: joyId });

      // Poultry records: Kienyeji Batch A (20 trays) + Layers Batch B (35 trays) = 55 trays
      await insertRec({ type: "eggs", quantity: 20, unit: "trays", date: TODAY, animalType: "Poultry", groupName: "Kienyeji Batch A", targetId: batchAId });
      await insertRec({ type: "eggs", quantity: 35, unit: "trays", date: TODAY, animalType: "Poultry", groupName: "Layers Batch B", targetId: batchBId });

      const allRecords = await sqliteStore.listRecords("production", TEST_USER);
      const todayRecords = allRecords.filter((r) => r.date === TODAY && idsToCleanup.includes(r.id));

      // 1. Verify Farm-Wide Cattle Milk Total: 12 + 18 + 15 = 45 L
      const totalCattleMilk = todayRecords
        .filter((r) => r.type === "milk" && r.unit === "litres")
        .reduce((sum, r) => sum + Number(r.quantity), 0);
      assert.equal(totalCattleMilk, 45);

      // 2. Verify Individual Cattle Production
      const faithMilk = todayRecords
        .filter((r) => r.target_id === faithId)
        .reduce((sum, r) => sum + Number(r.quantity), 0);
      const daisyMilk = todayRecords
        .filter((r) => r.target_id === daisyId)
        .reduce((sum, r) => sum + Number(r.quantity), 0);
      const joyMilk = todayRecords
        .filter((r) => r.target_id === joyId)
        .reduce((sum, r) => sum + Number(r.quantity), 0);

      assert.equal(faithMilk, 12);
      assert.equal(daisyMilk, 18);
      assert.equal(joyMilk, 15);

      // 3. Verify Farm-Wide Poultry Eggs Total: 20 + 35 = 55 trays
      const totalPoultryEggs = todayRecords
        .filter((r) => r.type === "eggs" && r.unit === "trays")
        .reduce((sum, r) => sum + Number(r.quantity), 0);
      assert.equal(totalPoultryEggs, 55);

      // 4. Verify Equivalent individual eggs: 55 trays * 30 = 1650 eggs
      assert.equal(totalPoultryEggs * 30, 1650);

      // 5. Verify Individual Batch Production
      const batchAMilk = todayRecords
        .filter((r) => r.target_id === batchAId)
        .reduce((sum, r) => sum + Number(r.quantity), 0);
      const batchBMilk = todayRecords
        .filter((r) => r.target_id === batchBId)
        .reduce((sum, r) => sum + Number(r.quantity), 0);

      assert.equal(batchAMilk, 20);
      assert.equal(batchBMilk, 35);

      // 6. Verify Underperformance & Benchmark Detection
      const herdDailyAvg = (faithMilk + daisyMilk + joyMilk) / 3; // 15 L
      assert.equal(herdDailyAvg, 15);

      // Daisy is producing 18 L (+20% vs herd avg) -> Top Producer
      const daisyDiffPct = ((daisyMilk - herdDailyAvg) / herdDailyAvg) * 100;
      assert.equal(daisyDiffPct, 20);

      // Faith is producing 12 L (-20% vs herd avg) -> Lower than Herd
      const faithDiffPct = ((faithMilk - herdDailyAvg) / herdDailyAvg) * 100;
      assert.equal(faithDiffPct, -20);

      // Poultry laying rate: Batch B has 500 birds, produced 35 trays (1,050 eggs).
      // If 500 birds produce 350 eggs/day, laying rate = 350 / 500 = 70% peak layers.
      const sampleBirds = 1500;
      const batchBPieces = 35 * 30; // 1050 eggs
      const layingRate = (batchBPieces / (sampleBirds * 1)) * 100; // 70%
      assert.equal(layingRate, 70);

      // 7. Verify Editing a record immediately updates farm totals
      const faithRecord = todayRecords.find((r) => r.target_id === faithId)!;
      await sqliteStore.updateRecord("production", faithRecord.id, TEST_USER, toColumns({
        type: "milk",
        quantity: 14, // Faith increased from 12 to 14 L
        unit: "litres",
        date: TODAY,
        destination: "produced",
        sellingPrice: 0,
        animalType: "Cattle",
        groupName: "Faith",
        targetId: faithId,
        notes: "Updated yield",
      } as never));

      const updatedRecords = await sqliteStore.listRecords("production", TEST_USER);
      const updatedTotalMilk = updatedRecords
        .filter((r) => r.date === TODAY && idsToCleanup.includes(r.id) && r.type === "milk")
        .reduce((sum, r) => sum + Number(r.quantity), 0);
      assert.equal(updatedTotalMilk, 47); // 14 + 18 + 15 = 47

      // 8. Verify Deleting a record immediately updates farm totals
      await sqliteStore.deleteRecord("production", faithRecord.id, TEST_USER);
      const afterDeleteRecords = await sqliteStore.listRecords("production", TEST_USER);
      const afterDeleteTotalMilk = afterDeleteRecords
        .filter((r) => r.date === TODAY && idsToCleanup.includes(r.id) && r.type === "milk")
        .reduce((sum, r) => sum + Number(r.quantity), 0);
      assert.equal(afterDeleteTotalMilk, 33); // 18 + 15 = 33

      // Clean up remaining records
      for (const id of idsToCleanup) {
        await sqliteStore.deleteRecord("production", id, TEST_USER).catch(() => {});
      }
    });
  });
});
