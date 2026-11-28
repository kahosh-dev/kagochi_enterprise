import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeCattleStage, computePoultryStage } from "../src/stageEngine.js";
import { LIFE_STAGE_CONFIG } from "../src/lifeStages.js";

describe("shared stage and production eligibility engine", () => {
  it("derives configurable egg eligibility from date and poultry purpose", () => {
    const belowThreshold = computePoultryStage("2026-01-01", "Layers", "Leghorn", undefined, "2026-05-05");
    const atThreshold = computePoultryStage("2026-01-01", "Layers", "Leghorn", undefined, "2026-05-07");
    assert.equal(belowThreshold.canRecordEggs, false);
    assert.equal(atThreshold.canRecordEggs, true);

    const custom = {
      ...LIFE_STAGE_CONFIG,
      poultry: { ...LIFE_STAGE_CONFIG.poultry, growerMaxWeeks: 15 },
    };
    const configured = computePoultryStage("2026-01-01", "Layers", "Leghorn", undefined, "2026-04-23", custom);
    assert.equal(configured.canRecordEggs, true);
  });

  it("blocks production when a poultry batch has no surviving birds", () => {
    const result = computePoultryStage("2025-01-01", "Layers", "Leghorn", undefined, "2026-01-01", undefined, 0);
    assert.equal(result.canRecordEggs, false);
    assert.equal(result.canRecordMeat, false);
    assert.equal(result.disabledReason, "No birds remain in this batch");
  });

  it("restricts milk production to eligible female cattle and active status", () => {
    assert.equal(computeCattleStage("2025-01-01", "female", false, "active", "2026-01-01").canRecordMilk, false);
    assert.equal(computeCattleStage("2025-01-01", "female", true, "active", "2026-01-01").canRecordMilk, true);
    assert.equal(computeCattleStage("2025-01-01", "male", true, "active", "2026-01-01").canRecordMilk, false);
    assert.equal(computeCattleStage("2025-01-01", "female", true, "sold", "2026-01-01").canRecordMilk, false);
  });
});
