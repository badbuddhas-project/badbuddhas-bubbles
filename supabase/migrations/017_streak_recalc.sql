-- =============================================
-- FUNCTION: Recompute streak stats from practice history
-- =============================================
-- Root cause of the "streak reset" bug: the client computed the streak
-- incrementally (insert practice, then a separate un-transactional update of
-- user_stats). If the second write was dropped (app closed right after a
-- session, network hiccup), last_practice_date lagged behind reality and the
-- NEXT session saw a >1 day gap and hard-reset the streak to 1.
--
-- Fix: make the streak authoritative from user_practices history, in a fixed
-- timezone (Europe/Moscow). Idempotent — recomputing always yields the correct
-- value, so a dropped call self-heals on the next practice instead of
-- permanently corrupting the streak.

CREATE OR REPLACE FUNCTION public.recalc_user_streak(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current  INTEGER := 0;
  v_longest  INTEGER := 0;
  v_last     DATE;
  v_total    INTEGER := 0;
  v_minutes  INTEGER := 0;
BEGIN
  -- Distinct practice days in the app's canonical timezone, grouped into
  -- consecutive runs via the classic date - row_number() gaps-and-islands trick.
  WITH days AS (
    SELECT DISTINCT (completed_at AT TIME ZONE 'Europe/Moscow')::date AS d
    FROM user_practices
    WHERE user_id = p_user_id
  ),
  grp AS (
    SELECT d, d - (row_number() OVER (ORDER BY d))::int AS g FROM days
  ),
  runs AS (
    SELECT max(d) AS e, count(*)::int AS len FROM grp GROUP BY g
  )
  SELECT
    coalesce((array_agg(len ORDER BY e DESC))[1], 0),  -- run ending on the latest day
    coalesce(max(len), 0),
    max(e)
  INTO v_current, v_longest, v_last
  FROM runs;

  SELECT count(*)::int, coalesce(sum(listened_seconds) / 60, 0)::int
  INTO v_total, v_minutes
  FROM user_practices
  WHERE user_id = p_user_id;

  UPDATE user_stats
  SET current_streak     = v_current,
      -- never reduce longest/totals (guards migrated legacy values)
      longest_streak     = greatest(longest_streak, v_longest),
      last_practice_date = v_last,
      total_practices    = greatest(total_practices, v_total),
      total_minutes      = greatest(total_minutes, v_minutes)
  WHERE user_id = p_user_id;

  RETURN v_current;
END;
$$;

GRANT EXECUTE ON FUNCTION public.recalc_user_streak(UUID) TO anon, authenticated;
