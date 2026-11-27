-- Stage 0: Temporal Consistency Foundation
-- Add columns for record review, audit logging, and daily count cache

-- Add needs_review flag to production, feeding, and vaccinations
ALTER TABLE production ADD COLUMN IF NOT EXISTS needs_review INTEGER DEFAULT 0;
ALTER TABLE feeding ADD COLUMN IF NOT EXISTS needs_review INTEGER DEFAULT 0;
ALTER TABLE vaccinations ADD COLUMN IF NOT EXISTS needs_review INTEGER DEFAULT 0;

-- Add indexes for filtering records that need review
CREATE INDEX IF NOT EXISTS idx_production_needs_review ON production(needs_review) WHERE needs_review = 1;
CREATE INDEX IF NOT EXISTS idx_feeding_needs_review ON feeding(needs_review) WHERE needs_review = 1;
CREATE INDEX IF NOT EXISTS idx_vaccinations_needs_review ON vaccinations(needs_review) WHERE needs_review = 1;

-- Add constraint: no future events on population_events
-- Note: We use a CHECK constraint on the date column
-- SQLite and PostgreSQL syntax slightly differ, but this works for both
ALTER TABLE population_events DROP CONSTRAINT IF EXISTS check_no_future_events;
ALTER TABLE population_events ADD CONSTRAINT check_no_future_events 
  CHECK (date <= CURRENT_DATE);

-- Event audit log table
CREATE TABLE IF NOT EXISTS event_audit_log (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('create', 'update', 'delete', 'undo')),
  changed_by TEXT NOT NULL,
  changed_at TEXT NOT NULL,
  before_state TEXT DEFAULT '',
  after_state TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_event_audit_owner_date ON event_audit_log(owner_id, changed_at);
CREATE INDEX IF NOT EXISTS idx_event_audit_event ON event_audit_log(event_id);

-- Farm daily counts cache table for performance
CREATE TABLE IF NOT EXISTS farm_daily_counts (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  target_id TEXT NOT NULL,
  target_name TEXT NOT NULL,
  species TEXT NOT NULL CHECK(species IN ('poultry', 'cattle')),
  live_count INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_farm_daily_owner_target_date ON farm_daily_counts(owner_id, target_id, date);
CREATE INDEX IF NOT EXISTS idx_farm_daily_owner_date ON farm_daily_counts(owner_id, date);
