-- Add language column to practices table
ALTER TABLE practices ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'ru';

CREATE INDEX IF NOT EXISTS idx_practices_language ON practices(language);
