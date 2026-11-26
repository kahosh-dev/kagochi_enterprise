import { LIFE_STAGE_CONFIG, type LifeStageConfig } from "../config/lifeStages";

export const FARM_TIMEZONE = "Africa/Nairobi";

export interface ParsedDate {
  year: number;
  month: number;
  day: number;
}

/**
 * Returns current calendar date in Africa/Nairobi timezone as YYYY-MM-DD.
 */
export function getNairobiToday(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: FARM_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Parses YYYY-MM-DD into year, month, day numbers.
 */
export function parseDateParts(dateStr?: string | null): ParsedDate | null {
  if (!dateStr || typeof dateStr !== "string") return null;
  const match = dateStr.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!year || !month || !day || month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

/**
 * Returns the number of days in the given month of a year.
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Number of full days between startDate and endDate.
 */
export function getDaysBetween(startStr: string, endStr: string): number {
  const p1 = parseDateParts(startStr);
  const p2 = parseDateParts(endStr);
  if (!p1 || !p2) return 0;
  const t1 = Date.UTC(p1.year, p1.month - 1, p1.day);
  const t2 = Date.UTC(p2.year, p2.month - 1, p2.day);
  if (t2 < t1) return 0;
  return Math.floor((t2 - t1) / 86_400_000);
}

/**
 * Number of full weeks between startDate and endDate.
 */
export function getWeeksBetween(startStr: string, endStr: string): number {
  return Math.floor(getDaysBetween(startStr, endStr) / 7);
}

/**
 * Calendar months between two dates, accurately respecting month ends and leap years.
 */
export function getCalendarMonthsBetween(startStr: string, endStr: string): number {
  const p1 = parseDateParts(startStr);
  const p2 = parseDateParts(endStr);
  if (!p1 || !p2) return 0;
  if (p2.year < p1.year || (p2.year === p1.year && p2.month < p1.month)) return 0;
  if (p2.year === p1.year && p2.month === p1.month && p2.day < p1.day) return 0;

  let months = (p2.year - p1.year) * 12 + (p2.month - p1.month);
  if (p2.day < p1.day) {
    const endDaysInMonth = getDaysInMonth(p2.year, p2.month);
    if (p2.day === endDaysInMonth && p1.day >= endDaysInMonth) {
      // Month end reached, keep months
    } else {
      months--;
    }
  }
  return Math.max(0, months);
}

/**
 * Converts an "age when registered" into an estimated birth date (YYYY-MM-DD).
 */
export function estimateBirthDateFromAge(
  ageValue: number,
  unit: "days" | "weeks" | "months" | "years",
  asOfDateStr?: string
): string {
  const asOf = asOfDateStr || getNairobiToday();
  const parts = parseDateParts(asOf);
  if (!parts) return asOf;

  if (unit === "days") {
    const d = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
    d.setUTCDate(d.getUTCDate() - Math.round(ageValue));
    return d.toISOString().slice(0, 10);
  }

  if (unit === "weeks") {
    const d = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
    d.setUTCDate(d.getUTCDate() - Math.round(ageValue * 7));
    return d.toISOString().slice(0, 10);
  }

  if (unit === "months") {
    const wholeMonths = Math.floor(ageValue);
    const fracDays = Math.round((ageValue - wholeMonths) * 30.4375);

    let targetYear = parts.year;
    let targetMonth = parts.month - wholeMonths;
    while (targetMonth < 1) {
      targetMonth += 12;
      targetYear -= 1;
    }
    const maxDays = getDaysInMonth(targetYear, targetMonth);
    const targetDay = Math.min(parts.day, maxDays);
    const d = new Date(Date.UTC(targetYear, targetMonth - 1, targetDay));
    if (fracDays > 0) {
      d.setUTCDate(d.getUTCDate() - fracDays);
    }
    return d.toISOString().slice(0, 10);
  }

  if (unit === "years") {
    const wholeYears = Math.floor(ageValue);
    const remainderMonths = Math.round((ageValue - wholeYears) * 12);
    let targetYear = parts.year - wholeYears;
    let targetMonth = parts.month - remainderMonths;
    while (targetMonth < 1) {
      targetMonth += 12;
      targetYear -= 1;
    }
    const maxDays = getDaysInMonth(targetYear, targetMonth);
    const targetDay = Math.min(parts.day, maxDays);
    return new Date(Date.UTC(targetYear, targetMonth - 1, targetDay)).toISOString().slice(0, 10);
  }

  return asOf;
}

export interface FormattedAge {
  formatted: string;
  days: number;
  weeks: number;
  months: number;
  years: number;
  isEstimated: boolean;
  isHistorical: boolean;
  eventContext?: string;
}

/**
 * Formats age for Poultry or Cattle into user-facing readable string:
 * - Poultry: days under 3 weeks, weeks under 6 months (e.g. "5 weeks"), then months
 * - Cattle: days or weeks under 3 months, months under 2 years (e.g. "8 months"), then years and months (e.g. "2 yrs 3 mos")
 * - Sold/dead animals calculate age at event date
 */
export function formatAnimalAge(
  startDateStr?: string | null,
  species: "poultry" | "cattle" = "cattle",
  options: {
    asOfDate?: string | null;
    isEstimated?: boolean;
    eventType?: "sale" | "death" | "deceased" | "sold" | string;
    legacyAgeWeeks?: number;
    legacyAgeYears?: number;
  } = {}
): FormattedAge {
  const asOf = options.asOfDate || getNairobiToday();
  const isEstimated = Boolean(options.isEstimated);
  const isHistorical = Boolean(options.eventType);
  const eventLabel =
    options.eventType === "death" || options.eventType === "deceased"
      ? "at death"
      : options.eventType === "sale" || options.eventType === "sold"
      ? "at sale"
      : undefined;

  let days = 0;
  let weeks = 0;
  let months = 0;
  let years = 0;

  if (startDateStr && parseDateParts(startDateStr)) {
    days = getDaysBetween(startDateStr, asOf);
    weeks = getWeeksBetween(startDateStr, asOf);
    months = getCalendarMonthsBetween(startDateStr, asOf);
    years = Math.floor(months / 12);
  } else if (species === "poultry" && options.legacyAgeWeeks !== undefined) {
    weeks = Math.max(0, options.legacyAgeWeeks);
    days = weeks * 7;
    months = Math.floor(weeks / 4.348);
    years = Math.floor(months / 12);
  } else if (species === "cattle" && options.legacyAgeYears !== undefined) {
    years = Math.floor(options.legacyAgeYears);
    months = Math.floor(options.legacyAgeYears * 12);
    weeks = Math.floor(options.legacyAgeYears * 52.177);
    days = Math.floor(options.legacyAgeYears * 365.25);
  }

  let formatted = "";

  if (species === "poultry") {
    // Poultry: days under 3 weeks (21 days), weeks under 6 months (< 6 months or < 26 weeks), then months
    if (days < 21) {
      formatted = days === 1 ? "1 day" : `${days} days`;
    } else if (months < 6) {
      formatted = weeks === 1 ? "1 week" : `${weeks} weeks`;
    } else {
      formatted = months === 1 ? "1 month" : `${months} months`;
    }
  } else {
    // Cattle: days or weeks under 3 months, months under 2 years (24 months), then years and months ("2 yrs 3 mos")
    if (months < 3) {
      if (days < 14) {
        formatted = days === 1 ? "1 day" : `${days} days`;
      } else {
        formatted = weeks === 1 ? "1 week" : `${weeks} weeks`;
      }
    } else if (months < 24) {
      formatted = `${months} months`;
    } else {
      const remMonths = months % 12;
      formatted = `${years} yrs ${remMonths} mos`;
    }
  }

  if (eventLabel) {
    formatted = `${formatted} (${eventLabel})`;
  }

  return {
    formatted,
    days,
    weeks,
    months,
    years,
    isEstimated,
    isHistorical,
    eventContext: eventLabel,
  };
}

export interface LifeStageInfo {
  id: string;
  name: string;
  tone: "amber" | "green" | "forest" | "blue" | "slate";
  readyForSale?: boolean;
  suggestedPromotion?: string;
}

/**
 * Returns suggested life stage for poultry:
 * chick (0-8 weeks), grower (8-18 weeks), layer (18+ weeks), with broilers marked "ready for sale" around configured age.
 */
export function getPoultryLifeStage(
  hatchDateOrWeeks: string | number,
  purpose: string = "",
  asOfDate?: string,
  config: LifeStageConfig = LIFE_STAGE_CONFIG
): LifeStageInfo {
  const asOf = asOfDate || getNairobiToday();
  const weeks =
    typeof hatchDateOrWeeks === "string"
      ? getWeeksBetween(hatchDateOrWeeks, asOf)
      : hatchDateOrWeeks;

  const isBroiler = /broiler/i.test(purpose);

  if (isBroiler && weeks >= config.poultry.broilerReadyForSaleWeeks) {
    return {
      id: "broiler_ready",
      name: "Ready for sale",
      tone: "green",
      readyForSale: true,
    };
  }

  if (weeks < config.poultry.chickMaxWeeks) {
    return { id: "chick", name: "Chick", tone: "amber" };
  }

  if (weeks < config.poultry.growerMaxWeeks) {
    return { id: "grower", name: "Grower", tone: "slate" };
  }

  return { id: "layer", name: "Layer", tone: "forest" };
}

/**
 * Returns suggested life stage for cattle:
 * calf (0-6 months), weaner/heifer or young bull (6-24 months), cow or bull (24+ months).
 */
export function getCattleLifeStage(
  dateOfBirthOrMonths: string | number,
  sex: string = "female",
  asOfDate?: string,
  config: LifeStageConfig = LIFE_STAGE_CONFIG
): LifeStageInfo {
  const asOf = asOfDate || getNairobiToday();
  const months =
    typeof dateOfBirthOrMonths === "string"
      ? getCalendarMonthsBetween(dateOfBirthOrMonths, asOf)
      : dateOfBirthOrMonths;

  const isMale = sex.toLowerCase() === "male";

  if (months < config.cattle.calfMaxMonths) {
    return { id: "calf", name: "Calf", tone: "amber" };
  }

  if (months < config.cattle.weanerMaxMonths) {
    if (isMale) {
      return { id: "young_bull", name: "Young Bull", tone: "blue" };
    }
    return { id: "heifer", name: "Heifer", tone: "green" };
  }

  if (isMale) {
    return { id: "bull", name: "Bull", tone: "blue" };
  }
  return { id: "cow", name: "Cow", tone: "forest" };
}

/**
 * Sorts two records by age (youngest first or oldest first) using the underlying date.
 * Does NOT sort by formatted text.
 */
export function compareAgeByDate(
  dateA?: string | null,
  dateB?: string | null,
  order: "asc" | "desc" = "asc"
): number {
  const strA = dateA ? dateA.slice(0, 10) : "";
  const strB = dateB ? dateB.slice(0, 10) : "";
  if (!strA && !strB) return 0;
  if (!strA) return 1;
  if (!strB) return -1;
  // If order is asc (youngest first), latest birth date comes first:
  return order === "asc" ? strB.localeCompare(strA) : strA.localeCompare(strB);
}
