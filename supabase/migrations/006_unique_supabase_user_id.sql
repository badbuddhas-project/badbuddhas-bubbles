-- =============================================
-- Migration 006: Unique index on supabase_user_id
-- =============================================
-- Ensures one Supabase auth user maps to at most one app user.
-- Partial index: NULLs are excluded so Telegram-only users
-- (supabase_user_id IS NULL) can coexist freely.

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_supabase_user_id_unique
  ON users (supabase_user_id)
  WHERE supabase_user_id IS NOT NULL;
