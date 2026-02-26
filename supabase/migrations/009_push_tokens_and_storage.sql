-- ============================================================
-- FlashRide: Migration 009 — push_tokens table & storage bucket
-- Run in Supabase SQL Editor
-- ============================================================

-- Push tokens table: stores Expo push tokens per user/device
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token       TEXT NOT NULL,
  platform    TEXT,          -- 'ios' | 'android'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, token)
);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own tokens
CREATE POLICY "push_tokens_own" ON public.push_tokens
  FOR ALL USING (auth.uid() = user_id);

-- Service role can read all tokens (for Edge Function)
CREATE POLICY "push_tokens_service_read" ON public.push_tokens
  FOR SELECT USING (true);

-- Index for fast lookup by user
CREATE INDEX IF NOT EXISTS push_tokens_user_id_idx ON public.push_tokens(user_id);

-- ── Avatar Storage Bucket ─────────────────────────────────
-- Create a public 'avatars' bucket for profile photos.
-- Run this in the Supabase Storage section OR use SQL below.

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own avatar
CREATE POLICY "avatars_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow public read of avatars
CREATE POLICY "avatars_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- Allow users to update/delete their own avatar
CREATE POLICY "avatars_owner_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "avatars_owner_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
