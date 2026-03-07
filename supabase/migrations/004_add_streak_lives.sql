-- Add streak_lives column to user_stats
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS streak_lives INTEGER DEFAULT 3;
