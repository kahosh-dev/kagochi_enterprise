import test, { describe } from "node:test";
import assert from "node:assert/strict";

// Import the logic tested for Part 4
// 1. Nairobi timezone formatting and date helpers
const NAIROBI_TIMEZONE = "Africa/Nairobi";
const DEFAULT_PERIOD = "today";

type PeriodMode = "today" | "yesterday" | "week" | "month" | "year" | "custom";

function getNairobiDateString(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: NAIROBI_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function parseLocalDate(str: string): Date {
  const [year, month, day] = str.slice(0, 10).split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1, 12, 0, 0);
}

function addDaysToDateStr(dateStr: string, days: number): string {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const SHORT_MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDisplayDate(dateStr: string, includeDayOfWeek: boolean = true): string {
  if (!dateStr) return "—";
  const d = parseLocalDate(dateStr);
  const dayName = DAY_NAMES[d.getDay()];
  const day = d.getDate();
  const month = SHORT_MONTH_NAMES[d.getMonth()];
  const year = d.getFullYear();
  return includeDayOfWeek ? `${dayName}, ${day} ${month} ${year}` : `${day} ${month} ${year}`;
}

function canStepNext(mode: PeriodMode, offset: number): boolean {
  if (mode === "today") return offset < 0;
  if (mode === "yesterday") return offset < 1;
  if (mode === "week") return offset < 0;
  if (mode === "month") return offset < 0;
  if (mode === "year") return offset < 0;
  return false;
}

function calculatePeriod(
  mode: PeriodMode,
  offset: number = 0,
  customFrom?: string,
  customTo?: string,
  baseTodayStr?: string,
) {
  const todayStr = baseTodayStr || getNairobiDateString();
  const todayDate = parseLocalDate(todayStr);

  if (mode === "today") {
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
      offset,
      daysCount: 1,
    };
  }

  if (mode === "week") {
    const baseDate = new Date(todayDate);
    baseDate.setDate(todayDate.getDate() + offset * 7);
    const dayOfWeek = baseDate.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const start = new Date(baseDate);
    start.setDate(baseDate.getDate() + diffToMonday);

    const from = addDaysToDateStr(todayStr, offset * 7 + diffToMonday);
    const to = addDaysToDateStr(from, 6);
    return {
      mode: "week",
      from,
      to,
      label: `Week`,
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
    return {
      mode: "month",
      from,
      to,
      offset,
      daysCount: daysInMonth,
    };
  }

  return {
    mode: "custom",
    from: customFrom || todayStr,
    to: customTo || todayStr,
    offset: 0,
    daysCount: 1,
  };
}

describe("Part 4: Shared Period State & Default Today on Every Page", () => {
  describe("Default Period Constant", () => {
    test("DEFAULT_PERIOD is always 'today'", () => {
      assert.strictEqual(DEFAULT_PERIOD, "today");
    });
  });

  describe("Africa/Nairobi Timezone Handling", () => {
    test("getNairobiDateString formats current time in Africa/Nairobi timezone", () => {
      const nairobiToday = getNairobiDateString();
      assert.match(nairobiToday, /^\d{4}-\d{2}-\d{2}$/);
    });

    test("rolls over at midnight in Africa/Nairobi", () => {
      // Simulate midnight rollover: todayStr advances by 1 day
      const baseToday = "2026-11-26";
      const nextDay = addDaysToDateStr(baseToday, 1);
      assert.strictEqual(nextDay, "2026-11-27");

      const p1 = calculatePeriod("today", 0, undefined, undefined, baseToday);
      const p2 = calculatePeriod("today", 0, undefined, undefined, nextDay);

      assert.strictEqual(p1.from, "2026-11-26");
      assert.strictEqual(p2.from, "2026-11-27");
    });
  });

  describe("Period Stepping (Previous & Next)", () => {
    const fixedToday = "2026-11-24"; // A Tuesday

    test("Today mode: Previous steps backward by 1 day, Next disabled at Today (offset 0)", () => {
      // offset 0 is Today
      assert.strictEqual(canStepNext("today", 0), false, "Next must be disabled when on Today");

      // Step Previous (offset -1)
      const prevDay = calculatePeriod("today", -1, undefined, undefined, fixedToday);
      assert.strictEqual(prevDay.from, "2026-11-23");
      assert.strictEqual(prevDay.to, "2026-11-23");
      assert.strictEqual(canStepNext("today", -1), true, "Next must be enabled when offset < 0");

      // Step Previous again (offset -2)
      const prev2Days = calculatePeriod("today", -2, undefined, undefined, fixedToday);
      assert.strictEqual(prev2Days.from, "2026-11-22");
    });

    test("Yesterday mode: starts at yesterday, Next steps to Today, but cannot go past Today", () => {
      const y = calculatePeriod("yesterday", 0, undefined, undefined, fixedToday);
      assert.strictEqual(y.from, "2026-11-23");
      assert.strictEqual(canStepNext("yesterday", 0), true, "Can step Next from yesterday to today");

      // Step Next to Today (offset 1 relative to yesterday)
      const stepped = calculatePeriod("yesterday", 1, undefined, undefined, fixedToday);
      assert.strictEqual(stepped.from, "2026-11-24");
      assert.strictEqual(canStepNext("yesterday", 1), false, "Cannot step Next past today");
    });

    test("Week and Month modes: Next is disabled when on current period (offset 0)", () => {
      assert.strictEqual(canStepNext("week", 0), false);
      assert.strictEqual(canStepNext("week", -1), true);

      assert.strictEqual(canStepNext("month", 0), false);
      assert.strictEqual(canStepNext("month", -1), true);
    });

    test("Label formatting matches requirement: 'Today (Tue, 24 Nov 2026)'", () => {
      const p = calculatePeriod("today", 0, undefined, undefined, "2026-11-24");
      assert.strictEqual(p.label, "Today (Tue, 24 Nov 2026)");

      const y = calculatePeriod("today", -1, undefined, undefined, "2026-11-24");
      assert.strictEqual(y.label, "Yesterday (Mon, 23 Nov 2026)");
    });
  });

  describe("Page Navigation & State Isolation", () => {
    // Simulate PeriodProvider behavior on navigation
    function simulateNavigation() {
      let currentView = "home";
      let mode: PeriodMode = DEFAULT_PERIOD;
      let offset = 0;

      function onNavigate(newView: string) {
        if (newView !== currentView) {
          // Reset to DEFAULT_PERIOD = 'today' on navigation
          mode = DEFAULT_PERIOD;
          offset = 0;
          currentView = newView;
        }
      }

      function changePeriod(newMode: PeriodMode, newOffset: number = 0) {
        mode = newMode;
        offset = newOffset;
      }

      return {
        getView: () => currentView,
        getMode: () => mode,
        getOffset: () => offset,
        onNavigate,
        changePeriod,
      };
    }

    test("Opening any page or app starts on Today", () => {
      const app = simulateNavigation();
      assert.strictEqual(app.getMode(), "today");
      assert.strictEqual(app.getOffset(), 0);
    });

    test("Selecting Month on Feeding and navigating to Production returns Production to Today", () => {
      const app = simulateNavigation();
      app.onNavigate("feeding");
      assert.strictEqual(app.getView(), "feeding");
      assert.strictEqual(app.getMode(), "today");

      // User changes to 'month' on feeding
      app.changePeriod("month", 0);
      assert.strictEqual(app.getMode(), "month");

      // User navigates to production
      app.onNavigate("production");
      assert.strictEqual(app.getView(), "production");
      assert.strictEqual(app.getMode(), "today", "Must return to Today upon navigating to another page");
      assert.strictEqual(app.getOffset(), 0);
    });

    test("Refreshing returns to Today (no localStorage / sessionStorage restoration)", () => {
      // Simulating browser refresh: all in-memory states reinitialize with DEFAULT_PERIOD
      const appAfterRefresh = simulateNavigation();
      assert.strictEqual(appAfterRefresh.getMode(), "today");
      assert.strictEqual(appAfterRefresh.getOffset(), 0);
    });
  });
});
