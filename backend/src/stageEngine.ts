/**
 * Stage Engine: Single Source of Truth for Production Eligibility
 * 
 * Derives life stage and production eligibility from age, sex, breed type, purpose and events.
 * Used by both backend validation and frontend UI to ensure consistency.
 */

import { LIFE_STAGE_CONFIG, type LifeStageConfig } from "./lifeStages.js";
import { getWeeksBetween, getCalendarMonthsBetween, getNairobiToday } from "./age.js";

/* =====================================================
   POULTRY STAGE & ELIGIBILITY
   ===================================================== */

export type PoultryType = "layer" | "broiler" | "dual-purpose";
export type PoultryStage = "chick" | "grower" | "layer" | "broiler_starter" | "broiler_grower" | "broiler_finisher" | "broiler_ready";

export interface PoultryStageResult {
  stage: PoultryStage;
  stageLabel: string;
  canRecordEggs: boolean;
  canRecordMeat: boolean;
  tone: "amber" | "green" | "forest" | "blue" | "slate";
  nextStageInfo?: string;
  disabledReason?: string;
}

/**
 * Determines poultry type from purpose string
 */
export function classifyPoultryType(purpose: string): PoultryType {
  const p = purpose.toLowerCase();
  if (p.includes("broiler") || p.includes("meat production")) return "broiler";
  if (p.includes("layer") || p.includes("egg production")) return "layer";
  // Dual-purpose: Kienyeji, Kuroiler, Improved Kienyeji, "Eggs & Meat"
  if (p.includes("dual") || p.includes("kienyeji") || p.includes("kuroiler") || p.includes("eggs & meat") || p.includes("eggs and meat")) {
    return "dual-purpose";
  }
  // Default to dual-purpose for unknown
  return "dual-purpose";
}

/**
 * Computes stage and eligibility for a poultry batch
 */
export function computePoultryStage(
  hatchDate: string | null | undefined,
  purpose: string,
  breed: string,
  status?: string,
  asOfDate?: string,
  config: LifeStageConfig = LIFE_STAGE_CONFIG
): PoultryStageResult {
  const asOf = asOfDate || getNairobiToday();
  
  // If sold or dead, no production allowed
  if (status === "sold" || status === "deceased" || status === "dead") {
    return {
      stage: "chick",
      stageLabel: status === "sold" ? "Sold" : "Deceased",
      canRecordEggs: false,
      canRecordMeat: false,
      tone: "slate",
      disabledReason: `Batch is ${status}`
    };
  }

  if (!hatchDate) {
    return {
      stage: "chick",
      stageLabel: "Unknown age",
      canRecordEggs: false,
      canRecordMeat: false,
      tone: "amber",
      disabledReason: "Hatch date missing"
    };
  }

  const weeks = getWeeksBetween(hatchDate, asOf);
  const birdType = classifyPoultryType(purpose);

  // BROILER track: Starter -> Grower -> Finisher -> Ready for Sale
  if (birdType === "broiler") {
    if (weeks < 3) {
      return {
        stage: "broiler_starter",
        stageLabel: "Starter",
        canRecordEggs: false,
        canRecordMeat: false,
        tone: "amber",
        nextStageInfo: `Grower stage at week 3`
      };
    }
    if (weeks < 5) {
      return {
        stage: "broiler_grower",
        stageLabel: "Grower",
        canRecordEggs: false,
        canRecordMeat: false,
        tone: "slate",
        nextStageInfo: `Finisher stage at week 5`
      };
    }
    if (weeks < config.poultry.broilerReadyForSaleWeeks) {
      return {
        stage: "broiler_finisher",
        stageLabel: "Finisher",
        canRecordEggs: false,
        canRecordMeat: true,
        tone: "blue",
        nextStageInfo: `Ready for harvest at week ${config.poultry.broilerReadyForSaleWeeks}`
      };
    }
    return {
      stage: "broiler_ready",
      stageLabel: "Ready for Sale",
      canRecordEggs: false,
      canRecordMeat: true,
      tone: "green"
    };
  }

  // LAYER & DUAL-PURPOSE track: Chick -> Grower -> Layer
  const pointOfLay = birdType === "dual-purpose" ? 20 : config.poultry.growerMaxWeeks; // 20 weeks for dual-purpose, 18 for layers

  if (weeks < config.poultry.chickMaxWeeks) {
    return {
      stage: "chick",
      stageLabel: "Chick",
      canRecordEggs: false,
      canRecordMeat: false,
      tone: "amber",
      nextStageInfo: `Grower stage at week ${config.poultry.chickMaxWeeks}`
    };
  }

  if (weeks < pointOfLay) {
    return {
      stage: "grower",
      stageLabel: "Grower",
      canRecordEggs: false,
      canRecordMeat: false,
      tone: "slate",
      nextStageInfo: `Eggs from week ${pointOfLay}`
    };
  }

  // Adult laying stage
  return {
    stage: "layer",
    stageLabel: birdType === "layer" ? "Layer" : "Adult",
    canRecordEggs: true,
    canRecordMeat: birdType === "dual-purpose", // Dual-purpose can also be harvested for meat
    tone: "forest"
  };
}

/* =====================================================
   CATTLE STAGE & ELIGIBILITY
   ===================================================== */

export type CattleStage = "calf" | "heifer" | "cow" | "young_bull" | "bull" | "steer";

export interface CattleStageResult {
  stage: CattleStage;
  stageLabel: string;
  canRecordMilk: boolean;
  canRecordCalving: boolean;
  tone: "amber" | "green" | "forest" | "blue" | "slate";
  nextStageInfo?: string;
  disabledReason?: string;
}

/**
 * Computes stage and eligibility for a cattle animal
 */
