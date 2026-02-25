-- ============================================================
-- FlashRide: Step 4 Migration — Full Database Schema
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ixjpeduqymfxdxsflfik/sql/new
-- ============================================================

-- ============================================================
-- 1. RIDES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.rides (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  origin_address    TEXT NOT NULL,
  origin_lat        DOUBLE PRECISION NOT NULL,
  origin_lng        DOUBLE PRECISION NOT NULL,
  destination_address TEXT NOT NULL,
  destination_lat   DOUBLE PRECISION NOT NULL,
  destination_lng   DOUBLE PRECISION NOT NULL,
  departure_time    TIMESTAMPTZ NOT NULL,
  seats_total       INTEGER NOT NULL DEFAULT 3,
  seats_available   INTEGER NOT NULL DEFAULT 3,
  price_per_seat    NUMERIC(8,2),
  notes             TEXT,
  status            TEXT NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open','full','in_progress','completed','cancelled')),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX rides_driver_id_idx       ON public.rides(driver_id);
CREATE INDEX rides_status_idx          ON public.rides(status);
CREATE INDEX rides_departure_time_idx  ON public.rides(departure_time);

ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view open rides
CREATE POLICY "rides_select_authenticated"
  ON public.rides FOR SELECT
  TO authenticated
  USING (true);

-- Only driver can create a ride
CREATE POLICY "rides_insert_driver"
  ON public.rides FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = driver_id);

-- Only driver can update their own ride
CREATE POLICY "rides_update_driver"
  ON public.rides FOR UPDATE
  TO authenticated
  USING (auth.uid() = driver_id);

-- Only driver can delete their own ride
CREATE POLICY "rides_delete_driver"
  ON public.rides FOR DELETE
  TO authenticated
  USING (auth.uid() = driver_id);

CREATE TRIGGER rides_updated_at
  BEFORE UPDATE ON public.rides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

GRANT ALL ON public.rides TO authenticated;


-- ============================================================
-- 2. RIDE REQUESTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ride_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id     UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  rider_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seats_requested INTEGER NOT NULL DEFAULT 1,
  message     TEXT,
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending','accepted','rejected','cancelled')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (ride_id, rider_id)
);

CREATE INDEX ride_requests_ride_id_idx  ON public.ride_requests(ride_id);
CREATE INDEX ride_requests_rider_id_idx ON public.ride_requests(rider_id);
CREATE INDEX ride_requests_status_idx   ON public.ride_requests(status);

ALTER TABLE public.ride_requests ENABLE ROW LEVEL SECURITY;

-- Driver of the ride can see all requests for their ride
-- Rider can see their own requests
CREATE POLICY "ride_requests_select"
  ON public.ride_requests FOR SELECT
  TO authenticated
  USING (
    auth.uid() = rider_id
    OR auth.uid() = (SELECT driver_id FROM public.rides WHERE id = ride_id)
  );

-- Rider creates their own request
CREATE POLICY "ride_requests_insert_rider"
  ON public.ride_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = rider_id);

-- Driver OR rider can update (driver accepts/rejects, rider cancels)
CREATE POLICY "ride_requests_update"
  ON public.ride_requests FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = rider_id
    OR auth.uid() = (SELECT driver_id FROM public.rides WHERE id = ride_id)
  );

CREATE TRIGGER ride_requests_updated_at
  BEFORE UPDATE ON public.ride_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

GRANT ALL ON public.ride_requests TO authenticated;


-- ============================================================
-- 3. MESSAGES TABLE (per-ride chat)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id     UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  sender_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX messages_ride_id_idx   ON public.messages(ride_id);
CREATE INDEX messages_created_at_idx ON public.messages(created_at);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Only participants of a ride can read messages
-- Participants = driver + accepted riders
CREATE POLICY "messages_select_participants"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    auth.uid() = (SELECT driver_id FROM public.rides WHERE id = ride_id)
    OR auth.uid() IN (
      SELECT rider_id FROM public.ride_requests
      WHERE ride_id = messages.ride_id AND status = 'accepted'
    )
  );

