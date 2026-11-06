import type { FarmStore, RecordRow } from "./store.js";
import { makePeriod, makeCustomPeriod, summarizeFarm } from "./analytics.js";

export interface FarmRecords {
  poultry: RecordRow[];
  livestock: RecordRow[];
  production: RecordRow[];
  feeding: RecordRow[];
  expenses: RecordRow[];
  income?: RecordRow[];
  vaccinations?: RecordRow[];
  vaccination_schedules?: RecordRow[];
}

export async function loadFarmRecordsFromStore(
  store: FarmStore,
  ownerId: string,
): Promise<FarmRecords> {
  const [
    poultry,
    livestock,
    production,
    feeding,
    expenses,
    income,
    vaccinations,
    vaccination_schedules,
  ] = await Promise.all([
    store.listRecords("poultry", ownerId),
    store.listRecords("livestock", ownerId),
    store.listRecords("production", ownerId),
    store.listRecords("feeding", ownerId),
    store.listRecords("expenses", ownerId),
    store.listRecords("income", ownerId),
    store.listRecords("vaccinations", ownerId),
    store.listRecords("vaccination_schedules", ownerId),
  ]);

  return {
    poultry,
    livestock,
    production,
    feeding,
    expenses,
    income,
    vaccinations,
    vaccination_schedules,
  };
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function buildFarmContextFromStore(
  store: FarmStore,
  ownerId: string,
  periodDays: number = 30,
  to?: string,
  from?: string,
) {
  const records = await loadFarmRecordsFromStore(store, ownerId);
  const targetTo = to || today();
  const period = from ? makeCustomPeriod(from, targetTo) : makePeriod(targetTo, periodDays);

  const summary = summarizeFarm(records, period);
  const { thresholds: _thresholds, ...context } = summary;
  return context;
}
