import crypto from "node:crypto";
import { postgresPool } from "./postgres.js";
import { resourceTables } from "./store.js";
import type {
  AdminUserRow,
  FarmRow,
  FarmStore,
  RecordRow,
  RecordValues,
  ResourceName,
  StoreResult,
  UserRow,
} from "./store.js";
import { DEFAULT_VACCINES } from "./vaccineDefaults.js";
import { DEFAULT_FEED_TYPES } from "./feedTypeDefaults.js";
import { hasNonNegativePopulation, livestockStatusFromEvents, populationAtDate, type PopulationEventLike } from "./population.js";

function getPool() {
  if (!postgresPool) {
    throw new Error("PostgreSQL pool is not initialized. Verify that DATABASE_URL is configured.");
  }
  return postgresPool;
}

function result(changes: number | null): StoreResult {
  return { changes: changes ?? 0 };
}

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function orderedValues(
  resource: ResourceName,
  values: RecordValues,
): (string | number)[] {
  return resourceTables[resource].columns.map((column) => {
    const value = values[column];

    if (value !== undefined && value !== null) {
      return value;
    }

    if (column === "stage") return "adult";
    if (column === "category") return "cow";
    if (column === "sex") return "female";
    if (column === "status") return resource === "livestock" ? "active" : "upcoming";
    if (column === "destination") return "produced";
    if (column === "default_unit") return "kg";
    if (column === "is_active") return 1;
    if (
      column === "purchase_price" ||
      column === "selling_price" ||
      column === "cost" ||
      column === "booster_interval_days" ||
      column === "age_days_due" ||
      column === "quantity" ||
      column === "count_vaccinated" ||
      column === "is_hatch_date_estimated" ||
      column === "is_birth_date_estimated"
    ) {
      return 0;
    }

    return "";
  });
}

