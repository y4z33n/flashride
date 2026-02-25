-- ============================================================
-- FlashRide: Fix messages RLS — driver messages visible to passengers
-- Run in: https://supabase.com/dashboard/project/ixjpeduqymfxdxsflfik/sql/new
-- ============================================================

-- Drop the broken policies
DROP POLICY IF EXISTS "messages_select_participants" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_participants" ON public.messages;

-- Recreate SELECT: use a cleaner subquery avoiding self-reference ambiguity
CREATE POLICY "messages_select_participants"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    auth.uid() = (
      SELECT driver_id FROM public.rides WHERE rides.id = messages.ride_id
    )
    OR EXISTS (
      SELECT 1 FROM public.ride_requests
      WHERE ride_requests.ride_id = messages.ride_id
        AND ride_requests.rider_id = auth.uid()
        AND ride_requests.status = 'accepted'
    )
  );

-- Recreate INSERT: same approach
CREATE POLICY "messages_insert_participants"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND (
      auth.uid() = (
        SELECT driver_id FROM public.rides WHERE rides.id = ride_id
      )
      OR EXISTS (
        SELECT 1 FROM public.ride_requests
        WHERE ride_requests.ride_id = messages.ride_id
          AND ride_requests.rider_id = auth.uid()
          AND ride_requests.status = 'accepted'
      )
    )
  );
