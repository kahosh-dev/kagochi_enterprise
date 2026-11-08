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
});
