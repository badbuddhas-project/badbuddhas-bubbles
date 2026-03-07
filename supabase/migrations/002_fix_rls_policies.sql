-- =============================================
-- Fix RLS policies for Telegram Auth
-- =============================================
-- The app uses Telegram auth (not Supabase Auth), so auth.uid() is always NULL.
-- Replace restrictive policies with permissive ones for anon role.
-- User-level data isolation is enforced at the application layer.

-- Drop old policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Anyone can view practices" ON practices;
DROP POLICY IF EXISTS "Users can view own favorites" ON favorites;
DROP POLICY IF EXISTS "Users can add favorites" ON favorites;
DROP POLICY IF EXISTS "Users can remove own favorites" ON favorites;
DROP POLICY IF EXISTS "Users can view own stats" ON user_stats;
DROP POLICY IF EXISTS "Users can update own stats" ON user_stats;
DROP POLICY IF EXISTS "Users can view own practice history" ON user_practices;
DROP POLICY IF EXISTS "Users can add practice history" ON user_practices;

-- Also drop new-style policies if they already exist (idempotent)
DROP POLICY IF EXISTS "Allow select users" ON users;
DROP POLICY IF EXISTS "Allow insert users" ON users;
DROP POLICY IF EXISTS "Allow update users" ON users;
DROP POLICY IF EXISTS "Allow delete users" ON users;
DROP POLICY IF EXISTS "Allow select favorites" ON favorites;
DROP POLICY IF EXISTS "Allow insert favorites" ON favorites;
DROP POLICY IF EXISTS "Allow delete favorites" ON favorites;
DROP POLICY IF EXISTS "Allow select user_stats" ON user_stats;
DROP POLICY IF EXISTS "Allow update user_stats" ON user_stats;
DROP POLICY IF EXISTS "Allow insert user_stats" ON user_stats;
DROP POLICY IF EXISTS "Allow select user_practices" ON user_practices;
DROP POLICY IF EXISTS "Allow insert user_practices" ON user_practices;

-- USERS
CREATE POLICY "Allow select users"
    ON users FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "Allow insert users"
    ON users FOR INSERT TO anon, authenticated WITH CHECK (TRUE);
CREATE POLICY "Allow update users"
    ON users FOR UPDATE TO anon, authenticated USING (TRUE);
CREATE POLICY "Allow delete users"
    ON users FOR DELETE TO anon, authenticated USING (TRUE);

-- PRACTICES
CREATE POLICY "Anyone can view practices"
    ON practices FOR SELECT TO anon, authenticated USING (TRUE);

-- FAVORITES
CREATE POLICY "Allow select favorites"
    ON favorites FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "Allow insert favorites"
    ON favorites FOR INSERT TO anon, authenticated WITH CHECK (TRUE);
CREATE POLICY "Allow delete favorites"
    ON favorites FOR DELETE TO anon, authenticated USING (TRUE);

-- USER_STATS
CREATE POLICY "Allow select user_stats"
    ON user_stats FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "Allow update user_stats"
    ON user_stats FOR UPDATE TO anon, authenticated USING (TRUE);
CREATE POLICY "Allow insert user_stats"
    ON user_stats FOR INSERT TO anon, authenticated WITH CHECK (TRUE);

-- USER_PRACTICES
CREATE POLICY "Allow select user_practices"
    ON user_practices FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "Allow insert user_practices"
    ON user_practices FOR INSERT TO anon, authenticated WITH CHECK (TRUE);
