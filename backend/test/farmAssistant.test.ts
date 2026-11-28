import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildAssistantContext, detectFarmIntent } from "../src/farmAssistant.js";

const emptyData = {};

describe("Farm Assistant intent routing", () => {
  it("routes the supported question families", () => {
    assert.equal(detectFarmIntent("Which vaccinations are overdue?"), "vaccinations");
    assert.equal(detectFarmIntent("Did I make a profit today?"), "profit-loss");
    assert.equal(detectFarmIntent("Which expenses were highest?"), "expenses");
    assert.equal(detectFarmIntent("How is egg production trending?"), "production-trends");
    assert.equal(detectFarmIntent("How many cows are alive?"), "survivors");
    assert.equal(detectFarmIntent("How many cows are milking?"), "survivors");
    assert.equal(detectFarmIntent("How much did I spend on feed?"), "feeding-costs");
    assert.equal(detectFarmIntent("What should I check tomorrow?"), "tomorrow-check");
    assert.equal(detectFarmIntent("What could explain lower yields?"), "production-trends");
    assert.equal(detectFarmIntent("Hello assistant"), "general");
  });

  it("answers a factual expense question deterministically using only period data", () => {
    const result = buildAssistantContext({
      intent: "expenses",
      question: "Which expenses were highest?",
      from: "2026-11-28",
      to: "2026-11-28",
      data: {
        expenses: [
          { id: "1", category: "Feed", amount: 2500, date: "2026-11-28" },
          { id: "2", category: "Medicine", amount: 500, date: "2026-11-27" },
        ],
      },
    });
    assert.equal(result.needsAi, false);
    assert.match(result.deterministicAnswer, /KES 2,500/);
    assert.ok(!result.deterministicAnswer.includes("Medicine"));
  });

  it("uses the requested factual empty-period response", () => {
    const result = buildAssistantContext({
      intent: "expenses", question: "What were my expenses?", from: "2026-11-28", to: "2026-11-28", data: emptyData,
    });
    assert.equal(result.deterministicAnswer, "No records found for this period.");
  });
});
