-- ============================================================
-- FlashRide: Error logs table for production error tracking
-- Run in: Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.error_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level       TEXT NOT NULL CHECK (level IN ('error', 'warn', 'info')),
  message     TEXT NOT NULL,
  context     JSONB DEFAULT '{}',
  app_version TEXT,
  user_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX error_logs_level_idx      ON public.error_logs(level);
CREATE INDEX error_logs_created_at_idx ON public.error_logs(created_at DESC);

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Only the service role (server) can read all logs
-- Authenticated users can only insert their own errors
CREATE POLICY "error_logs_insert"
  ON public.error_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);
