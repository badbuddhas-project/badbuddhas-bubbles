ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- Backfill: existing non-premium users get 14 days from account creation
UPDATE public.users
SET trial_ends_at = created_at + INTERVAL '14 days'
WHERE is_premium = false
  AND trial_ends_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_trial_ends_at ON public.users(trial_ends_at);
