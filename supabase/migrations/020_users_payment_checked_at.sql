-- When the app last asked GetCourse whether this non-premium user has paid.
-- Limits the check on app open: GetCourse runs one export at a time per account.
alter table public.users
  add column if not exists payment_checked_at timestamptz;
