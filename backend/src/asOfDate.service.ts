import { postgresPool } from "./postgres.js";
import type { PopulationEventRow } from "./store.js";

function getPool() {
  if (!postgresPool) {
    throw new Error("PostgreSQL pool is not initialized. Verify that DATABASE_URL is configured.");
  }
  return postgresPool;
}

interface ActiveTarget {
  targetId: string;
  targetName: string;
  liveCount: number;
}

interface DailyCount {
  date: string;
  count: number;
}

/**
 * Returns all animals/flocks alive on a specific date with their live counts
 */
export async function getActiveTargetsOnDate(
  ownerId: string,
  species: "poultry" | "cattle",
  asOfDate: string,
): Promise<ActiveTarget[]> {
  const pool = getPool();

  // Get all targets for this species
  const targetsQuery =
    species === "poultry"
      ? await pool.query<{ id: string; breed: string; initial_count: number }>(
          `SELECT id, breed AS target_name, initial_count FROM poultry_batches WHERE owner_id = $1`,
          [ownerId],
        )
      : await pool.query<{ id: string; name: string }>(
          `SELECT id, name AS target_name FROM livestock WHERE owner_id = $1`,
          [ownerId],
        );

  const targets = targetsQuery.rows;
  const activeTargets: ActiveTarget[] = [];

  for (const target of targets) {
    const targetId = target.id;
    const targetName = species === "poultry" ? (target as any).target_name : (target as any).target_name;
    const liveCount = await getLiveCountOnDate(ownerId, targetId, asOfDate);

    if (liveCount > 0) {
      activeTargets.push({ targetId, targetName, liveCount });
    }
  }

  return activeTargets;
}

/**
 * Returns the number of animals/birds alive for a target on a specific date
 */
export async function getLiveCountOnDate(
  ownerId: string,
  targetId: string,
  asOfDate: string,
): Promise<number> {
  const pool = getPool();

  // Get initial count
  const poultryQuery = await pool.query<{ initial_count: number }>(
    `SELECT initial_count FROM poultry_batches WHERE id = $1 AND owner_id = $2`,
    [targetId, ownerId],
  );

  let count = 0;
  if (poultryQuery.rows.length > 0) {
    count = poultryQuery.rows[0].initial_count;
  } else {
    // Check if it's a livestock animal
    const livestockQuery = await pool.query(
      `SELECT id FROM livestock WHERE id = $1 AND owner_id = $2`,
      [targetId, ownerId],
    );
    count = livestockQuery.rows.length > 0 ? 1 : 0;
  }

  // Load all events up to asOfDate, sorted chronologically
  const eventsQuery = await pool.query<PopulationEventRow>(
    `SELECT event_type, count, date
     FROM population_events
     WHERE owner_id = $1 AND target_id = $2 AND date <= $3
     ORDER BY date ASC, id ASC`,
    [ownerId, targetId, asOfDate],
  );

  // Walk through events and accumulate
  for (const event of eventsQuery.rows) {
    switch (event.event_type) {
      case "addition":
      case "transfer_in":
        count += event.count;
        break;
      case "death":
      case "sale":
      case "transfer_out":
        count -= event.count;
        break;
    }
  }

  return Math.max(0, count);
}

/**
 * Returns live counts for each day in a date range
 * If targetId is null, returns totals across all targets for the owner
 */
export async function getLiveCountsByDay(
  ownerId: string,
  targetId: string | null,
  fromDate: string,
  toDate: string,
): Promise<Map<string, number>> {
  const pool = getPool();
  const counts = new Map<string, number>();

  // Generate list of dates in range
  const dates: string[] = [];
  const current = new Date(fromDate);
  const end = new Date(toDate);

  while (current <= end) {
    dates.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }

  if (targetId) {
    // Single target
    for (const date of dates) {
      const count = await getLiveCountOnDate(ownerId, targetId, date);
      counts.set(date, count);
    }
  } else {
    // All targets - get all poultry and livestock
    const poultryQuery = await pool.query<{ id: string }>(
      `SELECT id FROM poultry_batches WHERE owner_id = $1`,
      [ownerId],
    );
    const livestockQuery = await pool.query<{ id: string }>(
      `SELECT id FROM livestock WHERE owner_id = $1`,
      [ownerId],
    );

    const allTargetIds = [
      ...poultryQuery.rows.map((r) => r.id),
      ...livestockQuery.rows.map((r) => r.id),
    ];

    for (const date of dates) {
      let totalCount = 0;
      for (const tid of allTargetIds) {
        totalCount += await getLiveCountOnDate(ownerId, tid, date);
      }
      counts.set(date, totalCount);
    }
  }

  return counts;
}

