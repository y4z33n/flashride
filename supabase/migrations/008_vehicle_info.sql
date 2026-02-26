-- ============================================================
-- FlashRide: Migration 008 — vehicle_info column on profiles
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ixjpeduqymfxdxsflfik/sql/new
-- ============================================================

-- Add vehicle_info column to store make/model/colour/plate as a single string.
-- Nullable — only drivers fill this in.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS vehicle_info TEXT;
