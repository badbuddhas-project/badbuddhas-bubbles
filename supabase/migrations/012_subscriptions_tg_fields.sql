ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS telegram_id BIGINT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS tg_username TEXT;
