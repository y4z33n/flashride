-- ============================================================
-- FlashRide: Set REPLICA IDENTITY FULL on ride_requests
-- This ensures Supabase Realtime UPDATE events include the
-- full new row values (payload.new) so riders see status
-- changes instantly without needing to reload.
-- Run in: Supabase SQL Editor
-- ============================================================

ALTER TABLE public.ride_requests REPLICA IDENTITY FULL;
