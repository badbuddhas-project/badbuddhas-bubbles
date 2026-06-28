CREATE TABLE IF NOT EXISTS public.notification_log (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  telegram_id  BIGINT      NOT NULL,
  trigger      TEXT        NOT NULL,
  group_       TEXT        NOT NULL CHECK (group_ IN ('treatment', 'holdout')),
  sent_at      TIMESTAMPTZ,
  message_id   BIGINT,
  delivered    BOOLEAN     NOT NULL DEFAULT true,
  bot_blocked  BOOLEAN     NOT NULL DEFAULT false,
  clicked_at   TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, trigger)
);

CREATE INDEX idx_notification_log_user_id  ON public.notification_log(user_id);
CREATE INDEX idx_notification_log_trigger  ON public.notification_log(trigger);
CREATE INDEX idx_notification_log_sent_at  ON public.notification_log(sent_at);

ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access notification_log"
  ON public.notification_log FOR ALL
  USING (auth.role() = 'service_role');
