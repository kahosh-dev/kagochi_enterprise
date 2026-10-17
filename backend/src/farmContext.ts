import { listRecords } from "./database.js";
import { makePeriod, summarizeFarm } from "./analytics.js";

export function loadFarmRecords(ownerId: string) {
  return {
    poultry: listRecords("poultry", ownerId),
    livestock: listRecords("livestock", ownerId),
    production: listRecords("production", ownerId),
    feeding: listRecords("feeding", ownerId),
    expenses: listRecords("expenses", ownerId),
  };
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/*
 * What the AI receives: the calculated summary for the period (totals per
 * unit, comparisons, rule results). No record ids, owner ids, names or emails.
 */
export function buildFarmContext(ownerId: string, periodDays: number) {
  const summary = summarizeFarm(loadFarmRecords(ownerId), makePeriod(today(), periodDays));
  const { thresholds: _thresholds, ...context } = summary;
  return context;
}
