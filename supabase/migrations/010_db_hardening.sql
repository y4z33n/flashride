-- ============================================================
-- FlashRide: Migration 010 — Database Hardening
-- Adds: constraints, composite indexes, audit_events, reports
--
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ixjpeduqymfxdxsflfik/sql/new
-- ============================================================


-- ============================================================
-- SECTION 1: CONSTRAINTS
-- Prevent invalid data at the DB level — no app-level bug can bypass these.
-- ============================================================

-- seats_available can never go below 0
ALTER TABLE public.rides
  ADD CONSTRAINT rides_seats_available_non_negative
  CHECK (seats_available >= 0);

-- seats_available can never exceed seats_total
ALTER TABLE public.rides
  ADD CONSTRAINT rides_seats_available_lte_total
  CHECK (seats_available <= seats_total);

-- seats_total must be between 1 and 8 (realistic for carpooling)
ALTER TABLE public.rides
  ADD CONSTRAINT rides_seats_total_range
  CHECK (seats_total BETWEEN 1 AND 8);

-- seats_requested must be at least 1
ALTER TABLE public.ride_requests
  ADD CONSTRAINT ride_requests_seats_min
  CHECK (seats_requested >= 1);

-- price_per_seat must be non-negative if provided
ALTER TABLE public.rides
  ADD CONSTRAINT rides_price_non_negative
  CHECK (price_per_seat IS NULL OR price_per_seat >= 0);

-- rating score enforced 1–5 (already exists but make explicit)
-- Already: CHECK (score BETWEEN 1 AND 5) in 002_schema.sql — skip duplicate

-- profiles: rating_avg must be 0–5
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_rating_avg_range
  CHECK (rating_avg BETWEEN 0 AND 5);

-- profiles: rating_count non-negative
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_rating_count_non_negative
  CHECK (rating_count >= 0);


-- ============================================================
-- SECTION 2: COMPOSITE INDEXES
-- Speed up the most common query patterns.
-- ============================================================

-- Ride search: filter by status + sort by departure time (most common query)
CREATE INDEX IF NOT EXISTS rides_status_departure_idx
  ON public.rides (status, departure_time ASC);

-- Ride requests: look up all requests for a ride filtered by status
CREATE INDEX IF NOT EXISTS ride_requests_ride_status_idx
  ON public.ride_requests (ride_id, status);

-- Messages: paginate chat for a ride in order
CREATE INDEX IF NOT EXISTS messages_ride_created_idx
  ON public.messages (ride_id, created_at ASC);

-- Location updates: get latest location for a ride
CREATE INDEX IF NOT EXISTS location_updates_ride_updated_idx
  ON public.location_updates (ride_id, updated_at DESC);

-- Ratings: look up all ratings for a user
CREATE INDEX IF NOT EXISTS ratings_rated_created_idx
  ON public.ratings (rated_id, created_at DESC);

-- Push tokens: look up tokens by user
CREATE INDEX IF NOT EXISTS push_tokens_user_idx
  ON public.push_tokens (user_id);


-- ============================================================
-- SECTION 3: AUDIT EVENTS TABLE
-- Immutable log of every important action in the system.
-- Written to by the Node backend (service role only) — never by users.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.audit_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action       TEXT NOT NULL,         -- e.g. 'ride.created', 'user.blocked', 'request.accepted'
  entity_type  TEXT NOT NULL,         -- e.g. 'ride', 'user', 'request', 'report'
  entity_id    UUID,                  -- ID of the affected row
  metadata     JSONB DEFAULT '{}',    -- extra context (old values, IP, etc.)
  ip_address   TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX audit_events_actor_idx       ON public.audit_events (actor_id);
CREATE INDEX audit_events_entity_idx      ON public.audit_events (entity_type, entity_id);
CREATE INDEX audit_events_created_at_idx  ON public.audit_events (created_at DESC);
CREATE INDEX audit_events_action_idx      ON public.audit_events (action);

ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- Regular users: no access at all — this table is backend/admin only
-- Node backend uses service role key which bypasses RLS completely.
-- Admin panel reads via Node admin endpoints (Step 12).
CREATE POLICY "audit_events_no_user_access"
  ON public.audit_events FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- Service role (Node backend) bypasses RLS — no extra grant needed.


-- ============================================================
-- SECTION 4: REPORTS TABLE
-- Users can report other users or rides. Admins review in the panel.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.reports (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ride_id          UUID REFERENCES public.rides(id) ON DELETE SET NULL,
  reason           TEXT NOT NULL
                   CHECK (reason IN (
                     'unsafe_driving',
                     'harassment',
                     'no_show',
                     'fraud',
                     'inappropriate_content',
                     'other'
                   )),
  description      TEXT,
  status           TEXT NOT NULL DEFAULT 'open'
                   CHECK (status IN ('open', 'in_review', 'resolved', 'dismissed')),
  resolved_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),

  -- A user cannot report the same person for the same ride twice
  UNIQUE (reporter_id, reported_user_id, ride_id)
);

CREATE INDEX reports_reporter_idx         ON public.reports (reporter_id);
CREATE INDEX reports_reported_user_idx    ON public.reports (reported_user_id);
CREATE INDEX reports_status_idx           ON public.reports (status);
CREATE INDEX reports_created_at_idx       ON public.reports (created_at DESC);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Users can CREATE their own reports
CREATE POLICY "reports_insert_own"
  ON public.reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

-- Users can only READ their own submitted reports (not see others' reports)
CREATE POLICY "reports_select_own"
  ON public.reports FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id);

-- Users cannot update or delete reports — only admins can (via service role)
-- No UPDATE or DELETE policy for authenticated users.

CREATE TRIGGER reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- SECTION 5: USER BLOCKING TABLE
-- Tracks blocked users. Admins (via Node) write to this.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.blocked_users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- NULL = blocked by admin
  reason       TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE INDEX blocked_users_user_id_idx ON public.blocked_users (user_id);
CREATE INDEX blocked_users_active_idx  ON public.blocked_users (is_active) WHERE is_active = TRUE;

ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

-- Users can check if they themselves are blocked (needed for app-level UX)
CREATE POLICY "blocked_users_select_own"
  ON public.blocked_users FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- All writes go through the Node backend (service role) only.

CREATE TRIGGER blocked_users_updated_at
  BEFORE UPDATE ON public.blocked_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- SECTION 6: ADD is_blocked COLUMN TO PROFILES
-- Denormalised fast-check: avoids a JOIN on every auth request.
-- Node backend keeps this in sync with blocked_users table.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS profiles_is_blocked_idx
  ON public.profiles (is_blocked) WHERE is_blocked = TRUE;


-- ============================================================
-- SECTION 7: VERIFY — sanity check queries (run manually)
-- ============================================================

-- After applying, confirm constraints exist:
-- SELECT conname, contype FROM pg_constraint
--   WHERE conrelid = 'public.rides'::regclass
--   ORDER BY conname;

-- Confirm indexes exist:
-- SELECT indexname FROM pg_indexes
--   WHERE schemaname = 'public'
--   ORDER BY tablename, indexname;

-- Confirm new tables:
-- SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public'
--   ORDER BY table_name;
