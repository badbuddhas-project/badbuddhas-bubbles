-- Clear backfill: trial will be set on first login from June 19, not from created_at
UPDATE public.users SET trial_ends_at = NULL WHERE is_premium = false;
