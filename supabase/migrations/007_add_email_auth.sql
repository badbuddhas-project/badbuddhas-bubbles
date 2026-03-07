-- =============================================
-- Migration 007: Email + password authentication
-- =============================================
-- Adds password_hash column for web email/password login.
-- email column already exists (from migration 005).
-- telegram_id is already nullable (from database types).

-- Add password_hash column (for bcrypt hashes)
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Add UNIQUE constraint to email if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_email_key' AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email);
  END IF;
END $$;

-- Index for fast email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