-- Only participants can send messages
CREATE POLICY "messages_insert_participants"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND (
      auth.uid() = (SELECT driver_id FROM public.rides WHERE id = ride_id)
      OR auth.uid() IN (
        SELECT rider_id FROM public.ride_requests
        WHERE ride_id = messages.ride_id AND status = 'accepted'
      )
    )
  );

GRANT ALL ON public.messages TO authenticated;


-- ============================================================
-- 4. LOCATION UPDATES TABLE (real-time driver location)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.location_updates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id     UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  driver_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lat         DOUBLE PRECISION NOT NULL,
  lng         DOUBLE PRECISION NOT NULL,
  heading     DOUBLE PRECISION,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX location_updates_ride_id_idx ON public.location_updates(ride_id);

ALTER TABLE public.location_updates ENABLE ROW LEVEL SECURITY;

-- Participants can read location
CREATE POLICY "location_select_participants"
  ON public.location_updates FOR SELECT
  TO authenticated
  USING (
    auth.uid() = driver_id
    OR auth.uid() IN (
      SELECT rider_id FROM public.ride_requests
      WHERE ride_id = location_updates.ride_id AND status = 'accepted'
    )
  );

-- Only driver inserts their own location
CREATE POLICY "location_insert_driver"
  ON public.location_updates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = driver_id);

GRANT ALL ON public.location_updates TO authenticated;


-- ============================================================
-- 5. RATINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ratings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id      UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  rater_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rated_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score        INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
  comment      TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (ride_id, rater_id, rated_id)
);

CREATE INDEX ratings_rated_id_idx ON public.ratings(rated_id);

ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ratings_select_authenticated"
  ON public.ratings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "ratings_insert_own"
  ON public.ratings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = rater_id);

GRANT ALL ON public.ratings TO authenticated;


-- ============================================================
-- 6. PUSH TOKENS TABLE (for notifications)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token       TEXT NOT NULL,
  platform    TEXT CHECK (platform IN ('ios','android','web')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, token)
);

CREATE INDEX push_tokens_user_id_idx ON public.push_tokens(user_id);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_tokens_own"
  ON public.push_tokens FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER push_tokens_updated_at
  BEFORE UPDATE ON public.push_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

GRANT ALL ON public.push_tokens TO authenticated;


-- ============================================================
-- 7. AUTO-UPDATE seats_available TRIGGER
-- When a ride_request is accepted → decrement seats_available
-- When a ride_request is rejected/cancelled → increment back
-- ============================================================
CREATE OR REPLACE FUNCTION handle_seat_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Accepted: decrement seats
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    UPDATE public.rides
    SET seats_available = seats_available - NEW.seats_requested
    WHERE id = NEW.ride_id;

    -- If no seats left, mark ride as full
    UPDATE public.rides
    SET status = 'full'
    WHERE id = NEW.ride_id AND seats_available <= 0;
  END IF;

  -- Cancelled or rejected after being accepted: increment back
  IF OLD.status = 'accepted' AND NEW.status IN ('cancelled', 'rejected') THEN
    UPDATE public.rides
    SET seats_available = seats_available + NEW.seats_requested,
        status = CASE WHEN status = 'full' THEN 'open' ELSE status END
    WHERE id = NEW.ride_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER seat_count_trigger
  AFTER INSERT OR UPDATE ON public.ride_requests
  FOR EACH ROW EXECUTE FUNCTION handle_seat_count();


-- ============================================================
-- 8. AUTO-UPDATE profile rating averages TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_profile_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET
    rating_avg   = (SELECT ROUND(AVG(score)::NUMERIC, 2) FROM public.ratings WHERE rated_id = NEW.rated_id),
    rating_count = (SELECT COUNT(*) FROM public.ratings WHERE rated_id = NEW.rated_id)
  WHERE id = NEW.rated_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ratings_update_profile
  AFTER INSERT ON public.ratings
  FOR EACH ROW EXECUTE FUNCTION update_profile_rating();


-- ============================================================
-- 9. Enable Realtime for live subscriptions
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.rides;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ride_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.location_updates;
