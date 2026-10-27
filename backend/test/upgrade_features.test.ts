import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  makePeriod,
  makeCustomPeriod,
  summarizePopulation,
  summarizeIncome,
  summarizeExpenses,
  summarizeVaccinations,
  summarizeFarm,
} from "../src/analytics.js";
import {
  poultrySchema,
  livestockSchema,
  incomeSchema,
  vaccinationSchema,
  vaccinationScheduleSchema,
} from "../src/schemas.js";

describe("Upgraded Farm Features & Analytics", () => {
  it("calculates custom date periods accurately", () => {
    const period = makeCustomPeriod("2026-10-01", "2026-10-27");
    assert.equal(period.from, "2026-10-01");
    assert.equal(period.to, "2026-10-27");
    assert.equal(period.days, 27);
  });

  it("calculates single-day periods for daily P&L", () => {
    const period = makePeriod("2026-10-27", 1);
    assert.equal(period.from, "2026-10-27");
    assert.equal(period.to, "2026-10-27");
    assert.equal(period.days, 1);
  });

  it("accurately summarizes income and operating profit & loss", () => {
    const period = makePeriod("2026-10-27", 7);
    const incomeRows = [
      { date: "2026-10-27", amount: 15000, category: "egg_sales" },
      { date: "2026-10-26", amount: 20000, category: "milk_sales" },
      { date: "2026-10-25", amount: 5000, category: "manure_sales" },
    ];
    const expenseRows = [
      { date: "2026-10-27", amount: 8000, category: "poultry_feed" },
      { date: "2026-10-26", amount: 7000, category: "cattle_feed" },
      { date: "2026-10-25", amount: 3000, category: "vaccines" },
    ];

    const incSummary = summarizeIncome(incomeRows, period);
    const expSummary = summarizeExpenses(expenseRows, period);

    assert.equal(incSummary.total, 40000);
    assert.equal(expSummary.total, 18000);

    const farmSummary = summarizeFarm(
      {
        poultry: [],
        livestock: [],
        production: [],
        feeding: [],
        expenses: expenseRows,
        income: incomeRows,
      },
      period,
    );

    assert.equal(farmSummary.financial.revenueAvailable, true);
    assert.equal(farmSummary.financial.totalIncome, 40000);
    assert.equal(farmSummary.financial.totalExpenses, 18000);
    assert.equal(farmSummary.financial.operatingProfitOrLoss, 22000);
    assert.equal(farmSummary.financial.isProfitable, true);
    assert.equal(farmSummary.financial.netMarginPercent, 55);
  });

  it("detects operating losses and generates a warning rule", () => {
    const period = makePeriod("2026-10-27", 7);
    const incomeRows = [{ date: "2026-10-27", amount: 5000, category: "egg_sales" }];
    const expenseRows = [{ date: "2026-10-27", amount: 12000, category: "poultry_feed" }];

    const farmSummary = summarizeFarm(
      {
        poultry: [],
        livestock: [],
        production: [],
        feeding: [],
        expenses: expenseRows,
        income: incomeRows,
      },
      period,
    );

    assert.equal(farmSummary.financial.operatingProfitOrLoss, -7000);
    assert.equal(farmSummary.financial.isProfitable, false);

    const lossRule = farmSummary.rules.find((r) => r.id === "operating-loss");
    assert.ok(lossRule);
    assert.equal(lossRule?.severity, "warning");
    assert.match(lossRule!.finding, /Operating loss of KES 7000/);
  });

  it("categorizes poultry by growth stages including chicks and broilers", () => {
    const poultryRows = [
      { breed: "KARI", purpose: "eggs", initial_count: 200, current_count: 195, age_weeks: 2, stage: "chicks" },
      { breed: "Cobb 500", purpose: "meat", initial_count: 500, current_count: 480, age_weeks: 5, stage: "broilers" },
      { breed: "Isa Brown", purpose: "eggs", initial_count: 300, current_count: 290, age_weeks: 25, stage: "layers" },
    ];

    const pop = summarizePopulation({
      poultry: poultryRows,
      livestock: [],
      production: [],
      feeding: [],
      expenses: [],
    });

    assert.equal(pop.poultry.currentBirds, 195 + 480 + 290);
    assert.equal(pop.poultry.chickBirds, 195);
    assert.equal(pop.poultry.broilerBirds, 480);
    assert.equal(pop.poultry.layerBirds, 290);
  });

  it("categorizes cattle into calves, heifers, cows, and bulls", () => {
    const cattleRows = [
      { name: "Baraka", type: "Cattle", breed: "Friesian", age_years: 0.5, category: "calf", sex: "female" },
      { name: "Neema", type: "Cattle", breed: "Ayrshire", age_years: 1.8, category: "heifer", sex: "female" },
      { name: "Zawadi", type: "Cattle", breed: "Friesian", age_years: 4.0, category: "cow", sex: "female" },
      { name: "Simba", type: "Cattle", breed: "Jersey", age_years: 3.0, category: "bull", sex: "male" },
    ];

    const pop = summarizePopulation({
      poultry: [],
      livestock: cattleRows,
      production: [],
      feeding: [],
      expenses: [],
    });

    assert.equal(pop.livestock.animalCount, 4);
    assert.equal(pop.livestock.calvesCount, 1);
    assert.equal(pop.livestock.heifersCount, 1);
    assert.equal(pop.livestock.cowsCount, 1);
    assert.equal(pop.livestock.bullsCount, 1);
  });

  it("accurately categorizes vaccinations into due today, upcoming, and overdue", () => {
    const period = makePeriod("2026-10-27", 1); // today is 2026-10-27
    const vacRows = [
      {
        species: "poultry",
        target_type: "batch",
        target_name: "Batch 1",
        vaccine_name: "Gumboro",
        date_due: "2026-10-27",
        status: "scheduled",
      },
      {
        species: "poultry",
        target_type: "batch",
        target_name: "Batch 2",
        vaccine_name: "Newcastle",
        date_due: "2026-10-20",
        status: "scheduled",
      },
      {
        species: "cattle",
        target_type: "animal",
        target_name: "Neema",
        vaccine_name: "ECF Vaccine",
        date_due: "2026-10-30",
        status: "scheduled",
      },
      {
        species: "cattle",
        target_type: "animal",
        target_name: "Zawadi",
        vaccine_name: "Anthrax",
        date_due: "2026-10-25",
        status: "completed",
      },
    ];

    const vac = summarizeVaccinations(vacRows, period);
    assert.equal(vac.dueTodayCount, 1); // 2026-10-27
    assert.equal(vac.overdueCount, 1); // 2026-10-20
    assert.equal(vac.upcoming7DaysCount, 1); // 2026-10-30 is within 7 days
    assert.equal(vac.completedCount, 1); // completed
  });

  it("validates new schemas correctly", () => {
    // Valid income
    const validIncome = incomeSchema.safeParse({
      category: "egg_sales",
      description: "Sold 10 trays to local market",
      amount: 4500,
      date: "2026-10-27",
      quantity: 10,
      unit: "trays",
    });
    assert.equal(validIncome.success, true);

    // Valid vaccination
    const validVac = vaccinationSchema.safeParse({
      species: "poultry",
      targetType: "batch",
      targetId: "batch-123",
      targetName: "Broilers Oct Batch",
      vaccineName: "Newcastle Disease Vaccine",
      disease: "Newcastle",
      dateDue: "2026-11-05",
      dose: "Eye drop",
    });
    assert.equal(validVac.success, true);

    // Valid cattle livestock
    const validCattle = livestockSchema.safeParse({
      name: "Baraka",
      type: "Cattle",
      breed: "Friesian",
      ageYears: 0.8,
      dateAdded: "2026-10-27",
      category: "calf",
      sex: "female",
    });
    assert.equal(validCattle.success, true);
  });
});
