import type { RecordRow } from "./store.js";

export type FarmIntent =
  | "vaccinations"
  | "profit-loss"
  | "expenses"
  | "production-trends"
  | "mortality"
  | "survivors"
  | "feeding-costs"
  | "tomorrow-check"
  | "general";

export interface AssistantContext {
  intent: FarmIntent;
  period: { from: string; to: string };
  summary: Record<string, unknown>;
  deterministicAnswer: string;
  needsAi: boolean;
}

export function detectFarmIntent(question: string): FarmIntent {
  const q = question.toLowerCase();
  if (/vaccin|vaccine|immuni/.test(q)) return "vaccinations";
  if (/profit|loss|income|revenue|earn/.test(q)) return "profit-loss";
  if (/expense|spend|cost/.test(q) && /feed|feeding|fodder|ration/.test(q)) return "feeding-costs";
  if (/expense|spend|cost/.test(q)) return "expenses";
  if (/mortality|death|died|dead|surviv|losses/.test(q)) return "mortality";
  if (/(how many|count|number of|alive|population|milking).*(cows?|cattle|animals?|birds?|chickens?|hens?|poultry|flock)|(?:cows?|cattle|animals?|birds?|chickens?|hens?|poultry|flock).*(how many|count|number of|alive|population|milking)/.test(q)) return "survivors";
  if (/production|produce|eggs|milk|trend|yield/.test(q)) return "production-trends";
  if (/feed|feeding|fodder|ration/.test(q)) return "feeding-costs";
  if (/tomorrow|check tomorrow|what to check/.test(q)) return "tomorrow-check";
  if (/how many|count|number of|alive|population|birds|chickens|cattle|cows|animals|poultry|flock/.test(q)) return "survivors";
  return "general";
}

function number(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: number): string {
  return `KES ${value.toLocaleString("en-KE", { maximumFractionDigits: 2 })}`;
}

function sum(rows: RecordRow[], field: string): number {
  return rows.reduce((total, row) => total + number(row[field]), 0);
}

function sumBy(rows: RecordRow[], key: string, value: string): Array<{ name: string; total: number }> {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const name = String(row[key] ?? "Unspecified").trim() || "Unspecified";
    totals.set(name, (totals.get(name) ?? 0) + number(row[value]));
  }
  return [...totals.entries()]
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
}

function periodRecords(rows: RecordRow[], dateField: string, from: string, to: string): RecordRow[] {
  return rows.filter((row) => {
    const day = String(row[dateField] ?? "").slice(0, 10);
    return day >= from && day <= to;
  });
}