export const postgresStore: FarmStore = {
  async executeInTransaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      const result = await callback(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  async findUserByEmail(email): Promise<UserRow | undefined> {
    const query = await getPool().query<UserRow>(
      `SELECT id, name, email, password_hash, role, token_version, created_at
       FROM users WHERE LOWER(email) = LOWER($1)`,
      [normalizeEmail(email)],
    );

    return query.rows[0];
  },

  async findUserById(id): Promise<UserRow | undefined> {
    const query = await getPool().query<UserRow>(
      `SELECT id, name, email, password_hash, role, token_version, created_at
       FROM users WHERE id = $1`,
      [id],
    );

    return query.rows[0];
  },

  async createUser(id, name, email, passwordHash, role = "farmer") {
    const query = await getPool().query(
      `INSERT INTO users
         (id, name, email, password_hash, role, token_version, created_at)
       VALUES ($1, $2, $3, $4, $5, 0, $6)`,
      [
        id,
        name.trim(),
        normalizeEmail(email),
        passwordHash,
        role,
        new Date().toISOString(),
      ],
    );

    return result(query.rowCount);
  },

  async incrementTokenVersion(id) {
    const query = await getPool().query(
      `UPDATE users SET token_version = token_version + 1 WHERE id = $1`,
      [id],
    );

    return result(query.rowCount);
  },

  async setUserPassword(id, passwordHash) {
    const query = await getPool().query(
      `UPDATE users
       SET password_hash = $1, token_version = token_version + 1
       WHERE id = $2`,
      [passwordHash, id],
    );

    return result(query.rowCount);
  },

  async setUserRole(id, role) {
    const query = await getPool().query(
      `UPDATE users SET role = $1 WHERE id = $2`,
      [role, id],
    );

    return result(query.rowCount);
  },

  async countAdmins(): Promise<number> {
    const query = await getPool().query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM users WHERE role = 'admin'`,
    );

    return Number(query.rows[0]?.count ?? 0);
  },

  async getAllUsers(): Promise<AdminUserRow[]> {
    const query = await getPool().query<AdminUserRow>(
      `SELECT id, name, email, role, created_at
       FROM users ORDER BY created_at DESC`,
    );

    return query.rows;
  },

  async adminUpdateUser(id, name, email, role) {
    const query = await getPool().query(
      `UPDATE users SET name = $1, email = $2, role = $3 WHERE id = $4`,
      [name.trim(), normalizeEmail(email), role, id],
    );

    return result(query.rowCount);
  },

  async adminDeleteUser(id) {
    const query = await getPool().query(
      `DELETE FROM users WHERE id = $1`,
      [id],
    );

    return result(query.rowCount);
  },

  async createFarm(id, ownerId, farmName, location, phone) {
    const query = await getPool().query(
      `INSERT INTO farms
         (id, owner_id, farm_name, location, phone, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        id,
        ownerId,
        farmName.trim(),
        location.trim(),
        phone.trim(),
        new Date().toISOString(),
      ],
    );

    return result(query.rowCount);
  },

  async findFarmByOwnerId(ownerId): Promise<FarmRow | undefined> {
    const query = await getPool().query<FarmRow>(
      `SELECT id, farm_name, location, phone, created_at
       FROM farms WHERE owner_id = $1 LIMIT 1`,
      [ownerId],
    );

    return query.rows[0];
  },

  async listRecords(
    resource,
    ownerId,
  ): Promise<RecordRow[]> {
    if (resource === "vaccines") {
      try {
        const countCheck = await getPool().query<{ count: string }>(
          `SELECT COUNT(*) as count FROM vaccines WHERE owner_id = $1`,
          [ownerId]
        );
        if (parseInt(countCheck.rows[0]?.count || "0") === 0) {
          for (const v of DEFAULT_VACCINES) {
            await getPool().query(
              `INSERT INTO vaccines (id, owner_id, species, name, disease, default_method, notes, is_active)
               VALUES ($1, $2, $3, $4, $5, $6, $7, 1)`,
              [crypto.randomUUID(), ownerId, v.species, v.name, v.disease, v.default_method, v.notes]
            );
          }
        }
      } catch {
        // ignore if table not initialized
      }
    }

    if (resource === "feed_types") {
      try {
        const countCheck = await getPool().query<{ count: string }>(
          `SELECT COUNT(*) as count FROM feed_types WHERE owner_id = $1`,
          [ownerId]
        );
        if (parseInt(countCheck.rows[0]?.count || "0") === 0) {
          for (const ft of DEFAULT_FEED_TYPES) {
            await getPool().query(
              `INSERT INTO feed_types (id, owner_id, animal_type, category, name, default_unit, is_active)
               VALUES ($1, $2, $3, $4, $5, $6, 1)`,
              [crypto.randomUUID(), ownerId, ft.animal_type, ft.category, ft.name, ft.default_unit]
            );
          }
        }
      } catch {
        // ignore if table not initialized
      }
    }

    const { table, columns, dateColumn } = resourceTables[resource];

    const query = await getPool().query<RecordRow>(
      `SELECT id, ${columns.join(", ")}
       FROM ${table}
       WHERE owner_id = $1
       ORDER BY ${dateColumn} DESC, id DESC`,
      [ownerId],
    );

    return query.rows;
  },

  async listRecordsForPeriod(resource, ownerId, from, to): Promise<RecordRow[]> {
    const { table, columns, dateColumn } = resourceTables[resource];
    const predicates = ["owner_id = $1", `${dateColumn} <= $2`];
    const values: string[] = [ownerId, to];
    if (from) {
      predicates.push(`${dateColumn} >= $3`);
      values.push(from);
    }
    const query = await getPool().query<RecordRow>(
      `SELECT id, ${columns.join(", ")} FROM ${table} WHERE ${predicates.join(" AND ")} ORDER BY ${dateColumn} DESC, id DESC`,
      values,
    );
    return query.rows;
  },

  async createRecord(resource, id, ownerId, values) {
    const { table, columns } = resourceTables[resource];
    const placeholders = columns.map((_, index) => `$${index + 3}`).join(", ");
    const names = ["id", "owner_id", ...columns].join(", ");

    const query = await getPool().query(
      `INSERT INTO ${table} (${names})
       VALUES ($1, $2, ${placeholders})`,
      [id, ownerId, ...orderedValues(resource, values)],
    );

    return result(query.rowCount);
  },

  async updateRecord(resource, id, ownerId, values) {
    const { table, columns } = resourceTables[resource];
    const assignments = columns
      .map((column, index) => `${column} = $${index + 1}`)
      .join(", ");

    const query = await getPool().query(
      `UPDATE ${table} SET ${assignments}
       WHERE id = $${columns.length + 1}
         AND owner_id = $${columns.length + 2}`,
      [...orderedValues(resource, values), id, ownerId],
    );

    return result(query.rowCount);
  },

  async deleteRecord(resource, id, ownerId) {
    const { table } = resourceTables[resource];

    const query = await getPool().query(
      `DELETE FROM ${table} WHERE id = $1 AND owner_id = $2`,
      [id, ownerId],
    );

    return result(query.rowCount);
  },

  async listPopulationEvents(ownerId, species, targetId, from, to) {
    let sql = `SELECT id, owner_id, species, target_id, target_name, event_type, count, date, reason, notes
               FROM population_events WHERE owner_id = $1`;
    const params: unknown[] = [ownerId];
    if (species)  { sql += ` AND species = $${params.length + 1}`;   params.push(species); }
    if (targetId) { sql += ` AND target_id = $${params.length + 1}`; params.push(targetId); }
    if (from) { sql += ` AND date >= $${params.length + 1}`; params.push(from); }
    if (to) { sql += ` AND date <= $${params.length + 1}`; params.push(to); }
    sql += ` ORDER BY date DESC, id DESC`;
    const query = await getPool().query(sql, params);
    return query.rows;
  },

  async createPopulationEvent(id, ownerId, data, options = {}) {
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      let initialCount: number;
      let dateAdded: string;
      if (data.species === "poultry") {
        const target = await client.query<{ initial_count: number; date_added: string }>(
          `SELECT initial_count, current_count, date_added FROM poultry_batches WHERE id = $1 AND owner_id = $2 FOR UPDATE`,
          [data.target_id, ownerId],
        );
        if (!target.rows[0]) throw new Error("POPULATION_TARGET_NOT_FOUND");
        initialCount = Number(target.rows[0].initial_count);
        dateAdded = target.rows[0].date_added;
      } else {
        const target = await client.query<{ date_added: string }>(
          `SELECT date_added FROM livestock WHERE id = $1 AND owner_id = $2 FOR UPDATE`,
          [data.target_id, ownerId],
        );
        if (!target.rows[0]) throw new Error("POPULATION_TARGET_NOT_FOUND");
        if (data.count !== 1) throw new Error("CATTLE_EVENT_COUNT_MUST_BE_ONE");
        if (data.event_type === "addition") throw new Error("CATTLE_ADDITION_REQUIRES_ANIMAL_RECORD");
        initialCount = 1;
        dateAdded = target.rows[0].date_added;
      }
      if (data.date < String(dateAdded).slice(0, 10)) throw new Error("POPULATION_EVENT_BEFORE_TARGET");
      const existing = await client.query<PopulationEventLike>(
        `SELECT id, event_type, count, date FROM population_events WHERE owner_id = $1 AND species = $2 AND target_id = $3 FOR UPDATE`,
        [ownerId, data.species, data.target_id],
      );
      if (!options.allowSnapshotReconciliation) {
        if (data.species === "poultry" && Number((await client.query<{ current_count: number }>(`SELECT current_count FROM poultry_batches WHERE id = $1 AND owner_id = $2`, [data.target_id, ownerId])).rows[0]?.current_count ?? 0) !== populationAtDate(initialCount, existing.rows)) {
          throw new Error("POPULATION_SNAPSHOT_REQUIRES_BACKFILL");
        }
        if (data.species === "cattle") {
          const status = (await client.query<{ status: string }>(`SELECT status FROM livestock WHERE id = $1 AND owner_id = $2`, [data.target_id, ownerId])).rows[0]?.status ?? "active";
          if (status !== livestockStatusFromEvents(existing.rows)) throw new Error("POPULATION_SNAPSHOT_REQUIRES_BACKFILL");
        }
      }
      const proposed: PopulationEventLike[] = [...existing.rows, { id, event_type: data.event_type, count: data.count, date: data.date }];
      if (!hasNonNegativePopulation(initialCount, proposed)) throw new Error("NEGATIVE_POPULATION");
      await client.query(
        `INSERT INTO population_events (id, owner_id, species, target_id, target_name, event_type, count, date, reason, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [id, ownerId, data.species, data.target_id, data.target_name, data.event_type, data.count, data.date, data.reason, data.notes],
      );
      await client.query(
        `INSERT INTO event_audit_log (id, owner_id, event_id, action, changed_by, changed_at, before_state, after_state)
         VALUES ($1, $2, $3, 'create', $2, $4, $5, $6)`,
        [crypto.randomUUID(), ownerId, id, new Date().toISOString(), JSON.stringify({}), JSON.stringify(data)],
      );
      const liveCount = Math.max(0, populationAtDate(initialCount, proposed));
      if (data.species === "poultry") {
        await client.query(`UPDATE poultry_batches SET current_count = $1 WHERE id = $2 AND owner_id = $3`, [liveCount, data.target_id, ownerId]);
      } else {
        await client.query(`UPDATE livestock SET status = $1 WHERE id = $2 AND owner_id = $3`, [livestockStatusFromEvents(proposed), data.target_id, ownerId]);
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  async deletePopulationEvent(id, ownerId, action = "delete") {
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      const event = await client.query<{ species: "poultry" | "cattle"; target_id: string; target_name: string; event_type: string; count: number; date: string; reason: string; notes: string }>(
        `SELECT species, target_id, target_name, event_type, count, date, reason, notes FROM population_events WHERE id = $1 AND owner_id = $2`, [id, ownerId],
      );
      const row = event.rows[0];
      if (!row) {
        await client.query("COMMIT");
        return result(0);
      }
      const targetLock = row.species === "poultry"
        ? await client.query(`SELECT id FROM poultry_batches WHERE id = $1 AND owner_id = $2 FOR UPDATE`, [row.target_id, ownerId])
        : await client.query(`SELECT id FROM livestock WHERE id = $1 AND owner_id = $2 FOR UPDATE`, [row.target_id, ownerId]);
      if (targetLock.rows.length === 0) throw new Error("POPULATION_TARGET_NOT_FOUND");
      const lockedEvent = await client.query(`SELECT id FROM population_events WHERE id = $1 AND owner_id = $2 FOR UPDATE`, [id, ownerId]);
      if (lockedEvent.rows.length === 0) {
        await client.query("COMMIT");
        return result(0);
      }
      const ledgerBefore = await client.query<PopulationEventLike>(
        `SELECT id, event_type, count, date FROM population_events WHERE owner_id = $1 AND species = $2 AND target_id = $3`,
        [ownerId, row.species, row.target_id],
      );
      const remainingEvents = ledgerBefore.rows.filter((item) => item.id !== id);
      const initialCount = row.species === "poultry"
        ? Number((await client.query<{ initial_count: number }>(`SELECT initial_count FROM poultry_batches WHERE id = $1 AND owner_id = $2 FOR UPDATE`, [row.target_id, ownerId])).rows[0]?.initial_count ?? 0)
        : 1;
      if (!hasNonNegativePopulation(initialCount, remainingEvents)) throw new Error("NEGATIVE_POPULATION");
      if (row.species === "poultry") {
        const current = Number((await client.query<{ current_count: number }>(`SELECT current_count FROM poultry_batches WHERE id = $1 AND owner_id = $2`, [row.target_id, ownerId])).rows[0]?.current_count ?? 0);
        if (current !== populationAtDate(initialCount, ledgerBefore.rows)) throw new Error("POPULATION_SNAPSHOT_REQUIRES_BACKFILL");
      } else {
        const status = (await client.query<{ status: string }>(`SELECT status FROM livestock WHERE id = $1 AND owner_id = $2`, [row.target_id, ownerId])).rows[0]?.status ?? "active";
        if (status !== livestockStatusFromEvents(ledgerBefore.rows)) throw new Error("POPULATION_SNAPSHOT_REQUIRES_BACKFILL");
      }
      const deleted = await client.query(`DELETE FROM population_events WHERE id = $1 AND owner_id = $2`, [id, ownerId]);
      await client.query(
        `INSERT INTO event_audit_log (id, owner_id, event_id, action, changed_by, changed_at, before_state, after_state)
         VALUES ($1, $2, $3, $4, $2, $5, $6, $7)`,
        [crypto.randomUUID(), ownerId, id, action, new Date().toISOString(), JSON.stringify(row), JSON.stringify({})],
      );
      if (row.species === "poultry") {
        await client.query(`UPDATE poultry_batches SET current_count = $1 WHERE id = $2 AND owner_id = $3`, [Math.max(0, populationAtDate(initialCount, remainingEvents)), row.target_id, ownerId]);
      } else {
        await client.query(`UPDATE livestock SET status = $1 WHERE id = $2 AND owner_id = $3`, [livestockStatusFromEvents(remainingEvents), row.target_id, ownerId]);
      }
      await client.query("COMMIT");
      return result(deleted.rowCount);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },
};