export function computeCattleStage(
  dateOfBirth: string | null | undefined,
  sex: string,
  hasCalved: boolean = false,
  status?: string,
  asOfDate?: string,
  config: LifeStageConfig = LIFE_STAGE_CONFIG
): CattleStageResult {
  const asOf = asOfDate || getNairobiToday();
  const isMale = sex?.toLowerCase() === "male";

  // If sold or dead, no production allowed
  if (status === "sold" || status === "deceased" || status === "transferred") {
    return {
      stage: isMale ? "bull" : "cow",
      stageLabel: status === "sold" ? "Sold" : status === "transferred" ? "Transferred" : "Deceased",
      canRecordMilk: false,
      canRecordCalving: false,
      tone: "slate",
      disabledReason: `Animal is ${status}`
    };
  }

  if (!dateOfBirth) {
    return {
      stage: isMale ? "bull" : "cow",
      stageLabel: "Unknown age",
      canRecordMilk: false,
      canRecordCalving: false,
      tone: "amber",
      disabledReason: "Birth date missing"
    };
  }

  const months = getCalendarMonthsBetween(dateOfBirth, asOf);

  // CALF stage (0-12 months)
  if (months < config.cattle.calfMaxMonths) {
    return {
      stage: "calf",
      stageLabel: "Calf",
      canRecordMilk: false,
      canRecordCalving: false,
      tone: "amber",
      nextStageInfo: isMale 
        ? `Young Bull at ${config.cattle.calfMaxMonths} months`
        : `Heifer at ${config.cattle.calfMaxMonths} months`,
      disabledReason: "Too young"
    };
  }

  // MALE track
  if (isMale) {
    // Young Bull (12-24 months)
    if (months < config.cattle.weanerMaxMonths) {
      return {
        stage: "young_bull",
        stageLabel: "Young Bull",
        canRecordMilk: false,
        canRecordCalving: false,
        tone: "blue",
        nextStageInfo: `Bull at ${config.cattle.weanerMaxMonths} months`,
        disabledReason: "Bulls do not produce milk"
      };
    }
    // Bull (24+ months)
    return {
      stage: "bull",
      stageLabel: "Bull",
      canRecordMilk: false,
      canRecordCalving: false,
      tone: "blue",
      disabledReason: "Bulls do not produce milk"
    };
  }

  // FEMALE track
  // Heifer becomes Cow on first calving
  if (hasCalved) {
    return {
      stage: "cow",
      stageLabel: "Cow",
      canRecordMilk: true,
      canRecordCalving: true,
      tone: "forest"
    };
  }

  // Heifer (12 months until first calving)
  if (months < config.cattle.weanerMaxMonths) {
    return {
      stage: "heifer",
      stageLabel: "Heifer",
      canRecordMilk: false,
      canRecordCalving: true,
      tone: "green",
      nextStageInfo: `Milk starts after first calving`,
      disabledReason: "Has not calved yet"
    };
  }

  // Heifer 24+ months (should have calved by now, but allow manual calving record)
  return {
    stage: "heifer",
    stageLabel: "Heifer",
    canRecordMilk: false,
    canRecordCalving: true,
    tone: "green",
    nextStageInfo: `Auto-promote to Cow after calving (or at ${config.cattle.weanerMaxMonths + 6} months if configured)`,
    disabledReason: "Has not calved yet"
  };
}

/* =====================================================
   VALIDATION HELPERS
   ===================================================== */

/**
 * Validates if a poultry batch can record egg production
 */
export function canBatchRecordEggs(
  hatchDate: string | null | undefined,
  purpose: string,
  breed: string,
  status?: string
): { allowed: boolean; reason?: string } {
  const result = computePoultryStage(hatchDate, purpose, breed, status);
  if (!result.canRecordEggs) {
    return {
      allowed: false,
      reason: result.disabledReason || `${result.stageLabel} stage cannot record eggs. ${result.nextStageInfo || ""}`
    };
  }
  return { allowed: true };
}

/**
 * Validates if a poultry batch can record meat production
 */
export function canBatchRecordMeat(
  hatchDate: string | null | undefined,
  purpose: string,
  breed: string,
  status?: string
): { allowed: boolean; reason?: string } {
  const result = computePoultryStage(hatchDate, purpose, breed, status);
  if (!result.canRecordMeat) {
    return {
      allowed: false,
      reason: result.disabledReason || `${result.stageLabel} stage cannot record meat production. ${result.nextStageInfo || ""}`
    };
  }
  return { allowed: true };
}

/**
 * Validates if a cattle animal can record milk production
 */
export function canAnimalRecordMilk(
  dateOfBirth: string | null | undefined,
  sex: string,
  hasCalved: boolean = false,
  status?: string
): { allowed: boolean; reason?: string } {
  const result = computeCattleStage(dateOfBirth, sex, hasCalved, status);
  if (!result.canRecordMilk) {
    return {
      allowed: false,
      reason: result.disabledReason || `${result.stageLabel} cannot produce milk. ${result.nextStageInfo || ""}`
    };
  }
  return { allowed: true };
}

/**
 * Validates if a cattle animal can record calving event
 */
export function canAnimalRecordCalving(
  dateOfBirth: string | null | undefined,
  sex: string,
  hasCalved: boolean = false,
  status?: string
): { allowed: boolean; reason?: string } {
  const isMale = sex?.toLowerCase() === "male";
  if (isMale) {
    return { allowed: false, reason: "Male animals cannot calve" };
  }
  
  const result = computeCattleStage(dateOfBirth, sex, hasCalved, status);
  if (!result.canRecordCalving) {
    return {
      allowed: false,
      reason: result.disabledReason || `${result.stageLabel} cannot record calving. ${result.nextStageInfo || ""}`
    };
  }
  return { allowed: true };
}
