import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import crypto from "crypto";
import { postgresPool, initializePostgresSchema } from "../src/postgres.js";
import {
  getActiveTargetsOnDate,
  getLiveCountOnDate,
  getLiveCountsByDay,
  getLastActiveDate,
  findRecordsAfterLastActiveDate,
} from "../src/asOfDate.service.js";

const TEST_USER_ID = "test-user-asofdate-" + crypto.randomUUID();
const TEST_BATCH_ID = crypto.randomUUID();
const TEST_LIVESTOCK_ID = crypto.randomUUID();

before(async () => {
  if (!postgresPool) {
    throw new Error("PostgreSQL pool not initialized for tests");
  }
  
  await initializePostgresSchema();
  
  // Create test user
  await postgresPool.query(
    `INSERT INTO users (id, name, email, password_hash, role, token_version, created_at)
     VALUES ($1, 'Test User', 'asofdate@test.com', 'hash', 'farmer', 0, $2)
     ON CONFLICT (email) DO NOTHING`,
    [TEST_USER_ID, new Date().toISOString()],
  );
  
  // Create test poultry batch with 100 birds
  await postgresPool.query(
    `INSERT INTO poultry_batches (id, owner_id, breed, purpose, initial_count, current_count, age_weeks, date_added, hatch_date)
     VALUES ($1, $2, 'Test Breed', 'layers', 100, 100, 10, '2024-01-01', '2023-10-20')`,
    [TEST_BATCH_ID, TEST_USER_ID],
  );
  
  // Create test livestock animal
  await postgresPool.query(
    `INSERT INTO livestock (id, owner_id, name, type, breed, age_years, date_added, status, date_of_birth)
     VALUES ($1, $2, 'Test Cow', 'cattle', 'Jersey', 3, '2024-01-01', 'active', '2021-01-01')`,
    [TEST_LIVESTOCK_ID, TEST_USER_ID],
  );
});

after(async () => {
  // Clean up test data
  if (postgresPool) {
    await postgresPool.query(`DELETE FROM population_events WHERE owner_id = $1`, [TEST_USER_ID]);
    await postgresPool.query(`DELETE FROM production WHERE owner_id = $1`, [TEST_USER_ID]);
    await postgresPool.query(`DELETE FROM poultry_batches WHERE owner_id = $1`, [TEST_USER_ID]);
    await postgresPool.query(`DELETE FROM livestock WHERE owner_id = $1`, [TEST_USER_ID]);
    await postgresPool.query(`DELETE FROM users WHERE id = $1`, [TEST_USER_ID]);
  }
});

