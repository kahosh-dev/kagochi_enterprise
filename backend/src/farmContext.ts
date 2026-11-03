import { listRecords, listPopulationEvents } from "./database.js";
import { makePeriod, summarizeFarm, buildSurvivorSummary } from "./analytics.js";

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
  const records = loadFarmRecords(ownerId);
  const summary = summarizeFarm(records, makePeriod(today(), periodDays));
  const { thresholds: _thresholds, ...context } = summary;

  // Load population events and build survivor context
  const events = listPopulationEvents(ownerId);
  const survivorContext = buildSurvivorSummary(
    events as any,
    records.poultry,
    records.livestock,
  );

  return {
    ...context,
    survivorTracking: {
      note: "Population events (additions, deaths, sales, transfers) are tracked per batch/animal. Survivor rates show the proportion still alive.",
      totalPoultryBirds: survivorContext.totalPoultryBirds,
      totalLivestockAnimals: survivorContext.totalLivestockAnimals,
      targets: survivorContext.targets.map((t) => ({
        name: t.targetName,
        species: t.species,
        survivors: t.survivors,
        survivorRatePercent: t.survivorRatePercent,
        deaths: t.deaths,
        sales: t.sales,
      })),
    },
  };
}
