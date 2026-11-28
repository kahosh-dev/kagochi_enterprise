/**
 * Life Stage Configuration for Kagochi Farm Enterprise.
 *
 * Configurable thresholds for poultry and cattle life stages.
 * These thresholds are suggested only and never forcibly change user records.
 */

export interface LifeStageConfig {
  poultry: {
    /** Chick stage: 0 up to chickMaxWeeks (default: 8 weeks) */
    chickMaxWeeks: number;
    /** Grower stage: chickMaxWeeks up to growerMaxWeeks (default: 18 weeks) */
    growerMaxWeeks: number;
    /** Layer stage: growerMaxWeeks and older (default: 18+ weeks) */
    layerMinWeeks: number;
    /** Dual-purpose poultry begins laying around this age (default: 20 weeks). */
    dualPurposePointOfLayWeeks: number;
    /** Broilers: marked 'ready for sale' around this age (default: 6 weeks) */
    broilerReadyForSaleWeeks: number;
  };
  cattle: {
    /** Calf stage: 0 up to calfMaxMonths (default: 6 months) */
    calfMaxMonths: number;
    /** Weaner / Heifer or Young Bull: calfMaxMonths up to weanerMaxMonths (default: 24 months / 2 years) */
    weanerMaxMonths: number;
    /** Cow or Bull: weanerMaxMonths and older (default: 24+ months / 2+ years) */
    adultMinMonths: number;
  };
}

export const LIFE_STAGE_CONFIG: LifeStageConfig = {
  poultry: {
    chickMaxWeeks: 8,
    growerMaxWeeks: 18,
    layerMinWeeks: 18,
    dualPurposePointOfLayWeeks: 20,
    broilerReadyForSaleWeeks: 6,
  },
  cattle: {
    calfMaxMonths: 6,
    weanerMaxMonths: 24,
    adultMinMonths: 24,
  },
};
