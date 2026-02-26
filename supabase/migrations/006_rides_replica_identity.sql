-- ============================================================
-- FlashRide: Set REPLICA IDENTITY FULL on rides table
-- Ensures Supabase Realtime UPDATE events include full row
-- data (payload.new) so screens update instantly on status changes.
-- Run in: Supabase SQL Editor
-- ============================================================

ALTER TABLE public.rides REPLICA IDENTITY FULL;