/**
 * Returns the last date an animal/flock was alive
 * Returns null if still active (count > 0 today)
 */
export async function getLastActiveDate(
  ownerId: string,
  targetId: string,
): Promise<string | null> {
  const pool = getPool();

  // Get all events sorted by date
  const eventsQuery = await pool.query<PopulationEventRow>(
    `SELECT event_type, count, date
     FROM population_events
     WHERE owner_id = $1 AND target_id = $2
     ORDER BY date DESC, id DESC`,
    [ownerId, targetId],
  );

  const events = eventsQuery.rows;
  if (events.length === 0) {
    // No events, still has initial count
    return null;
  }

  // Get current count
  const today = new Date().toISOString().split("T")[0];
  const currentCount = await getLiveCountOnDate(ownerId, targetId, today);

  if (currentCount > 0) {
    return null; // Still active
  }

  // Find the date when count became zero
  // Walk backwards through events to find when it went to zero
  let count = currentCount;
  let lastActiveDate: string | null = null;

  // Start from the most recent event and work backwards
  const allEvents = await pool.query<PopulationEventRow>(
    `SELECT event_type, count, date
     FROM population_events
     WHERE owner_id = $1 AND target_id = $2
     ORDER BY date ASC, id ASC`,
    [ownerId, targetId],
  );

  // Get initial count
  const poultryQuery = await pool.query<{ initial_count: number }>(
    `SELECT initial_count FROM poultry_batches WHERE id = $1 AND owner_id = $2`,
    [targetId, ownerId],
  );

  let runningCount = 0;
  if (poultryQuery.rows.length > 0) {
    runningCount = poultryQuery.rows[0].initial_count;
  } else {
    const livestockQuery = await pool.query(
      `SELECT id FROM livestock WHERE id = $1 AND owner_id = $2`,
      [targetId, ownerId],
    );
    runningCount = livestockQuery.rows.length > 0 ? 1 : 0;
  }

  // Walk forward and track when count was last > 0
  for (const event of allEvents.rows) {
    if (runningCount > 0) {
      lastActiveDate = event.date;
    }

    switch (event.event_type) {
      case "addition":
      case "transfer_in":
        runningCount += event.count;
        break;
      case "death":
      case "sale":
      case "transfer_out":
        runningCount -= event.count;
        break;
    }
  }

  return lastActiveDate;
}

/**
 * Finds production, feeding, and vaccination records dated after the last active date
 * Returns records that need review because they're dated after the animal was sold/died
 */
export async function findRecordsAfterLastActiveDate(
  ownerId: string,
  targetId: string,
  eventDate: string,
): Promise<{
  production: any[];
  feeding: any[];
  vaccinations: any[];
}> {
  const pool = getPool();

  // Find production records after event date
  const productionQuery = await pool.query(
    `SELECT id, type, quantity, unit, date, destination, selling_price, notes
     FROM production
     WHERE owner_id = $1 AND target_id = $2 AND date > $3
     ORDER BY date ASC`,
    [ownerId, targetId, eventDate],
  );

  // Find feeding records after event date (using group_name matching)
  // First get the target name
  const targetNameQuery = await pool.query<{ breed?: string; name?: string }>(
    `SELECT breed AS name FROM poultry_batches WHERE id = $1 AND owner_id = $2
     UNION ALL
     SELECT name FROM livestock WHERE id = $1 AND owner_id = $2`,
    [targetId, ownerId],
  );

  const targetName = targetNameQuery.rows[0]?.name || targetNameQuery.rows[0]?.breed || "";

  const feedingQuery = await pool.query(
    `SELECT id, animal_type, feed_type, quantity, unit, date, cost, supplier, notes
     FROM feeding
     WHERE owner_id = $1 AND group_name = $2 AND date > $3
     ORDER BY date ASC`,
    [ownerId, targetName, eventDate],
  );

  // Find vaccination records after event date
  const vaccinationsQuery = await pool.query(
    `SELECT id, species, target_type, target_id, target_name, vaccine_name, disease, date_administered, date_due, status, count_vaccinated, notes
     FROM vaccinations
     WHERE owner_id = $1 AND target_id = $2 AND date_due > $3
     ORDER BY date_due ASC`,
    [ownerId, targetId, eventDate],
  );

  return {
    production: productionQuery.rows,
    feeding: feedingQuery.rows,
    vaccinations: vaccinationsQuery.rows,
  };
}
