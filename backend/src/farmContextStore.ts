import type { FarmStore, RecordRow } from "./store.js";
import { makePeriod, summarizeFarm } from "./analytics.js";

export interface FarmRecords {
  poultry: RecordRow[];
  livestock: RecordRow[];
  production: RecordRow[];
  feeding: RecordRow[];
  expenses: RecordRow[];
}

export async function loadFarmRecordsFromStore(
  store: FarmStore,
  ownerId: string,
): Promise<FarmRecords> {
  const [poultry, livestock, production, feeding, expenses] = await Promise.all([
    store.listRecords("poultry", ownerId),
    store.listRecords("livestock", ownerId),
    store.listRecords("production", ownerId),
    store.listRecords("feeding", ownerId),
    store.listRecords("expenses", ownerId),
  ]);

  return { poultry, livestock, production, feeding, expenses };
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function buildFarmContextFromStore(
  store: FarmStore,
  ownerId: string,
  periodDays: number,
) {
  const records = await loadFarmRecordsFromStore(store, ownerId);
  const summary = summarizeFarm(records, makePeriod(today(), periodDays));
  const { thresholds: _thresholds, ...context } = summary;
  return context;
}
