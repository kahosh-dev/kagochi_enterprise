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

function result(changes: number | null): StoreResult {
  return { changes: changes ?? 0 };
}

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

function orderedValues(
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
    if (column === "status") return "active";
    if (column === "destination") return "produced";
    if (
      column === "purchase_price" ||
      column === "selling_price" ||
      column === "cost" ||
      column === "booster_interval_days" ||
      column === "age_days_due" ||
      column === "quantity"
    ) {
      return 0;
    }

    return "";
  });
}

export const postgresStore: FarmStore = {
  async findUserByEmail(email): Promise<UserRow | undefined> {
    const query = await postgresPool.query<UserRow>(
      `SELECT id, name, email, password_hash, role, token_version, created_at
       FROM users WHERE email = $1`,
      [normalizeEmail(email)],
    );

    return query.rows[0];
  },

  async findUserById(id): Promise<UserRow | undefined> {
    const query = await postgresPool.query<UserRow>(
      `SELECT id, name, email, password_hash, role, token_version, created_at
       FROM users WHERE id = $1`,
      [id],
    );

    return query.rows[0];
  },

  async createUser(id, name, email, passwordHash, role = "farmer") {
    const query = await postgresPool.query(
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
    const query = await postgresPool.query(
      `UPDATE users SET token_version = token_version + 1 WHERE id = $1`,
      [id],
    );

    return result(query.rowCount);
  },

  async setUserPassword(id, passwordHash) {
    const query = await postgresPool.query(
      `UPDATE users
       SET password_hash = $1, token_version = token_version + 1
       WHERE id = $2`,
      [passwordHash, id],
    );

    return result(query.rowCount);
  },

  async setUserRole(id, role) {
    const query = await postgresPool.query(
      `UPDATE users SET role = $1 WHERE id = $2`,
      [role, id],
    );

    return result(query.rowCount);
  },

  async countAdmins(): Promise<number> {
    const query = await postgresPool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM users WHERE role = 'admin'`,
    );

    return Number(query.rows[0]?.count ?? 0);
  },

  async getAllUsers(): Promise<AdminUserRow[]> {
    const query = await postgresPool.query<AdminUserRow>(
      `SELECT id, name, email, role, created_at
       FROM users ORDER BY created_at DESC`,
    );

    return query.rows;
  },

  async adminUpdateUser(id, name, email, role) {
    const query = await postgresPool.query(
      `UPDATE users SET name = $1, email = $2, role = $3 WHERE id = $4`,
      [name.trim(), normalizeEmail(email), role, id],
    );

    return result(query.rowCount);
  },

  async adminDeleteUser(id) {
    const query = await postgresPool.query(
      `DELETE FROM users WHERE id = $1`,
      [id],
    );

    return result(query.rowCount);
  },

  async createFarm(id, ownerId, farmName, location, phone) {
    const query = await postgresPool.query(
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
    const query = await postgresPool.query<FarmRow>(
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
    const { table, columns, dateColumn } = resourceTables[resource];

    const query = await postgresPool.query<RecordRow>(
      `SELECT id, ${columns.join(", ")}
       FROM ${table}
       WHERE owner_id = $1
       ORDER BY ${dateColumn} DESC, id DESC`,
      [ownerId],
    );

    return query.rows;
  },

  async createRecord(resource, id, ownerId, values) {
    const { table, columns } = resourceTables[resource];
    const placeholders = columns.map((_, index) => `$${index + 3}`).join(", ");
    const names = ["id", "owner_id", ...columns].join(", ");

    const query = await postgresPool.query(
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

    const query = await postgresPool.query(
      `UPDATE ${table} SET ${assignments}
       WHERE id = $${columns.length + 1}
         AND owner_id = $${columns.length + 2}`,
      [...orderedValues(resource, values), id, ownerId],
    );

    return result(query.rowCount);
  },

  async deleteRecord(resource, id, ownerId) {
    const { table } = resourceTables[resource];

    const query = await postgresPool.query(
      `DELETE FROM ${table} WHERE id = $1 AND owner_id = $2`,
      [id, ownerId],
    );

    return result(query.rowCount);
  },

  async listPopulationEvents(ownerId, species, targetId) {
    let sql = `SELECT id, owner_id, species, target_id, target_name, event_type, count, date, reason, notes
               FROM population_events WHERE owner_id = $1`;
    const params: unknown[] = [ownerId];
    if (species)  { sql += ` AND species = $${params.length + 1}`;   params.push(species); }
    if (targetId) { sql += ` AND target_id = $${params.length + 1}`; params.push(targetId); }
    sql += ` ORDER BY date DESC, id DESC`;
    const query = await postgresPool.query(sql, params);
    return query.rows;
  },

  async createPopulationEvent(id, ownerId, data) {
    // Guard: prevent negative population
    const reducingTypes = ['death', 'sale', 'transfer_out'];
    if (reducingTypes.includes(data.event_type)) {
      const netQ = await postgresPool.query<{ net: string }>(
        `SELECT
           COALESCE(SUM(CASE WHEN event_type IN ('addition','transfer_in') THEN count ELSE 0 END), 0)
           - COALESCE(SUM(CASE WHEN event_type IN ('death','sale','transfer_out') THEN count ELSE 0 END), 0)
           AS net
         FROM population_events WHERE owner_id = $1 AND target_id = $2`,
        [ownerId, data.target_id],
      );
      let initialCount = 0;
      if (data.species === 'poultry') {
        const batchQ = await postgresPool.query<{ initial_count: number }>(
          `SELECT initial_count FROM poultry_batches WHERE id = $1 AND owner_id = $2`,
          [data.target_id, ownerId],
        );
        initialCount = batchQ.rows[0]?.initial_count ?? 0;
      } else {
        const animalQ = await postgresPool.query(
          `SELECT id FROM livestock WHERE id = $1 AND owner_id = $2`,
          [data.target_id, ownerId],
        );
        initialCount = animalQ.rows.length > 0 ? 1 : 0;
      }
      const net = Number(netQ.rows[0]?.net ?? 0);
      if (initialCount + net - data.count < 0) {
        throw new Error('NEGATIVE_POPULATION');
      }
    }
    await postgresPool.query(
      `INSERT INTO population_events (id, owner_id, species, target_id, target_name, event_type, count, date, reason, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [id, ownerId, data.species, data.target_id, data.target_name, data.event_type, data.count, data.date, data.reason, data.notes],
    );
  },

  async deletePopulationEvent(id, ownerId) {
    const query = await postgresPool.query(
      `DELETE FROM population_events WHERE id = $1 AND owner_id = $2`,
      [id, ownerId],
    );
    return result(query.rowCount);
  },
};
