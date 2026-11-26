/**
 * Date period tracking utilities for Kagochi Farm Enterprise.
 *
 * Configured specifically for the Africa/Nairobi timezone to prevent
 * timezone/UTC conversion errors that shift farm records to the wrong calendar day.
 */

export const NAIROBI_TIMEZONE = "Africa/Nairobi";
export const DEFAULT_PERIOD: PeriodMode = "today";

export type PeriodMode = "today" | "yesterday" | "week" | "month" | "year" | "custom";

export interface DateRange {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
}

export interface PeriodInfo {
  mode: PeriodMode;
  from: string;
  to: string;
  previousFrom: string;
  previousTo: string;
  label: string;
  sublabel: string;
  offset: number;
  daysCount: number;
}

/**
 * Returns YYYY-MM-DD in Africa/Nairobi timezone.
 */
export function getNairobiDateString(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: NAIROBI_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * Extracts numeric date/time parts for Africa/Nairobi timezone.
 */
export function getNairobiParts(d: Date = new Date()): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: NAIROBI_TIMEZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  }).formatToParts(d);

  const partMap: Record<string, number> = {};
  for (const p of parts) {
    if (p.type !== "literal") {
      partMap[p.type] = Number(p.value);
    }
  }

  return {
    year: partMap.year ?? 2026,
    month: partMap.month ?? 1,
    day: partMap.day ?? 1,
    hour: partMap.hour === 24 ? 0 : (partMap.hour ?? 0),
    minute: partMap.minute ?? 0,
    second: partMap.second ?? 0,
  };
}

/**
 * Returns YYYY-MM-DD for a date object in Africa/Nairobi timezone.
 */
export function getLocalDateString(d: Date = new Date()): string {
  return getNairobiDateString(d);
}

/**
 * Parses YYYY-MM-DD safely into a midday Date object.
 */
export function parseLocalDate(str: string): Date {
  const [year, month, day] = str.slice(0, 10).split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1, 12, 0, 0);
}

/**
 * Adds integer days to a YYYY-MM-DD date string.
 */
