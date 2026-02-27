-- Migration 012: refresh_user_rating RPC
-- Called by the server after a new rating is inserted to keep
-- profiles.rating_avg and profiles.rating_count accurate.

CREATE OR REPLACE FUNCTION refresh_user_rating(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET
    rating_avg   = COALESCE((
      SELECT ROUND(AVG(score)::numeric, 2)
      FROM ratings
      WHERE rated_id = p_user_id
    ), 0),
    rating_count = (
      SELECT COUNT(*)
      FROM ratings
      WHERE rated_id = p_user_id
    ),
    updated_at = NOW()
  WHERE id = p_user_id;
END;
$$;
