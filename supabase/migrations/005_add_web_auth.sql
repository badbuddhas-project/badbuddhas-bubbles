-- =============================================
-- Migration 005: Add Web Auth Support
-- =============================================
-- Adds fields for browser-based auth (Email + Google OAuth)
-- while keeping Telegram auth working unchanged.

-- Add web auth columns to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'telegram',
  ADD COLUMN IF NOT EXISTS supabase_user_id UUID;

-- Make telegram_id nullable (web users won't have one)
ALTER TABLE users ALTER COLUMN telegram_id DROP NOT NULL;

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_supabase_id ON users(supabase_user_id);
