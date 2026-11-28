import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildPopulationBackfillPlan, hasNonNegativePopulation, populationAtDate } from "../src/population.js";
import type { PopulationEventRow } from "../src/store.js";

const event = (id: string, event_type: PopulationEventRow["event_type"], count: number, date: string): PopulationEventRow => ({
  id, owner_id: "owner", species: "poultry", target_id: "batch", target_name: "Flock",
  event_type, count, date, reason: "", notes: "",
});

describe("event-sourced population calculations and safe migration planning", () => {
  it("applies all same-day event changes together and rejects a negative day-end population", () => {
    const events = [event("a", "death", 24, "2026-01-02"), event("b", "addition", 5, "2026-01-02")];
    assert.equal(populationAtDate(20, events), 1);
    assert.equal(hasNonNegativePopulation(20, events), true);
    assert.equal(hasNonNegativePopulation(20, [events[0]]), false);
  });

  it("dry-run plans only explainable adjustments and flags ambiguous poultry losses", () => {
    const poultry = [{ id: "batch", breed: "Flock", initial_count: 100, current_count: 90 }];
    const livestock = [{ id: "cow", name: "Daisy", status: "deceased" }];
    const events: PopulationEventRow[] = [];
    const dryRun = buildPopulationBackfillPlan({ poultry, livestock, events });
    assert.equal(dryRun.candidates.length, 1);
    assert.equal(dryRun.candidates[0].species, "cattle");
    assert.equal(dryRun.unresolved.length, 1);

    const explicitlyClassified = buildPopulationBackfillPlan({ poultry, livestock, events, poultryLossType: "death" });
    assert.equal(explicitlyClassified.candidates.length, 2);
    assert.ok(explicitlyClassified.candidates.some((item) => item.species === "poultry" && item.eventType === "death" && item.count === 10));
  });

  it("does not propose a duplicate terminal cattle event already reflected in ledger count", () => {
    const sale = { ...event("sale", "sale", 1, "2026-01-02"), species: "cattle" as const, target_id: "cow", target_name: "Daisy" };
    const plan = buildPopulationBackfillPlan({
      poultry: [],
      livestock: [{ id: "cow", name: "Daisy", status: "sold" }],
      events: [sale],
    });
    assert.equal(plan.candidates.length, 0);
    assert.equal(plan.unresolved.length, 0);
  });
});
