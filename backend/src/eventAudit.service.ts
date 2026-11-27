import crypto from "node:crypto";
import { postgresPool } from "./postgres.js";

function getPool() {
  if (!postgresPool) {
    throw new Error("PostgreSQL pool is not initialized. Verify that DATABASE_URL is configured.");
  }
  return postgresPool;
}

export interface EventAuditLog {
  id: string;
  owner_id: string;
  event_id: string;
  action: "create" | "update" | "delete" | "undo";
  changed_by: string;
  changed_at: string;
  before_state: string;
  after_state: string;
}

/**
 * Creates an audit log entry for a population event
 */
export async function logEventAudit(
  ownerId: string,
  eventId: string,
  action: "create" | "update" | "delete" | "undo",
  changedBy: string,
  beforeState: any,
  afterState: any,
  client?: any,
): Promise<void> {
  const pool = client || getPool();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await pool.query(
    `INSERT INTO event_audit_log (id, owner_id, event_id, action, changed_by, changed_at, before_state, after_state)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      id,
      ownerId,
      eventId,
      action,
      changedBy,
      now,
      JSON.stringify(beforeState || {}),
      JSON.stringify(afterState || {}),
    ],
  );
}

/**
 * Retrieves the audit history for a specific event
 */
export async function getEventAuditHistory(
  eventId: string,
): Promise<EventAuditLog[]> {
  const pool = getPool();

  const query = await pool.query<EventAuditLog>(
    `SELECT id, owner_id, event_id, action, changed_by, changed_at, before_state, after_state
     FROM event_audit_log
     WHERE event_id = $1
     ORDER BY changed_at DESC`,
    [eventId],
  );

  return query.rows;
}
