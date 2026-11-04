/*
 * Farm analytics and rule-based decision support.
 *
 * Pure functions (no database access) so they can be tested with worked
 * examples. Design rules:
 *  - Units are never added together. The only conversion applied is the exact
 *    one 1000 g = 1 kg. Bags, litres, pieces and trays stay separate.
 *  - Every figure belongs to an explicit date period (from..to, inclusive).
 *  - Divisions return null instead of dividing by zero.
 *  - Records with invalid dates or quantities are excluded and counted.
 */

export type Row = Record<string, unknown>;

export interface FarmRecords {
  poultry: Row[];
  livestock: Row[];
  production: Row[];
  feeding: Row[];
  expenses: Row[];
  income?: Row[];
  vaccinations?: Row[];
  vaccination_schedules?: Row[];
}

export interface Period {
  from: string;
  to: string;
  days: number;
}

/* Configurable thresholds for the IF-THEN rules. They are management
 * prompts chosen for this project, not biological standards. */
export const DEFAULT_THRESHOLDS = {
  /** Flag a poultry batch when (initial - current) / initial is at least this %. */
  birdLossPercent: 5,
  /** Flag when production falls by at least this % compared with the previous period. */
  productionDropPercent: 20,
  /** Flag when expenses rise by at least this % compared with the previous period. */
  expenseIncreasePercent: 25,
  /** Flag when layer batches exist but no egg record exists in this many recent days. */
  missingEggRecordDays: 3,
};
export type Thresholds = typeof DEFAULT_THRESHOLDS;

const DAY_MS = 86_400_000;