export function buildAssistantContext(input: {
  intent: FarmIntent;
  question: string;
  from: string;
  to: string;
  data: Partial<Record<"poultry" | "livestock" | "production" | "feeding" | "expenses" | "income" | "vaccinations", RecordRow[]>>;
  deathsAndSales?: Array<{ event_type: string; count: number; date: string }>;
}): AssistantContext {
  const { intent, question, from, to, data } = input;
  const context: Record<string, unknown> = { period: { from, to } };
  let deterministicAnswer = "No records found for this period.";
  const expenses = data.expenses ?? [];
  const income = data.income ?? [];
  const feeding = data.feeding ?? [];
  const production = data.production ?? [];
  const vaccinations = data.vaccinations ?? [];
  const poultry = data.poultry ?? [];
  const livestock = data.livestock ?? [];
  let needsAi = false;

  if (intent === "vaccinations") {
    const relevant = vaccinations.filter((row) => {
      const status = String(row.status ?? "").toLowerCase();
      return !["administered", "completed", "done"].includes(status) && String(row.date_due ?? "") <= to;
    });
    const overdue = relevant.filter((row) => String(row.date_due ?? "").slice(0, 10) < to);
    const dueToday = relevant.filter((row) => String(row.date_due ?? "").slice(0, 10) === to);
    context.vaccinations = {
      overdue: overdue.slice(0, 5).map((row) => ({ name: row.vaccine_name, target: row.target_name, due: row.date_due })),
      dueToday: dueToday.slice(0, 5).map((row) => ({ name: row.vaccine_name, target: row.target_name, due: row.date_due })),
      overdueCount: overdue.length,
      dueTodayCount: dueToday.length,
    };
    const names = [...overdue, ...dueToday].slice(0, 5).map((row) => `${String(row.vaccine_name || "Vaccination")} for ${String(row.target_name || "farm stock")}${String(row.date_due ?? "").slice(0, 10) < to ? ` (overdue since ${String(row.date_due).slice(0, 10)})` : " (due today)"}`);
    deterministicAnswer = names.length ? `${overdue.length} overdue and ${dueToday.length} due today.\n${names.map((name) => `- ${name}`).join("\n")}` : "No vaccinations are due today or overdue.";
  } else if (intent === "profit-loss") {
    const periodIncome = periodRecords(income, "date", from, to);
    const periodExpenses = periodRecords(expenses, "date", from, to);
    const incomeTotal = sum(periodIncome, "amount");
    const expenseTotal = sum(periodExpenses, "amount");
    const profit = incomeTotal - expenseTotal;
    context.financial = { income: incomeTotal, expenses: expenseTotal, profitOrLoss: profit };
    deterministicAnswer = periodIncome.length || periodExpenses.length
      ? `Income: ${money(incomeTotal)}. Expenses: ${money(expenseTotal)}. ${profit >= 0 ? "Profit" : "Loss"}: ${money(Math.abs(profit))}.`
      : "No records found for this period.";
  } else if (intent === "expenses") {
    const rows = periodRecords(expenses, "date", from, to);
    const top = sumBy(rows, "category", "amount");
    context.expenses = { total: sum(rows, "amount"), count: rows.length, highest: top };
    deterministicAnswer = rows.length
      ? `Total expenses: ${money(sum(rows, "amount"))}. Highest categories:\n${top.map((item) => `- ${item.name}: ${money(item.total)}`).join("\n")}`
      : "No records found for this period.";
  } else if (intent === "feeding-costs") {
    const rows = periodRecords(feeding, "date", from, to);
    const top = sumBy(rows, "feed_type", "cost");
    context.feeding = { totalCost: sum(rows, "cost"), records: rows.length, topFeedTypes: top };
    deterministicAnswer = rows.length
      ? `Feeding cost: ${money(sum(rows, "cost"))} across ${rows.length} record(s). Highest feed costs:\n${top.map((item) => `- ${item.name}: ${money(item.total)}`).join("\n")}`
      : "No records found for this period.";
  } else if (intent === "survivors" || intent === "mortality") {
    const poultryCount = poultry.reduce((total, row) => total + number(row.current_count), 0);
    const activeLivestock = livestock.filter((row) => String(row.status ?? "active").toLowerCase() === "active");
    const livestockCount = activeLivestock.length;
    const milkingCows = activeLivestock.filter((row) => String(row.sex ?? "").toLowerCase() === "female" && number(row.has_calved) === 1).length;
    const events = (input.deathsAndSales ?? []).filter((event) => event.date >= from && event.date <= to);
    const deaths = events.filter((event) => event.event_type === "death").reduce((total, event) => total + number(event.count), 0);
    const sales = events.filter((event) => event.event_type === "sale").reduce((total, event) => total + number(event.count), 0);
    context.population = { currentPoultry: poultryCount, currentLivestock: livestockCount, milkingCowsWithRecordedCalving: milkingCows, deathsInPeriod: deaths, salesInPeriod: sales };
    const livestockQuestion = /cow|cattle|bull|heifer|calf/i.test(question);
    deterministicAnswer = intent === "mortality"
      ? events.length ? `Deaths recorded: ${deaths}. Sales recorded: ${sales}.` : "No records found for this period."
      : /milking|milk/i.test(question) && livestockQuestion
        ? `Cows with a recorded calving: ${milkingCows}.`
        : `Current poultry: ${poultryCount}. Active livestock: ${livestockCount}.`;
  } else if (intent === "production-trends") {
    const rows = periodRecords(production, "date", from, to);
    const groupedTotals = new Map<string, number>();
    const dailyTotals = new Map<string, number>();
    for (const row of rows) {
      const type = String(row.type ?? "Unspecified");
      const unit = String(row.unit ?? "unit(s)");
      const group = `${type} (${unit})`;
      groupedTotals.set(group, (groupedTotals.get(group) ?? 0) + number(row.quantity));
      const day = String(row.date ?? "").slice(0, 10);
      const dailyKey = `${day}|${group}`;
      dailyTotals.set(dailyKey, (dailyTotals.get(dailyKey) ?? 0) + number(row.quantity));
    }
    const totals = [...groupedTotals.entries()].map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total).slice(0, 5);
    const daily = [...dailyTotals.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-15).map(([key, quantity]) => {
      const [date, label] = key.split("|");
      return { date, typeAndUnit: label, quantity };
    });
    context.production = { recordCount: rows.length, totalsByTypeAndUnit: totals, dailyTrend: daily };
    deterministicAnswer = rows.length
      ? `Production totals: ${totals.map((item) => `${item.name}: ${item.total}`).join("; ")}. ${rows.length} record(s) in this period.`
      : "No records found for this period.";
    needsAi = true;
  } else if (intent === "tomorrow-check") {
    const rows = periodRecords(feeding, "date", from, to);
    const due = vaccinations.filter((row) => String(row.date_due ?? "").slice(0, 10) <= to && !["administered", "completed", "done"].includes(String(row.status ?? "").toLowerCase()));
    context.tomorrowChecks = { dueVaccinations: due.slice(0, 5).map((row) => ({ name: row.vaccine_name, target: row.target_name, due: row.date_due })), feedingRecords: rows.length };
    deterministicAnswer = due.length ? `${due.length} vaccination(s) need attention by ${to}.` : `No vaccinations are due by ${to}.`;
    needsAi = true;
  } else {
    const periodIncome = periodRecords(income, "date", from, to);
    const periodExpenses = periodRecords(expenses, "date", from, to);
    const periodProduction = periodRecords(production, "date", from, to);
    const periodFeeding = periodRecords(feeding, "date", from, to);
    const currentPoultry = poultry.reduce((total, row) => total + number(row.current_count), 0);
    const currentLivestock = livestock.filter((row) => String(row.status ?? "active").toLowerCase() === "active").length;
    const totalIncome = sum(periodIncome, "amount");
    const totalExpenses = sum(periodExpenses, "amount");
    const totalFeedCost = sum(periodFeeding, "cost");
    context.general = {
      income: totalIncome, expenses: totalExpenses,
      production: sumBy(periodProduction, "type", "quantity"), feedCost: totalFeedCost,
      poultry: currentPoultry, livestock: currentLivestock,
    };
    const facts: string[] = [];
    if (periodIncome.length) facts.push(`Income: ${money(totalIncome)}`);
    if (periodExpenses.length) facts.push(`Expenses: ${money(totalExpenses)}`);
    if (periodProduction.length) facts.push(`Production records: ${periodProduction.length}`);
    if (periodFeeding.length) facts.push(`Feed cost: ${money(totalFeedCost)}`);
    if (poultry.length || livestock.length) facts.push(`Current population: ${currentPoultry} poultry and ${currentLivestock} livestock`);
    deterministicAnswer = facts.length ? `${facts.join(". ")}.` : "No records found for this period.";
    needsAi = true;
  }

  const questionNeedsExplanation = /\b(why|how can|improv|recommend|explain|advice|should i|trend|compare|cause)\b/i.test(question);
  if (questionNeedsExplanation) needsAi = true;
  return { intent, period: { from, to }, summary: context, deterministicAnswer, needsAi };
}