export function addDaysToDateStr(dateStr: string, days: number): string {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Calculates start of week (Monday) and end of week (Sunday) for a given date.
 */
export function getWeekBounds(date: Date): { start: Date; end: Date } {
  const dayOfWeek = date.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const start = new Date(date);
  start.setDate(date.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const SHORT_MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Formats a YYYY-MM-DD string into readable farm date (e.g., "Tue, 24 Nov 2026" or "24 Nov 2026").
 */
export function formatDisplayDate(dateStr: string, includeDayOfWeek: boolean = true): string {
  if (!dateStr) return "—";
  const d = parseLocalDate(dateStr);
  const dayName = DAY_NAMES[d.getDay()];
  const day = d.getDate();
  const month = SHORT_MONTH_NAMES[d.getMonth()];
  const year = d.getFullYear();
  return includeDayOfWeek ? `${dayName}, ${day} ${month} ${year}` : `${day} ${month} ${year}`;
}

/**
 * Determines whether Next button can be clicked without going past today.
 */
export function canStepNext(mode: PeriodMode, offset: number): boolean {
  if (mode === "today") return offset < 0;
  if (mode === "yesterday") return offset < 1; // offset 0 is yesterday, +1 goes to today, beyond today is blocked
  if (mode === "week") return offset < 0;
  if (mode === "month") return offset < 0;
  if (mode === "year") return offset < 0;
  return false;
}

/**
 * Computes period information for any given mode, offset, and optional base date.
 */
export function calculatePeriod(
  mode: PeriodMode,
  offset: number = 0,
  customFrom?: string,
  customTo?: string,
  baseTodayStr?: string,
): PeriodInfo {
  const todayStr = baseTodayStr || getNairobiDateString();
  const todayDate = parseLocalDate(todayStr);

  if (mode === "today") {
    const targetDate = new Date(todayDate);
    targetDate.setDate(todayDate.getDate() + offset);
    const targetStr = addDaysToDateStr(todayStr, offset);
    const prevStr = addDaysToDateStr(targetStr, -1);

    let label = formatDisplayDate(targetStr);
    if (offset === 0) label = `Today (${formatDisplayDate(targetStr)})`;
    else if (offset === -1) label = `Yesterday (${formatDisplayDate(targetStr)})`;

    return {
      mode: "today",
      from: targetStr,
      to: targetStr,
      previousFrom: prevStr,
      previousTo: prevStr,
      label,
      sublabel: `Single day (${targetStr})`,
      offset,
      daysCount: 1,
    };
  }

  if (mode === "yesterday") {
    const targetStr = addDaysToDateStr(todayStr, -1 + offset);
    const prevStr = addDaysToDateStr(targetStr, -1);

    let label = formatDisplayDate(targetStr);
    if (offset === 0) label = `Yesterday (${formatDisplayDate(targetStr)})`;
    else if (offset === 1) label = `Today (${formatDisplayDate(targetStr)})`;

    return {
      mode: "yesterday",
      from: targetStr,
      to: targetStr,
      previousFrom: prevStr,
      previousTo: prevStr,
      label,
      sublabel: `Single day (${targetStr})`,
      offset,
      daysCount: 1,
    };
  }

  if (mode === "week") {
    const baseDate = new Date(todayDate);
    baseDate.setDate(todayDate.getDate() + offset * 7);
    const { start, end } = getWeekBounds(baseDate);

    const from = getLocalDateString(start);
    const to = getLocalDateString(end);
    const previousFrom = addDaysToDateStr(from, -7);
    const previousTo = addDaysToDateStr(to, -7);

    const startMonth = SHORT_MONTH_NAMES[start.getMonth()];
    const endMonth = SHORT_MONTH_NAMES[end.getMonth()];
    const rangeText = startMonth === endMonth
      ? `${start.getDate()} – ${end.getDate()} ${startMonth} ${start.getFullYear()}`
      : `${start.getDate()} ${startMonth} – ${end.getDate()} ${endMonth} ${end.getFullYear()}`;

    let label = rangeText;
    if (offset === 0) label = `This Week (${rangeText})`;
    else if (offset === -1) label = `Last Week (${rangeText})`;

    return {
      mode: "week",
      from,
      to,
      previousFrom,
      previousTo,
      label,
      sublabel: "7 days (Monday – Sunday)",
      offset,
      daysCount: 7,
    };
  }

  if (mode === "month") {
    const targetDate = new Date(todayDate.getFullYear(), todayDate.getMonth() + offset, 1, 12);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const from = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const to = `${year}-${String(month + 1).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

    const prevMonthDate = new Date(year, month - 1, 1, 12);
    const prevYear = prevMonthDate.getFullYear();
    const prevMonth = prevMonthDate.getMonth();
    const daysInPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate();
    const previousFrom = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-01`;
    const previousTo = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(daysInPrevMonth).padStart(2, "0")}`;

    const monthName = MONTH_NAMES[month];
    let label = `${monthName} ${year}`;
    if (offset === 0) label = `This Month (${monthName} ${year})`;
    else if (offset === -1) label = `Last Month (${monthName} ${year})`;

    return {
      mode: "month",
      from,
      to,
      previousFrom,
      previousTo,
      label,
      sublabel: `${daysInMonth} days (${monthName})`,
      offset,
      daysCount: daysInMonth,
    };
  }

  if (mode === "year") {
    const targetYear = todayDate.getFullYear() + offset;
    const from = `${targetYear}-01-01`;
    const to = `${targetYear}-12-31`;
    const previousFrom = `${targetYear - 1}-01-01`;
    const previousTo = `${targetYear - 1}-12-31`;

    let label = `Year ${targetYear}`;
    if (offset === 0) label = `This Year (${targetYear})`;
    else if (offset === -1) label = `Last Year (${targetYear})`;

    return {
      mode: "year",
      from,
      to,
      previousFrom,
      previousTo,
      label,
      sublabel: `Full Year (${targetYear})`,
      offset,
      daysCount: (targetYear % 4 === 0 && targetYear % 100 !== 0) || targetYear % 400 === 0 ? 366 : 365,
    };
  }

  // Custom range
  const from = customFrom || addDaysToDateStr(todayStr, -29);
  const to = customTo || todayStr;

  const dFrom = parseLocalDate(from);
  const dTo = parseLocalDate(to);
  const daysDiff = Math.max(1, Math.round((dTo.getTime() - dFrom.getTime()) / 86_400_000) + 1);

  const previousTo = addDaysToDateStr(from, -1);
  const previousFrom = addDaysToDateStr(previousTo, -(daysDiff - 1));

  return {
    mode: "custom",
    from,
    to,
    previousFrom,
    previousTo,
    label: `Custom: ${formatDisplayDate(from, false)} – ${formatDisplayDate(to, false)}`,
    sublabel: `${daysDiff} days inclusive`,
    offset: 0,
    daysCount: daysDiff,
  };
}

/**
 * Checks whether a record's date falls inclusively in the date range.
 */
export function isRecordInDateRange(dateStr: string, from: string, to: string): boolean {
  if (!dateStr) return false;
  const d = dateStr.slice(0, 10);
  return d >= from && d <= to;
}

/**
 * Computes comparative change between current period and previous period.
 */
export function calculateComparison(currentTotal: number, previousTotal: number): {
  diff: number;
  percentChange: number | null;
  direction: "up" | "down" | "flat";
  text: string;
} {
  const diff = currentTotal - previousTotal;
  if (previousTotal <= 0) {
    return {
      diff,
      percentChange: null,
      direction: diff > 0 ? "up" : diff < 0 ? "down" : "flat",
      text: "No previous period data",
    };
  }
  const pct = Math.round(((currentTotal - previousTotal) / previousTotal) * 1000) / 10;
  const direction = pct > 0 ? "up" : pct < 0 ? "down" : "flat";
  const sign = pct > 0 ? "+" : "";
  return {
    diff,
    percentChange: pct,
    direction,
    text: `${sign}${pct}% vs previous period`,
  };
}