export function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Returns YYYY-MM-DD, or null when the value is not a valid date. */
export function toDay(value: unknown): string | null {
  const day = String(value ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const parsed = new Date(`${day}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === day ? day : null;
}

export function addDays(day: string, amount: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + amount * DAY_MS).toISOString().slice(0, 10);
}

/** A period of `days` days ending on `to` (inclusive). */
export function makePeriod(to: string, days: number): Period {
  return { from: addDays(to, -(days - 1)), to, days };
}

/** A custom date range period from `from` to `to` (inclusive). */
export function makeCustomPeriod(from: string, to: string): Period {
  const fromMs = Date.parse(`${from}T00:00:00Z`);
  const toMs = Date.parse(`${to}T00:00:00Z`);
  const days = Math.max(1, Math.round((toMs - fromMs) / DAY_MS) + 1);
  return { from, to, days };
}

/** The period of the same length immediately before `period`. */
export function previousPeriod(period: Period): Period {
  return makePeriod(addDays(period.from, -1), period.days);
}

function inPeriod(day: string | null, period: Period): day is string {
  return day !== null && day >= period.from && day <= period.to;
}

/** Percentage change, or null when there is no previous value to compare with. */
export function percentChange(current: number, previous: number): number | null {
  if (!(previous > 0)) return null;
  return round(((current - previous) / previous) * 100, 1);
}

function positiveNumber(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function label(value: unknown): string {
  return String(value ?? "").trim() || "Unspecified";
}

function key(value: unknown): string {
  return label(value).toLowerCase().replace(/\s+/g, " ");
}

/* ------------------------------------------------------------------ */

interface CleanRow {
  day: string;
  quantity: number;
  row: Row;
}

function clean(rows: Row[], dateField: string, quantityField: string) {
  const valid: CleanRow[] = [];
  let invalid = 0;
  for (const row of rows) {
    const day = toDay(row[dateField]);
    const quantity = positiveNumber(row[quantityField]);
    if (day === null || quantity === null) invalid++;
    else valid.push({ day, quantity, row });
  }
  return { valid, invalid };
}

function countPossibleDuplicates(rows: CleanRow[], fields: string[]): number {
  const seen = new Map<string, number>();
  for (const r of rows) {
    const k = [r.day, r.quantity, ...fields.map((f) => key(r.row[f]))].join("|");
    seen.set(k, (seen.get(k) ?? 0) + 1);
  }
  let duplicates = 0;
  for (const count of seen.values()) if (count > 1) duplicates += count - 1;
  return duplicates;
}

/* Population (a snapshot: current counts, not limited to the period) */

export function summarizePopulation(records: FarmRecords, thresholds: Thresholds = DEFAULT_THRESHOLDS) {
  const batches = records.poultry.map((row) => {
    const initial = positiveNumber(row.initial_count) ?? 0;
    const current = positiveNumber(row.current_count) ?? 0;
    const losses = Math.max(initial - current, 0);
    const ageWeeks = positiveNumber(row.age_weeks);
    const stage = label(row.stage || (ageWeeks !== null && ageWeeks <= 4 ? "chicks" : "adult")).toLowerCase();

    return {
      breed: label(row.breed),
      purpose: label(row.purpose),
      stage,
      source: label(row.source || ""),
      purchasePrice: positiveNumber(row.purchase_price) ?? 0,
      notes: label(row.notes || ""),
      ageWeeks,
      initialCount: initial,
      currentCount: current,
      losses,
      lossPercent: initial > 0 ? round((losses / initial) * 100, 1) : null,
      dateAdded: toDay(row.date_added),
    };
  });

  const initialBirds = batches.reduce((s, b) => s + b.initialCount, 0);
  const currentBirds = batches.reduce((s, b) => s + b.currentCount, 0);
  const layerBirds = batches.filter((b) => /layer/i.test(b.purpose) || b.stage === "layers").reduce((s, b) => s + b.currentCount, 0);
  const chickBirds = batches.filter((b) => b.stage === "chicks" || (b.ageWeeks !== null && b.ageWeeks <= 4)).reduce((s, b) => s + b.currentCount, 0);
  const broilerBirds = batches.filter((b) => /broiler/i.test(b.purpose) || b.stage === "broilers").reduce((s, b) => s + b.currentCount, 0);

  const livestockByType = new Map<string, { type: string; count: number }>();
  let calvesCount = 0;
  let heifersCount = 0;
  let cowsCount = 0;
  let bullsCount = 0;

  for (const row of records.livestock) {
    const k = key(row.type);
    const entry = livestockByType.get(k) ?? { type: label(row.type), count: 0 };
    entry.count++;
    livestockByType.set(k, entry);

    const cat = key(row.category);
    const ageYears = positiveNumber(row.age_years) ?? 0;
    const sex = key(row.sex);

    if (cat === "calf" || ageYears < 1) {
      calvesCount++;
    } else if (cat === "heifer" || (ageYears >= 1 && ageYears < 2.5 && sex !== "male" && cat !== "cow" && cat !== "bull")) {
      heifersCount++;
    } else if (cat === "bull" || sex === "male") {
      bullsCount++;
    } else {
      cowsCount++;
    }
  }

  return {
    poultry: {
      batchCount: batches.length,
      initialBirds,
      currentBirds,
      layerBirds,
      chickBirds,
      broilerBirds,
      totalLosses: Math.max(initialBirds - currentBirds, 0),
      lossPercent: initialBirds > 0 ? round(((initialBirds - currentBirds) / initialBirds) * 100, 1) : null,
      batches,
      batchesAboveLossThreshold: batches.filter((b) => b.lossPercent !== null && b.lossPercent >= thresholds.birdLossPercent).length,
    },
    livestock: {
      animalCount: records.livestock.length,
      calvesCount,
      heifersCount,
      cowsCount,
      bullsCount,
      byType: [...livestockByType.values()].sort((a, b) => b.count - a.count),
    },
  };
}

/* Production: one line per (type, unit). Eggs in trays are NOT converted. */

export function summarizeProduction(rows: Row[], period: Period) {
  const { valid, invalid } = clean(rows, "date", "quantity");
  const previous = previousPeriod(period);
  const groups = new Map<string, { type: string; unit: string; current: CleanRow[]; previousTotal: number }>();

  let eggsProduced = 0;
  let eggsSold = 0;
  let milkProduced = 0;
  let milkSold = 0;

  for (const r of valid) {
    const type = key(r.row.type);
    const unit = key(r.row.unit);
    const destination = key(r.row.destination || "produced");
    const k = `${type}|${unit}`;
    const group = groups.get(k) ?? { type, unit, current: [], previousTotal: 0 };

    if (inPeriod(r.day, period)) {
      group.current.push(r);
      if (type === "eggs") {
        if (destination === "sold") eggsSold += r.quantity;
        else eggsProduced += r.quantity;
      } else if (type === "milk") {
        if (destination === "sold") milkSold += r.quantity;
        else milkProduced += r.quantity;
      }
    } else if (inPeriod(r.day, previous)) {
      group.previousTotal += r.quantity;
    }
    groups.set(k, group);
  }

  const lines = [...groups.values()]
    .filter((g) => g.current.length > 0 || g.previousTotal > 0)
    .map((g) => {
      const total = round(g.current.reduce((s, r) => s + r.quantity, 0));
      const daysWithRecords = new Set(g.current.map((r) => r.day)).size;
      return {
        type: g.type,
        unit: g.unit,
        total,
        recordCount: g.current.length,
        daysWithRecords,
        averagePerRecordedDay: daysWithRecords > 0 ? round(total / daysWithRecords) : null,
        previousTotal: round(g.previousTotal),
        changePercent: percentChange(total, g.previousTotal),
      };
    })
    .sort((a, b) => a.type.localeCompare(b.type) || a.unit.localeCompare(b.unit));

  const inCurrent = valid.filter((r) => inPeriod(r.day, period));
  return {
    lines,
    eggsProduced: round(eggsProduced),
    eggsSold: round(eggsSold),
    milkProduced: round(milkProduced),
    milkSold: round(milkSold),
    lastEggRecord: valid.filter((r) => key(r.row.type) === "eggs").map((r) => r.day).sort().pop() ?? null,
    invalidRecords: invalid,
    possibleDuplicates: countPossibleDuplicates(inCurrent, ["type", "unit"]),
  };
}

/* Feeding: grams are converted to kilograms (exact); other units stay separate. */

export function normalizeFeedUnit(quantity: number, unit: unknown): { quantity: number; unit: string } {
  const u = key(unit);
  if (u === "g") return { quantity: quantity / 1000, unit: "kg" };
  return { quantity, unit: u };
}

export function summarizeFeeding(rows: Row[], period: Period) {
  const { valid, invalid } = clean(rows, "date", "quantity");
  const previous = previousPeriod(period);
  const byUnit = new Map<string, { unit: string; total: number; previousTotal: number; recordCount: number }>();
  const byFeed = new Map<string, { animalType: string; feedType: string; unit: string; total: number }>();
  let totalFeedCost = 0;

  for (const r of valid) {
    const normalized = normalizeFeedUnit(r.quantity, r.row.unit);
    const current = inPeriod(r.day, period);
    const cost = positiveNumber(r.row.cost) ?? 0;

    if (!current && !inPeriod(r.day, previous)) continue;
    const unitEntry = byUnit.get(normalized.unit) ?? { unit: normalized.unit, total: 0, previousTotal: 0, recordCount: 0 };
    if (current) {
      unitEntry.total += normalized.quantity;
      unitEntry.recordCount++;
      totalFeedCost += cost;

      const k = `${key(r.row.animal_type)}|${key(r.row.feed_type)}|${normalized.unit}`;
      const feedEntry = byFeed.get(k) ?? {
        animalType: label(r.row.animal_type),
        feedType: label(r.row.feed_type),
        unit: normalized.unit,
        total: 0,
      };
      feedEntry.total += normalized.quantity;
      byFeed.set(k, feedEntry);
    } else {
      unitEntry.previousTotal += normalized.quantity;
    }
    byUnit.set(normalized.unit, unitEntry);
  }

  const inCurrent = valid.filter((r) => inPeriod(r.day, period));
  return {
    totalsByUnit: [...byUnit.values()]
      .filter((u) => u.recordCount > 0 || u.previousTotal > 0)
      .map((u) => ({
        unit: u.unit,
        total: round(u.total),
        recordCount: u.recordCount,
        averagePerDay: round(u.total / period.days),
        previousTotal: round(u.previousTotal),
        changePercent: percentChange(u.total, u.previousTotal),
      })),
    byFeedType: [...byFeed.values()].map((f) => ({ ...f, total: round(f.total) })).sort((a, b) => b.total - a.total),
    totalFeedCost: round(totalFeedCost),
    recordCount: inCurrent.length,
    invalidRecords: invalid,
    possibleDuplicates: countPossibleDuplicates(inCurrent, ["animal_type", "feed_type", "unit"]),
  };
}

/* Expenses (Kenya shillings) */

export function summarizeExpenses(rows: Row[], period: Period) {
  const { valid, invalid } = clean(rows, "date", "amount");
  const previous = previousPeriod(period);
  const current = valid.filter((r) => inPeriod(r.day, period));
  const previousTotal = valid.filter((r) => inPeriod(r.day, previous)).reduce((s, r) => s + r.quantity, 0);
  const total = current.reduce((s, r) => s + r.quantity, 0);

  const byCategory = new Map<string, { category: string; total: number; recordCount: number }>();
  for (const r of current) {
    const k = key(r.row.category);
    const entry = byCategory.get(k) ?? { category: label(r.row.category), total: 0, recordCount: 0 };
    entry.total += r.quantity;
    entry.recordCount++;
    byCategory.set(k, entry);
  }

  return {
    currency: "KES",
    total: round(total),
    recordCount: current.length,
    averagePerDay: round(total / period.days),
    previousTotal: round(previousTotal),
    changePercent: percentChange(total, previousTotal),
    byCategory: [...byCategory.values()]
      .map((c) => ({ ...c, total: round(c.total), sharePercent: total > 0 ? round((c.total / total) * 100, 1) : null }))
      .sort((a, b) => b.total - a.total),
    invalidRecords: invalid,
    possibleDuplicates: countPossibleDuplicates(current, ["category", "description"]),
  };
}

/* Income (Kenya shillings) */

export function summarizeIncome(rows: Row[] = [], period: Period) {
  const { valid, invalid } = clean(rows, "date", "amount");
  const previous = previousPeriod(period);
  const current = valid.filter((r) => inPeriod(r.day, period));
  const previousTotal = valid.filter((r) => inPeriod(r.day, previous)).reduce((s, r) => s + r.quantity, 0);
  const total = current.reduce((s, r) => s + r.quantity, 0);

  const byCategory = new Map<string, { category: string; total: number; recordCount: number }>();
  for (const r of current) {
    const k = key(r.row.category);
    const entry = byCategory.get(k) ?? { category: label(r.row.category), total: 0, recordCount: 0 };
    entry.total += r.quantity;
    entry.recordCount++;
    byCategory.set(k, entry);
  }

  return {
    currency: "KES",
    total: round(total),
    recordCount: current.length,
    averagePerDay: round(total / period.days),
    previousTotal: round(previousTotal),
    changePercent: percentChange(total, previousTotal),
    byCategory: [...byCategory.values()]
      .map((c) => ({ ...c, total: round(c.total), sharePercent: total > 0 ? round((c.total / total) * 100, 1) : null }))
      .sort((a, b) => b.total - a.total),
    invalidRecords: invalid,
    possibleDuplicates: countPossibleDuplicates(current, ["category", "description"]),
  };
}

/* Vaccinations */

export function summarizeVaccinations(rows: Row[] = [], period: Period) {
  const dueToday: Row[] = [];
  const upcoming7Days: Row[] = [];
  const upcoming30Days: Row[] = [];
  const overdue: Row[] = [];
  const completed: Row[] = [];

  const todayStr = period.to;
  const in7 = addDays(todayStr, 7);
  const in30 = addDays(todayStr, 30);

  for (const r of rows) {
    const status = key(r.status);
    const dateDue = toDay(r.date_due);

    if (status === "completed") {
      completed.push(r);
      continue;
    }
    if (status === "cancelled") {
      continue;
    }

    if (dateDue) {
      if (dateDue < todayStr) {
        overdue.push(r);
      } else if (dateDue === todayStr) {
        dueToday.push(r);
      } else if (dateDue <= in7) {
        upcoming7Days.push(r);
      } else if (dateDue <= in30) {
        upcoming30Days.push(r);
      }
    }
  }

  return {
    dueTodayCount: dueToday.length,
    upcoming7DaysCount: upcoming7Days.length,
    upcoming30DaysCount: upcoming30Days.length,
    overdueCount: overdue.length,
    completedCount: completed.length,
    dueToday,
    upcoming7Days,
    upcoming30Days,
    overdue,
  };
}

/* ------------------------------------------------------------------ */
/* Rule-based decision support (explicit IF condition THEN recommendation) */

export interface RuleResult {
  id: string;
  severity: "info" | "warning";
  condition: string;
  finding: string;
  recommendation: string;
}

type Summary = ReturnType<typeof buildSummaryBase>;

export function evaluateRules(s: Summary, t: Thresholds = DEFAULT_THRESHOLDS): RuleResult[] {
  const results: RuleResult[] = [];
  const { poultry, livestock } = s.population;

  if (poultry.batchCount === 0 && livestock.animalCount === 0) {
    results.push({
      id: "no-animals",
      severity: "info",
      condition: "IF no poultry batches and no livestock are recorded",
      finding: "No animals have been recorded yet.",
      recommendation: "Add your poultry batches and livestock so that analytics can be calculated.",
    });
  }

  for (const batch of poultry.batches) {
    if (batch.lossPercent !== null && batch.lossPercent >= t.birdLossPercent) {
      results.push({
        id: "bird-losses",
        severity: "warning",
        condition: `IF a batch has lost at least ${t.birdLossPercent}% of its initial birds`,
        finding: `${batch.breed} (${batch.purpose}) batch: ${batch.losses} of ${batch.initialCount} birds lost (${batch.lossPercent}%).`,
        recommendation:
          "Confirm the current count is correct and record the reason for the losses. If deaths are unexplained, consult a veterinarian.",
      });
    }
  }

  for (const line of s.production.lines) {
    if (line.changePercent !== null && line.changePercent <= -t.productionDropPercent) {
      results.push({
        id: "production-drop",
        severity: "warning",
        condition: `IF ${line.type} production fell by at least ${t.productionDropPercent}% compared with the previous period`,
        finding: `${line.type} (${line.unit}): ${line.total} this period vs ${line.previousTotal} in the previous period (${line.changePercent}%).`,
        recommendation:
          "Check whether every day was recorded. If records are complete, review feeding, water, housing and animal health with an expert.",
      });
    }
  }

  if (poultry.layerBirds > 0) {
    const last = s.production.lastEggRecord;
    const gap = last ? Math.round((Date.parse(`${s.period.to}T00:00:00Z`) - Date.parse(`${last}T00:00:00Z`)) / DAY_MS) : null;
    if (gap === null || gap >= t.missingEggRecordDays) {
      results.push({
        id: "missing-egg-records",
        severity: "info",
        condition: `IF layer batches exist but no egg record exists in the last ${t.missingEggRecordDays} days`,
        finding: last ? `The last egg record is dated ${last} (${gap} days before ${s.period.to}).` : "Layer batches exist but no egg production has been recorded.",
        recommendation: "Record daily egg collection so that production trends and laying rates can be calculated.",
      });
    }
  }

  if ((poultry.batchCount > 0 || livestock.animalCount > 0) && s.feeding.recordCount === 0) {
    results.push({
      id: "missing-feeding-records",
      severity: "info",
      condition: "IF animals are recorded but there are no feeding records in the period",
      finding: `No feeding records between ${s.period.from} and ${s.period.to}.`,
      recommendation: "Record feed given so that feed usage and costs can be monitored.",
    });
  }

  if (s.feeding.totalsByUnit.some((u) => u.unit === "bags") && s.feeding.totalsByUnit.some((u) => u.unit === "kg")) {
    results.push({
      id: "mixed-feed-units",
      severity: "info",
      condition: "IF feed is recorded in both bags and kilograms",
      finding: "Bag and kilogram totals are shown separately because bag weights differ.",
      recommendation: "Record feed in kilograms (or note the bag weight) to allow a single total.",
    });
  }

  if (s.expenses.changePercent !== null && s.expenses.changePercent >= t.expenseIncreasePercent) {
    results.push({
      id: "expense-increase",
      severity: "info",
      condition: `IF expenses rose by at least ${t.expenseIncreasePercent}% compared with the previous period`,
      finding: `Expenses: KES ${s.expenses.total} this period vs KES ${s.expenses.previousTotal} before (+${s.expenses.changePercent}%).`,
      recommendation: "Review the largest categories to see which costs increased and whether the increase was planned.",
    });
  }

  if (s.financial.revenueAvailable && s.financial.operatingProfitOrLoss < 0) {
    results.push({
      id: "operating-loss",
      severity: "warning",
      condition: "IF operating expenses exceed total income in the selected period",
      finding: `Operating loss of KES ${Math.abs(s.financial.operatingProfitOrLoss)} (Income: KES ${s.financial.totalIncome}, Expenses: KES ${s.financial.totalExpenses}).`,
      recommendation: "Review major expense drivers and sales to identify where margins can be improved.",
    });
  }

  if (s.vaccinations.overdueCount > 0) {
    results.push({
      id: "overdue-vaccinations",
      severity: "warning",
      condition: "IF one or more scheduled vaccinations are overdue",
      finding: `${s.vaccinations.overdueCount} scheduled vaccination(s) are overdue.`,
      recommendation: "Review the vaccination schedule and administer overdue doses or consult a veterinarian to update the plan.",
    });
  }

  const duplicates = s.production.possibleDuplicates + s.feeding.possibleDuplicates + s.expenses.possibleDuplicates;
  if (duplicates > 0) {
    results.push({
      id: "possible-duplicates",
      severity: "info",
      condition: "IF two records have the same date, type and quantity",
      finding: `${duplicates} record(s) in this period look like possible duplicates.`,
      recommendation: "Check the records and delete any that were entered twice.",
    });
  }

  return results;
}

/* ------------------------------------------------------------------ */

function buildSummaryBase(records: FarmRecords, period: Period, thresholds: Thresholds = DEFAULT_THRESHOLDS) {
  const population = summarizePopulation(records, thresholds);
  const production = summarizeProduction(records.production, period);
  const feeding = summarizeFeeding(records.feeding, period);
  const expenses = summarizeExpenses(records.expenses, period);
  const incomeRows = records.income ?? [];
  const income = summarizeIncome(incomeRows, period);
  const vaccinations = summarizeVaccinations(records.vaccinations ?? [], period);

  const eggPieces = production.lines.find((l) => l.type === "eggs" && l.unit === "pieces");
  const layingRate =
    eggPieces?.averagePerRecordedDay != null && population.poultry.layerBirds > 0
      ? round((eggPieces.averagePerRecordedDay / population.poultry.layerBirds) * 100, 1)
      : null;

  const revenueAvailable = incomeRows.length > 0;
  const operatingProfitOrLoss = round(income.total - expenses.total);
  const previousOperatingProfitOrLoss = round(income.previousTotal - expenses.previousTotal);
  const netMarginPercent = income.total > 0 ? round((operatingProfitOrLoss / income.total) * 100, 1) : null;

  return {
    period,
    previousPeriod: previousPeriod(period),
    population,
    production,
    feeding,
    expenses,
    income,
    vaccinations,
    indicators: {
      /** Average eggs (pieces) per recorded day / current layer birds x 100. Estimate only. */
      estimatedLayingRatePercent: layingRate,
      totalBirds: population.poultry.currentBirds,
      totalChicks: population.poultry.chickBirds,
      totalBroilers: population.poultry.broilerBirds,
      totalLayers: population.poultry.layerBirds,
      totalCattle: population.livestock.animalCount,
      totalCalves: population.livestock.calvesCount,
      totalHeifers: population.livestock.heifersCount,
      totalCows: population.livestock.cowsCount,
      totalBulls: population.livestock.bullsCount,
      periodIncome: income.total,
      periodExpenses: expenses.total,
      periodProfitOrLoss: operatingProfitOrLoss,
      vaccinationsDueToday: vaccinations.dueTodayCount,
      vaccinationsOverdue: vaccinations.overdueCount,
    },
    financial: {
      revenueAvailable,
      totalIncome: income.total,
      totalExpenses: expenses.total,
      operatingProfitOrLoss,
      netMarginPercent,
      isProfitable: operatingProfitOrLoss >= 0,
      cashReceived: income.total,
      cashPaid: expenses.total,
      previousOperatingProfitOrLoss,
      note: revenueAvailable
        ? "Operating Profit or Loss = Total Income - Total Operating Expenses."
        : "Revenue and profit are not calculated because sales and prices are not recorded in the system.",
    },
    dataQuality: {
      invalidRecords: production.invalidRecords + feeding.invalidRecords + expenses.invalidRecords + income.invalidRecords,
      possibleDuplicates: production.possibleDuplicates + feeding.possibleDuplicates + expenses.possibleDuplicates + income.possibleDuplicates,
    },
    thresholds,
  };
}

export function summarizeFarm(records: FarmRecords, period: Period, thresholds: Thresholds = DEFAULT_THRESHOLDS) {
  const base = buildSummaryBase(records, period, thresholds);
  return { ...base, rules: evaluateRules(base, thresholds) };
}

export type FarmSummary = ReturnType<typeof summarizeFarm>;

/* ------------------------------------------------------------------ */
/* Population Survivor and Mortality Analytics                         */
/* ------------------------------------------------------------------ */

export interface PopulationEventRaw {
  target_id: string;
  target_name: string;
  species: string;
  event_type: string;
  count: number;
  date: string;
}

export interface SurvivorTarget {
  targetId: string;
  targetName: string;
  species: string;
  initialCount: number;
  additions: number;
  transfersIn: number;
  deaths: number;
  sales: number;
  transfersOut: number;
  survivors: number;
  survivorRatePercent: number | null;
}

export function buildSurvivorSummary(
  events: PopulationEventRaw[],
  poultryBatches: Row[],
  livestock: Row[],
): {
  targets: SurvivorTarget[];
  totalPoultryBirds: number;
  totalLivestockAnimals: number;
} {
  // Build lookup maps
  const poultryMap = new Map<string, number>();
  for (const b of poultryBatches) {
    const id = String(b.id ?? '');
    const count = typeof b.initial_count === 'number' ? b.initial_count : Number(b.initial_count ?? 0);
    poultryMap.set(id, count);
  }
  const livestockSet = new Set(livestock.map((l) => String(l.id ?? '')));

  // Group events by target_id
  const targetMap = new Map<string, {
    targetId: string; targetName: string; species: string;
    additions: number; transfersIn: number; deaths: number; sales: number; transfersOut: number;
  }>();

  for (const ev of events) {
    const key = ev.target_id;
    if (!targetMap.has(key)) {
      targetMap.set(key, { targetId: key, targetName: ev.target_name, species: ev.species,
        additions: 0, transfersIn: 0, deaths: 0, sales: 0, transfersOut: 0 });
    }
    const t = targetMap.get(key)!;
    switch (ev.event_type) {
      case 'addition':     t.additions    += ev.count; break;
      case 'transfer_in':  t.transfersIn  += ev.count; break;
      case 'death':        t.deaths       += ev.count; break;
      case 'sale':         t.sales        += ev.count; break;
      case 'transfer_out': t.transfersOut += ev.count; break;
    }
  }

  // Also include batches/animals with no events
  for (const b of poultryBatches) {
    const id = String(b.id ?? '');
    if (!targetMap.has(id)) {
      const name = String(b.breed ?? b.purpose ?? id);
      targetMap.set(id, { targetId: id, targetName: name, species: 'poultry',
        additions: 0, transfersIn: 0, deaths: 0, sales: 0, transfersOut: 0 });
    }
  }
  for (const l of livestock) {
    const id = String(l.id ?? '');
    if (!targetMap.has(id)) {
      const name = String(l.name ?? id);
      targetMap.set(id, { targetId: id, targetName: name, species: 'cattle',
        additions: 0, transfersIn: 0, deaths: 0, sales: 0, transfersOut: 0 });
    }
  }

  const targets: SurvivorTarget[] = [];
  let totalPoultryBirds = 0;
  let totalLivestockAnimals = 0;

  for (const t of targetMap.values()) {
    const initialCount = t.species === 'poultry'
      ? (poultryMap.get(t.targetId) ?? 0)
      : (livestockSet.has(t.targetId) ? 1 : 0);

    const survivors = Math.max(
      0,
      initialCount + t.additions + t.transfersIn - t.deaths - t.sales - t.transfersOut,
    );
    const denominator = initialCount + t.additions + t.transfersIn;
    const survivorRatePercent = denominator > 0 ? round((survivors / denominator) * 100, 1) : null;

    targets.push({ ...t, initialCount, survivors, survivorRatePercent });

    if (t.species === 'poultry') totalPoultryBirds += survivors;
    else if (survivors > 0) totalLivestockAnimals += 1;
  }

  return { targets, totalPoultryBirds, totalLivestockAnimals };
}

export interface MortalityPoint {
  label: string;
  startPopulation: number | null;
  deaths: number;
  mortalityRatePercent: number | null;
  cannotCalculate: boolean;
}

function isoWeek(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  const thursday = new Date(d);
  thursday.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7) + 3);
  const firstThursday = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / 604_800_000);
  return `${thursday.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function bucketLabel(day: string, period: "daily" | "weekly" | "monthly" | "yearly"): string {
  if (period === 'daily')   return day;
  if (period === 'weekly')  return isoWeek(day);
  if (period === 'monthly') return day.slice(0, 7);
  return day.slice(0, 4);
}

function bucketStart(label: string, period: "daily" | "weekly" | "monthly" | "yearly"): string {
  if (period === 'daily')   return label;
  if (period === 'monthly') return `${label}-01`;
  if (period === 'yearly')  return `${label}-01-01`;
  // weekly: label = "YYYY-Www"
  const [yearStr, weekStr] = label.split('-W');
  const year = parseInt(yearStr, 10);
  const week = parseInt(weekStr, 10);
  // ISO week 1 contains the first Thursday
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const monday = new Date(jan4.getTime() - ((jan4.getUTCDay() + 6) % 7) * 86_400_000 + (week - 1) * 7 * 86_400_000);
  return monday.toISOString().slice(0, 10);
}

export function buildMortaltySeries(
  events: PopulationEventRaw[],
  poultryBatches: Row[],
  livestock: Row[],
  from: string,
  to: string,
  period: "daily" | "weekly" | "monthly" | "yearly",
  speciesFilter?: string,
  targetIdFilter?: string,
): MortalityPoint[] {
  // Filter events to deaths within [from, to]
  let deathEvents = events.filter(
    (e) => e.event_type === 'death' && e.date >= from && e.date <= to,
  );
  if (speciesFilter) deathEvents = deathEvents.filter((e) => e.species === speciesFilter);
  if (targetIdFilter) deathEvents = deathEvents.filter((e) => e.target_id === targetIdFilter);

  // Group deaths by bucket
  const bucketDeaths = new Map<string, number>();
  for (const e of deathEvents) {
    const lbl = bucketLabel(e.date, period);
    bucketDeaths.set(lbl, (bucketDeaths.get(lbl) ?? 0) + e.count);
  }

  // Enumerate all buckets from `from` to `to`
  const allBuckets: string[] = [];
  const seen = new Set<string>();
  let cursor = from;
  while (cursor <= to) {
    const lbl = bucketLabel(cursor, period);
    if (!seen.has(lbl)) { allBuckets.push(lbl); seen.add(lbl); }
    cursor = addDays(cursor, 1);
  }

  // Compute start population for each bucket
  // All events before the bucket start
  const allEventsBeforeMap = (beforeDate: string): number => {
    let filtered = events.filter((e) => e.date < beforeDate);
    if (speciesFilter) filtered = filtered.filter((e) => e.species === speciesFilter);
    if (targetIdFilter) filtered = filtered.filter((e) => e.target_id === targetIdFilter);

    // initial counts
    let initial = 0;
    if (!speciesFilter || speciesFilter === 'poultry') {
      for (const b of poultryBatches) {
        if (!targetIdFilter || String(b.id) === targetIdFilter) {
          const dateAdded = String(b.date_added ?? '');
          if (dateAdded < beforeDate) {
            initial += typeof b.initial_count === 'number' ? b.initial_count : Number(b.initial_count ?? 0);
          }
        }
      }
    }
    if (!speciesFilter || speciesFilter === 'cattle') {
      for (const l of livestock) {
        if (!targetIdFilter || String(l.id) === targetIdFilter) {
          const dateAdded = String(l.date_added ?? '');
          if (dateAdded < beforeDate) initial += 1;
        }
      }
    }

    let net = 0;
    for (const e of filtered) {
      if (['addition', 'transfer_in'].includes(e.event_type)) net += e.count;
      else if (['death', 'sale', 'transfer_out'].includes(e.event_type)) net -= e.count;
    }
    return Math.max(0, initial + net);
  };

  return allBuckets.map((lbl) => {
    const bStart = bucketStart(lbl, period);
    const deaths = bucketDeaths.get(lbl) ?? 0;
    const startPop = allEventsBeforeMap(bStart);
    const cannotCalculate = startPop === 0;
    const mortalityRatePercent = (!cannotCalculate && deaths > 0)
      ? round((deaths / startPop) * 100, 2)
      : (cannotCalculate ? null : 0);
    return { label: lbl, startPopulation: startPop, deaths, mortalityRatePercent, cannotCalculate };
  });
}