describe("asOfDate.service", () => {
  it("should return initial count before any events", async () => {
    const count = await getLiveCountOnDate(TEST_USER_ID, TEST_BATCH_ID, "2024-01-15");
    assert.strictEqual(count, 100);
  });

  it("should correctly calculate count after death event", async () => {
    // Record death of 10 birds on 2024-02-01
    const eventId = crypto.randomUUID();
    await postgresPool.query(
      `INSERT INTO population_events (id, owner_id, species, target_id, target_name, event_type, count, date, reason, notes)
       VALUES ($1, $2, 'poultry', $3, 'Test Breed', 'death', 10, '2024-02-01', 'disease', '')`,
      [eventId, TEST_USER_ID, TEST_BATCH_ID],
    );
    
    // Count before event should still be 100
    const countBefore = await getLiveCountOnDate(TEST_USER_ID, TEST_BATCH_ID, "2024-01-31");
    assert.strictEqual(countBefore, 100);
    
    // Count after event should be 90
    const countAfter = await getLiveCountOnDate(TEST_USER_ID, TEST_BATCH_ID, "2024-02-02");
    assert.strictEqual(countAfter, 90);
  });

  it("should handle multiple events chronologically", async () => {
    // Add another death event
    const eventId2 = crypto.randomUUID();
    await postgresPool.query(
      `INSERT INTO population_events (id, owner_id, species, target_id, target_name, event_type, count, date, reason, notes)
       VALUES ($1, $2, 'poultry', $3, 'Test Breed', 'death', 5, '2024-02-15', 'predator', '')`,
      [eventId2, TEST_USER_ID, TEST_BATCH_ID],
    );
    
    // Count after both events
    const count = await getLiveCountOnDate(TEST_USER_ID, TEST_BATCH_ID, "2024-02-20");
    assert.strictEqual(count, 85); // 100 - 10 - 5
  });

  it("should filter active targets correctly", async () => {
    const activeTargets = await getActiveTargetsOnDate(TEST_USER_ID, "poultry", "2024-02-20");
    
    assert.strictEqual(activeTargets.length, 1);
    assert.strictEqual(activeTargets[0].targetId, TEST_BATCH_ID);
    assert.strictEqual(activeTargets[0].liveCount, 85);
  });

  it("should return daily counts for a date range", async () => {
    const counts = await getLiveCountsByDay(TEST_USER_ID, TEST_BATCH_ID, "2024-01-30", "2024-02-03");
    
    assert.strictEqual(counts.get("2024-01-30"), 100);
    assert.strictEqual(counts.get("2024-01-31"), 100);
    assert.strictEqual(counts.get("2024-02-01"), 90); // After first death event
    assert.strictEqual(counts.get("2024-02-02"), 90);
    assert.strictEqual(counts.get("2024-02-03"), 90);
  });

  it("should return null for last active date if still active", async () => {
    const lastDate = await getLastActiveDate(TEST_USER_ID, TEST_BATCH_ID);
    assert.strictEqual(lastDate, null);
  });

  it("should return last active date after complete sale", async () => {
    // Create a new batch for this test
    const testBatchId2 = crypto.randomUUID();
    await postgresPool.query(
      `INSERT INTO poultry_batches (id, owner_id, breed, purpose, initial_count, current_count, age_weeks, date_added, hatch_date)
       VALUES ($1, $2, 'Test Breed 2', 'broilers', 50, 50, 8, '2024-01-01', '2023-11-10')`,
      [testBatchId2, TEST_USER_ID],
    );
    
    // Record sale of all birds
    const saleEventId = crypto.randomUUID();
    await postgresPool.query(
      `INSERT INTO population_events (id, owner_id, species, target_id, target_name, event_type, count, date, reason, notes)
       VALUES ($1, $2, 'poultry', $3, 'Test Breed 2', 'sale', 50, '2024-03-01', 'market', '')`,
      [saleEventId, TEST_USER_ID, testBatchId2],
    );
    
    const lastDate = await getLastActiveDate(TEST_USER_ID, testBatchId2);
    assert.strictEqual(lastDate, "2024-03-01");
    
    // Clean up
    await postgresPool.query(`DELETE FROM population_events WHERE id = $1`, [saleEventId]);
    await postgresPool.query(`DELETE FROM poultry_batches WHERE id = $1`, [testBatchId2]);
  });

  it("should find records after last active date", async () => {
    // Create production record after death event
    const productionId = crypto.randomUUID();
    await postgresPool.query(
      `INSERT INTO production (id, owner_id, type, quantity, unit, date, target_id, animal_type, group_name)
       VALUES ($1, $2, 'eggs', 50, 'pieces', '2024-02-20', $3, 'poultry', 'Test Breed')`,
      [productionId, TEST_USER_ID, TEST_BATCH_ID],
    );
    
    const records = await findRecordsAfterLastActiveDate(TEST_USER_ID, TEST_BATCH_ID, "2024-02-15");
    
    assert.ok(records.production.length >= 1);
    
    // Clean up
    await postgresPool.query(`DELETE FROM production WHERE id = $1`, [productionId]);
  });

  it("should handle livestock correctly", async () => {
    const count = await getLiveCountOnDate(TEST_USER_ID, TEST_LIVESTOCK_ID, "2024-01-15");
    assert.strictEqual(count, 1);
    
    // Record death
    const deathEventId = crypto.randomUUID();
    await postgresPool.query(
      `INSERT INTO population_events (id, owner_id, species, target_id, target_name, event_type, count, date, reason, notes)
       VALUES ($1, $2, 'cattle', $3, 'Test Cow', 'death', 1, '2024-02-10', 'illness', '')`,
      [deathEventId, TEST_USER_ID, TEST_LIVESTOCK_ID],
    );
    
    const countBefore = await getLiveCountOnDate(TEST_USER_ID, TEST_LIVESTOCK_ID, "2024-02-09");
    assert.strictEqual(countBefore, 1);
    
    const countAfter = await getLiveCountOnDate(TEST_USER_ID, TEST_LIVESTOCK_ID, "2024-02-11");
    assert.strictEqual(countAfter, 0);
    
    // Clean up
    await postgresPool.query(`DELETE FROM population_events WHERE id = $1`, [deathEventId]);
  });
});
