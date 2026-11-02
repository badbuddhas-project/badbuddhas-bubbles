-- Remembers the GetCourse export each reconcile job is waiting on, between cron runs.
-- GetCourse creates a new export per request and generates it for minutes, so a run can
-- only collect an export started by an earlier run. Service role only.
create table if not exists public.reconcile_exports (
  job text primary key,
  export_id text,
  started_at timestamptz,
  processed_at timestamptz
);

alter table public.reconcile_exports enable row level security;
