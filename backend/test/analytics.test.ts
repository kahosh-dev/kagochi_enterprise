/*
 * Worked examples: every expected value below was calculated by hand
 * (shown in the comments) and is then compared with the code's output.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  makePeriod,
  normalizeFeedUnit,
  percentChange,
  previousPeriod,
  summarizeFarm,
  toDay,
  type FarmRecords,
} from "../src/analytics.js";

// Period: 7 days ending 2026-03-31 -> 2026-03-25 .. 2026-03-31.
// Previous period: 2026-03-18 .. 2026-03-24.
const period = makePeriod("2026-03-31", 7);

const records: FarmRecords = {
  poultry: [
    { breed: "Kienyeji", purpose: "Layers", initial_count: 100, current_count: 90, age_weeks: 30, date_added: "2026-01-01T08:00:00.000Z" },
    { breed: "Cobb", purpose: "Broilers", initial_count: 50, current_count: 50, age_weeks: 4, date_added: "2026-03-01" },
    { breed: "Empty", purpose: "Layers", initial_count: 0, current_count: 0, age_weeks: 0, date_added: "2026-03-01" },
  ],
  livestock: [
    { name: "Daisy", type: "Cow", breed: "Friesian", age_years: 4, date_added: "2026-01-01" },
    { name: "Bella", type: "cow ", breed: "Fresian", age_years: 3, date_added: "2026-01-01" },
    { name: "Billy", type: "Goat", breed: "Galla", age_years: 2, date_added: "2026-01-01" },
  ],
  production: [
    { type: "eggs", unit: "pieces", quantity: 30, date: "2026-03-25" },
    { type: "eggs", unit: "pieces", quantity: 42, date: "2026-03-26" },
    { type: "eggs", unit: "pieces", quantity: 18, date: "2026-03-26" },
    { type: "eggs", unit: "trays", quantity: 2, date: "2026-03-27" },
    { type: "milk", unit: "litres", quantity: 10.5, date: "2026-03-30" },
    { type: "eggs", unit: "pieces", quantity: 120, date: "2026-03-20" }, // previous period
    { type: "eggs", unit: "pieces", quantity: 999, date: "2026-03-01" }, // outside both periods
    { type: "eggs", unit: "pieces", quantity: 5, date: "2026-02-30" }, // invalid date
    { type: "eggs", unit: "pieces", quantity: -3, date: "2026-03-28" }, // invalid quantity
  ],
  feeding: [
    { animal_type: "Poultry", feed_type: "Layers mash", quantity: 50, unit: "kg", date: "2026-03-25" },
    { animal_type: "Poultry", feed_type: "Supplement", quantity: 500, unit: "g", date: "2026-03-26" },
    { animal_type: "Cattle", feed_type: "Dairy meal", quantity: 2, unit: "bags", date: "2026-03-27" },
    { animal_type: "Cattle", feed_type: "Molasses", quantity: 3, unit: "litres", date: "2026-03-28" },
    { animal_type: "Poultry", feed_type: "Layers mash", quantity: 42, unit: "kg", date: "2026-03-20" }, // previous
  ],
  expenses: [
    { category: "Feed", description: "Layers mash", amount: 3000, date: "2026-03-25" },
    { category: "feed", description: "Supplement", amount: 1000, date: "2026-03-28" },
    { category: "Vet", description: "Vaccination", amount: 1000, date: "2026-03-29" },
    { category: "Feed", description: "Old purchase", amount: 2000, date: "2026-03-19" }, // previous
  ],
};

const summary = summarizeFarm(records, period);

describe("periods and helpers", () => {
  it("builds inclusive periods and the previous period", () => {
    assert.deepEqual(period, { from: "2026-03-25", to: "2026-03-31", days: 7 });
    assert.deepEqual(previousPeriod(period), { from: "2026-03-18", to: "2026-03-24", days: 7 });
  });

  it("validates dates and accepts ISO timestamps", () => {
    assert.equal(toDay("2026-02-30"), null);
    assert.equal(toDay("not a date"), null);
    assert.equal(toDay("2026-10-13T15:08:44.152Z"), "2026-10-13");
  });

  it("returns null instead of dividing by zero", () => {
    assert.equal(percentChange(5, 0), null);
    assert.equal(percentChange(75, 100), -25);
  });

  it("converts grams to kilograms exactly and leaves other units alone", () => {
    assert.deepEqual(normalizeFeedUnit(500, "g"), { quantity: 0.5, unit: "kg" });
    assert.deepEqual(normalizeFeedUnit(2, "bags"), { quantity: 2, unit: "bags" });
  });
});

describe("population", () => {
  it("totals birds and losses; zero initial count gives null loss %", () => {
    const p = summary.population.poultry;
    assert.equal(p.batchCount, 3);
    assert.equal(p.initialBirds, 150); // 100 + 50 + 0
    assert.equal(p.currentBirds, 140); // 90 + 50 + 0
    assert.equal(p.layerBirds, 90); // Layers batches only: 90 + 0
    assert.equal(p.totalLosses, 10);
    assert.equal(p.lossPercent, 6.7); // 10 / 150 = 6.67%
    assert.equal(p.batches[0].lossPercent, 10); // 10 / 100
    assert.equal(p.batches[2].lossPercent, null);
  });

  it("uses population events over cached counts and lifecycle status", () => {
    const eventRecords: FarmRecords = {
      ...records,
      poultry: [{ id: "flock", breed: "Layers", purpose: "Layers", initial_count: 10, current_count: 10, age_weeks: 30, date_added: "2026-01-01" }],
      livestock: [{ id: "cow", name: "Daisy", type: "Cow", breed: "Friesian", age_years: 3, date_added: "2026-01-01", status: "active" }],
      populationEvents: [
        { id: "d1", owner_id: "owner", species: "poultry", target_id: "flock", target_name: "Layers", event_type: "death", count: 3, date: "2026-03-30", reason: "", notes: "" },
        { id: "s1", owner_id: "owner", species: "cattle", target_id: "cow", target_name: "Daisy", event_type: "sale", count: 1, date: "2026-03-30", reason: "", notes: "" },
      ],
    };
    const population = summarizeFarm(eventRecords, period).population;
    assert.equal(population.poultry.currentBirds, 7);
    assert.equal(population.livestock.animalCount, 0);
  });

  it("groups livestock types case-insensitively", () => {
    assert.deepEqual(summary.population.livestock.byType, [
      { type: "Cow", count: 2 },
      { type: "Goat", count: 1 },
    ]);
  });
});

describe("production", () => {
  it("keeps eggs in pieces, eggs in trays and milk in litres separate", () => {
    const lines = summary.production.lines;
    const pieces = lines.find((l) => l.type === "eggs" && l.unit === "pieces")!;
    // 30 + 42 + 18 = 90 over 2 recorded days -> 45 per day; previous 120 -> (90-120)/120 = -25%
    assert.deepEqual(pieces, {
      type: "eggs",
      unit: "pieces",
      total: 90,
      recordCount: 3,
      daysWithRecords: 2,
      averagePerRecordedDay: 45,
      previousTotal: 120,
      changePercent: -25,
    });
    const trays = lines.find((l) => l.unit === "trays")!;
    assert.equal(trays.total, 2);
    assert.equal(trays.changePercent, null); // nothing to compare with
    const milk = lines.find((l) => l.type === "milk")!;
    assert.equal(milk.total, 10.5);
    assert.equal(lines.length, 3);
  });

  it("excludes and counts invalid records", () => {
    assert.equal(summary.production.invalidRecords, 2);
  });

  it("estimates laying rate from eggs per recorded day and layer birds", () => {
    // 45 eggs/day / 90 layers x 100 = 50%
    assert.equal(summary.indicators.estimatedLayingRatePercent, 50);
  });
});

describe("feeding", () => {
  it("totals per unit after converting g to kg", () => {
    const byUnit = Object.fromEntries(summary.feeding.totalsByUnit.map((u) => [u.unit, u]));
    // kg: 50 + 0.5 = 50.5; per day 50.5 / 7 = 7.21; previous 42 -> (50.5-42)/42 = 20.2%
    assert.equal(byUnit.kg.total, 50.5);
    assert.equal(byUnit.kg.averagePerDay, 7.21);
    assert.equal(byUnit.kg.changePercent, 20.2);
    assert.equal(byUnit.bags.total, 2);
    assert.equal(byUnit.litres.total, 3);
    assert.equal(byUnit.g, undefined);
  });
});

describe("expenses", () => {
  it("totals the period, compares with the previous one and groups categories", () => {
    const e = summary.expenses;
    assert.equal(e.total, 5000); // 3000 + 1000 + 1000
    assert.equal(e.previousTotal, 2000);
    assert.equal(e.changePercent, 150); // (5000-2000)/2000
    assert.equal(e.averagePerDay, 714.29); // 5000 / 7
    assert.deepEqual(
      e.byCategory.map((c) => [c.category, c.total, c.sharePercent]),
      [
        ["Feed", 4000, 80],
        ["Vet", 1000, 20],
      ]
    );
  });

  it("does not claim revenue or profit", () => {
    assert.equal(summary.financial.revenueAvailable, false);
  });
});

describe("rules", () => {
  const ids = summary.rules.map((r) => r.id);

  it("fires the expected IF-THEN rules for the worked example", () => {
    assert.ok(ids.includes("bird-losses")); // 10% >= 5%
    assert.equal(ids.filter((id) => id === "bird-losses").length, 1);
    assert.ok(ids.includes("production-drop")); // eggs -25% <= -20%
    assert.ok(ids.includes("missing-egg-records")); // last egg record 03-27, 4 days before 03-31
    assert.ok(ids.includes("mixed-feed-units")); // bags and kg
    assert.ok(ids.includes("expense-increase")); // +150% >= 25%
    assert.ok(!ids.includes("no-animals"));
    assert.ok(!ids.includes("missing-feeding-records"));
  });

  it("every rule states its condition and recommendation", () => {
    for (const rule of summary.rules) {
      assert.match(rule.condition, /^IF /);
      assert.ok(rule.recommendation.length > 10);
    }
  });

  it("handles a farm with no records at all", () => {
    const empty = summarizeFarm({ poultry: [], livestock: [], production: [], feeding: [], expenses: [] }, period);
    assert.deepEqual(empty.rules.map((r) => r.id), ["no-animals"]);
    assert.equal(empty.expenses.total, 0);
    assert.equal(empty.expenses.changePercent, null);
    assert.equal(empty.indicators.estimatedLayingRatePercent, null);
    assert.deepEqual(empty.production.lines, []);
  });

  it("flags possible duplicate records", () => {
    const dup = summarizeFarm(
      {
        ...records,
        expenses: [
          { category: "Vet", description: "Vaccination", amount: 1000, date: "2026-03-29" },
          { category: "Vet", description: "Vaccination", amount: 1000, date: "2026-03-29" },
        ],
      },
      period
    );
    assert.equal(dup.dataQuality.possibleDuplicates, 1);
    assert.ok(dup.rules.some((r) => r.id === "possible-duplicates"));
  });
});
