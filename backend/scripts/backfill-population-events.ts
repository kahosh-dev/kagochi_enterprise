import crypto from "node:crypto";
import { config } from "../src/config.js";
import { db } from "../src/database.js";
import { postgresPool } from "../src/postgres.js";
import { sqliteStore } from "../src/sqliteStore.js";
import { postgresStore } from "../src/postgresStore.js";
import { buildPopulationBackfillPlan } from "../src/population.js";
import { today } from "../src/farmContextStore.js";

const args = new Set(process.argv.slice(2).filter((arg) => !arg.includes("=")));
const valueArg = (name: string): string | undefined => process.argv.find((arg) => arg.startsWith(`${name}=`))?.slice(name.length + 1);
const apply = args.has("--apply");
if (apply && args.has("--dry-run")) throw new Error("Choose either --dry-run or --apply, not both.");
const asOf = valueArg("--as-of");
const ownerFilter = valueArg("--owner-id");
const poultryLossType = valueArg("--poultry-loss-type");

if (poultryLossType && poultryLossType !== "death" && poultryLossType !== "sale") {
  throw new Error("--poultry-loss-type must be either death or sale.");
}
if (apply && !asOf) {
  throw new Error("Applying backfill requires an operator-supplied --as-of=YYYY-MM-DD date. Dry-run is the default.");
}
const parsedAsOf = asOf ? new Date(`${asOf}T00:00:00Z`) : null;
if (asOf && (!/^\d{4}-\d{2}-\d{2}$/.test(asOf) || Number.isNaN(parsedAsOf?.getTime()) || parsedAsOf?.toISOString().slice(0, 10) !== asOf || asOf > today())) {
  throw new Error("--as-of must be a valid YYYY-MM-DD date no later than today in Africa/Nairobi.");
}

const store = config.databaseType === "postgres" ? postgresStore : sqliteStore;

try {
  const users = await store.getAllUsers();
  const owners = users.filter((user) => !ownerFilter || user.id === ownerFilter);
  if (ownerFilter && owners.length === 0) throw new Error("The requested owner ID was not found.");
  const report: Array<{ ownerId: string; candidates: number; unresolved: string[] }> = [];

  for (const owner of owners) {
    const [poultry, livestock, events] = await Promise.all([
      store.listRecords("poultry", owner.id),
      store.listRecords("livestock", owner.id),
      store.listPopulationEvents(owner.id),
    ]);
    const plan = buildPopulationBackfillPlan({
      poultry: poultry.map((row) => ({
        id: row.id,
        breed: String(row.breed ?? "Poultry batch"),
        initial_count: Number(row.initial_count ?? 0),
        current_count: Number(row.current_count ?? 0),
      })),
      livestock: livestock.map((row) => ({
        id: row.id,
        name: String(row.name ?? "Cattle animal"),
        status: String(row.status ?? "active"),
      })),
      events,
      poultryLossType: poultryLossType as "death" | "sale" | undefined,
    });
    const unresolved = [...plan.unresolved];
    if (apply && asOf) {
      for (const candidate of plan.candidates) {
        const targetEvents = events.filter((event) => event.species === candidate.species && event.target_id === candidate.targetId);
        const latestEventDate = targetEvents.reduce((latest, event) => event.date > latest ? event.date : latest, "0000-00-00");
        if (asOf < latestEventDate) {
          unresolved.push(`${candidate.species} ${candidate.targetId}: supplied date ${asOf} is before a ledger entry dated ${latestEventDate}; not backfilled.`);
          continue;
        }
        try {
          await store.createPopulationEvent(crypto.randomUUID(), owner.id, {
            species: candidate.species,
            target_id: candidate.targetId,
            target_name: candidate.targetName,
            event_type: candidate.eventType,
            count: candidate.count,
            date: asOf,
            reason: candidate.reason,
            notes: `Population backfill (${asOf}); legacy event date was not stored.`,
          }, { allowSnapshotReconciliation: true });
        } catch (error) {
          unresolved.push(`${candidate.species} ${candidate.targetId}: ${error instanceof Error ? error.message : "backfill failed"}`);
        }
      }
    }
    report.push({ ownerId: owner.id, candidates: plan.candidates.length, unresolved });
    console.log(JSON.stringify({
      ownerId: owner.id,
      mode: apply ? "apply" : "dry-run",
      asOf: asOf ?? null,
      candidates: plan.candidates,
      unresolved,
      applied: apply ? plan.candidates.length - Math.max(0, unresolved.length - plan.unresolved.length) : 0,
    }, null, 2));
  }

  const candidateCount = report.reduce((sum, item) => sum + item.candidates, 0);
  if (!apply) {
    console.log(`Dry run only: ${candidateCount} proposed event(s); no records changed. Re-run with --apply --as-of=YYYY-MM-DD to apply. Use --poultry-loss-type=death|sale to classify poultry shortfalls.`);
  }
} finally {
  if (config.databaseType === "sqlite") db.close();
  else await postgresPool?.end();
}
