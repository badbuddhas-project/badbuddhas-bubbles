-- =============================================
-- Breathwork with BadBuddhas - Initial Schema
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. USERS TABLE
-- =============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    telegram_id BIGINT UNIQUE NOT NULL,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    is_premium BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_telegram_id ON users(telegram_id);

-- =============================================
-- 2. PRACTICES TABLE
-- =============================================
CREATE TYPE practice_category AS ENUM ('relax', 'balance', 'energize');

CREATE TABLE practices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    title_ru TEXT NOT NULL,
    duration_seconds INTEGER NOT NULL,
    category practice_category NOT NULL,
    language TEXT NOT NULL DEFAULT 'ru',
    instructor_name TEXT NOT NULL,
    instructor_avatar_url TEXT,
    audio_url TEXT NOT NULL,
    preview_image_url TEXT,
    is_premium BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_practices_category ON practices(category);
CREATE INDEX idx_practices_sort_order ON practices(sort_order);

-- =============================================
-- 3. FAVORITES TABLE
-- =============================================
CREATE TABLE favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, practice_id)
);

CREATE INDEX idx_favorites_user_id ON favorites(user_id);

-- =============================================
-- 4. USER_STATS TABLE
-- =============================================
CREATE TABLE user_stats (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    total_practices INTEGER DEFAULT 0,
    total_minutes INTEGER DEFAULT 0,
    last_practice_date DATE,
    streak_lives INTEGER DEFAULT 3
);

-- =============================================
-- 5. USER_PRACTICES TABLE
-- =============================================
CREATE TABLE user_practices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    listened_seconds INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_user_practices_user_id ON user_practices(user_id);
CREATE INDEX idx_user_practices_completed_at ON user_practices(completed_at);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE practices ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_practices ENABLE ROW LEVEL SECURITY;

-- NOTE: This app uses Telegram auth (not Supabase Auth), so auth.uid() is
-- always NULL. RLS policies use permissive rules; user-level filtering
-- is enforced at the application layer via user_id in all queries.

-- USERS: Allow read/write for Telegram-authenticated app
CREATE POLICY "Allow select users"
    ON users FOR SELECT
    TO anon, authenticated
    USING (TRUE);

CREATE POLICY "Allow insert users"
    ON users FOR INSERT
    TO anon, authenticated
    WITH CHECK (TRUE);

CREATE POLICY "Allow update users"
    ON users FOR UPDATE
    TO anon, authenticated
    USING (TRUE);

CREATE POLICY "Allow delete users"
    ON users FOR DELETE
    TO anon, authenticated
    USING (TRUE);

-- PRACTICES: Anyone can read practices
CREATE POLICY "Anyone can view practices"
    ON practices FOR SELECT
    TO anon, authenticated
    USING (TRUE);

-- FAVORITES: Allow CRUD for Telegram-authenticated app
CREATE POLICY "Allow select favorites"
    ON favorites FOR SELECT
    TO anon, authenticated
    USING (TRUE);

CREATE POLICY "Allow insert favorites"
    ON favorites FOR INSERT
    TO anon, authenticated
    WITH CHECK (TRUE);

CREATE POLICY "Allow delete favorites"
    ON favorites FOR DELETE
    TO anon, authenticated
    USING (TRUE);

-- USER_STATS: Allow read/write for Telegram-authenticated app
CREATE POLICY "Allow select user_stats"
    ON user_stats FOR SELECT
    TO anon, authenticated
    USING (TRUE);

CREATE POLICY "Allow update user_stats"
    ON user_stats FOR UPDATE
    TO anon, authenticated
    USING (TRUE);

CREATE POLICY "Allow insert user_stats"
    ON user_stats FOR INSERT
    TO anon, authenticated
    WITH CHECK (TRUE);

-- USER_PRACTICES: Allow read/write for Telegram-authenticated app
CREATE POLICY "Allow select user_practices"
    ON user_practices FOR SELECT
    TO anon, authenticated
    USING (TRUE);

CREATE POLICY "Allow insert user_practices"
    ON user_practices FOR INSERT
    TO anon, authenticated
    WITH CHECK (TRUE);

-- =============================================
-- FUNCTION: Create user stats on user creation
-- =============================================
CREATE OR REPLACE FUNCTION create_user_stats()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_stats (user_id) VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_user_created
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_stats();
