import type { PopulationEventRow } from "./store.js";

export type PopulationEventLike = Pick<PopulationEventRow, "event_type" | "count" | "date" | "id">;

export function eventPopulationDelta(eventType: string, count: number): number {
  if (eventType === "addition" || eventType === "transfer_in") return count;
  if (eventType === "death" || eventType === "sale" || eventType === "transfer_out") return -count;
  return 0;
}

/** Apply ledger entries chronologically. Events on one calendar day are a single net change. */
export function populationAtDate(
  initialCount: number,
  events: readonly PopulationEventLike[],
  asOfDate = "9999-12-31",
): number {
  const byDay = new Map<string, number>();
  for (const event of events) {
    if (event.date > asOfDate) continue;
    byDay.set(event.date, (byDay.get(event.date) ?? 0) + eventPopulationDelta(event.event_type, event.count));
  }
  let count = initialCount;
  for (const date of [...byDay.keys()].sort()) count += byDay.get(date) ?? 0;
  return count;
}

export function hasNonNegativePopulation(initialCount: number, events: readonly PopulationEventLike[]): boolean {
  const byDay = new Map<string, number>();
  for (const event of events) {
    byDay.set(event.date, (byDay.get(event.date) ?? 0) + eventPopulationDelta(event.event_type, event.count));
  }
  let count = initialCount;
  for (const date of [...byDay.keys()].sort()) {
    count += byDay.get(date) ?? 0;
    if (count < 0) return false;
  }
  return true;
}

export function livestockStatusFromEvents(events: readonly PopulationEventLike[]): "active" | "sold" | "deceased" | "transferred" {
  const ordered = [...events].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  let count = 1;
  let terminal: "sold" | "deceased" | "transferred" = "transferred";
  for (const event of ordered) {
    count += eventPopulationDelta(event.event_type, event.count);
    if (count <= 0) {
      terminal = event.event_type === "death" ? "deceased" : event.event_type === "sale" ? "sold" : "transferred";
    }
  }
  return count > 0 ? "active" : terminal;
}

export interface PopulationBackfillCandidate {
  species: "poultry" | "cattle";
  targetId: string;
  targetName: string;
  eventType: "addition" | "death" | "sale" | "transfer_out";
  count: number;
  reason: string;
}

/** Build an explicit proposal; applying it requires an operator-selected date and poultry loss classification. */
export function buildPopulationBackfillPlan(input: {
  poultry: readonly { id: string; breed: string; initial_count: number; current_count: number }[];
  livestock: readonly { id: string; name: string; status: string }[];
  events: readonly PopulationEventRow[];
  poultryLossType?: "death" | "sale";
}): { candidates: PopulationBackfillCandidate[]; unresolved: string[] } {
  const candidates: PopulationBackfillCandidate[] = [];
  const unresolved: string[] = [];
  const ledgerByTarget = new Map<string, PopulationEventRow[]>();
  for (const event of input.events) {
    const key = `${event.species}:${event.target_id}`;
    const group = ledgerByTarget.get(key) ?? [];
    group.push(event);
    ledgerByTarget.set(key, group);
  }

  for (const batch of input.poultry) {
    const events = ledgerByTarget.get(`poultry:${batch.id}`) ?? [];
    const ledgerCount = populationAtDate(batch.initial_count, events);
    const delta = batch.current_count - ledgerCount;
    if (delta === 0) continue;
    if (delta > 0) {
      candidates.push({ species: "poultry", targetId: batch.id, targetName: batch.breed, eventType: "addition", count: delta, reason: "Legacy current-count reconciliation; addition type inferred from snapshot only." });
    } else if (!input.poultryLossType) {
      unresolved.push(`Poultry ${batch.id} (${batch.breed}): snapshot is ${Math.abs(delta)} below ledger; choose whether this shortfall represents death or sale.`);
    } else {
      candidates.push({ species: "poultry", targetId: batch.id, targetName: batch.breed, eventType: input.poultryLossType, count: Math.abs(delta), reason: "Legacy current-count reconciliation; loss classification explicitly selected by operator." });
    }
  }

  for (const animal of input.livestock) {
    if (animal.status !== "sold" && animal.status !== "deceased" && animal.status !== "transferred") continue;
    const events = ledgerByTarget.get(`cattle:${animal.id}`) ?? [];
    const ledgerCount = populationAtDate(1, events);
    if (ledgerCount <= 0) continue;
    const expectedType = animal.status === "sold" ? "sale" : animal.status === "deceased" ? "death" : "transfer_out";
    const hasMatching = events.some((event) => event.event_type === expectedType);
    if (hasMatching) continue;
    if (ledgerCount !== 1) {
      unresolved.push(`Cattle ${animal.id} (${animal.name}): terminal legacy status conflicts with ledger population ${ledgerCount}.`);
      continue;
    }
    candidates.push({ species: "cattle", targetId: animal.id, targetName: animal.name, eventType: expectedType, count: 1, reason: "Legacy livestock status backfill; operator-supplied event date required." });
  }
  return { candidates, unresolved };
}
