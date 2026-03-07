-- =============================================
-- Migration 009: Email confirmation tracking
-- =============================================
-- Tracks when a Telegram user confirmed their linked email.
-- Set by /auth/callback after Supabase email verification.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_confirmed_at TIMESTAMPTZ;
