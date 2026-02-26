-- ============================================================
-- FlashRide: Location Updates RLS + realtime fix
-- Run in: Supabase SQL Editor
-- ============================================================

-- Set REPLICA IDENTITY FULL so UPDATE events carry new row values in realtime
-- (required for Supabase Realtime to broadcast UPDATE payloads)
ALTER TABLE public.location_updates REPLICA IDENTITY FULL;

-- Add updated_at if missing
ALTER TABLE public.location_updates
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Drop old policies if they exist
DROP POLICY IF EXISTS "location_updates_select" ON public.location_updates;
DROP POLICY IF EXISTS "location_updates_insert" ON public.location_updates;
DROP POLICY IF EXISTS "location_updates_update" ON public.location_updates;

-- SELECT: driver + accepted riders can read
CREATE POLICY "location_updates_select"
  ON public.location_updates FOR SELECT
  TO authenticated
  USING (
    auth.uid() = driver_id
    OR auth.uid() = (SELECT driver_id FROM public.rides WHERE rides.id = location_updates.ride_id)
    OR EXISTS (
      SELECT 1 FROM public.ride_requests
      WHERE ride_requests.ride_id = location_updates.ride_id
        AND ride_requests.rider_id = auth.uid()
        AND ride_requests.status = 'accepted'
    )
  );

-- INSERT: only the driver of that ride
CREATE POLICY "location_updates_insert"
  ON public.location_updates FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = driver_id
    AND auth.uid() = (SELECT driver_id FROM public.rides WHERE rides.id = ride_id)
  );

-- UPDATE: only the driver
CREATE POLICY "location_updates_update"
  ON public.location_updates FOR UPDATE
  TO authenticated
  USING (auth.uid() = driver_id);

-- Note: location_updates is already added to supabase_realtime publication
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.location_updates;
