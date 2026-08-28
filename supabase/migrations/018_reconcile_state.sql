-- Single-row state for the self-healing subscription reconciliation cron
-- (/api/cron/reconcile-subscriptions). Holds the id of the GetCourse export
-- started on the previous run, so the next run can fetch it once GC has finished
-- generating it (GC exports are async and take minutes).

create table if not exists public.reconcile_state (
  id int primary key default 1,
  pending_export_id text,
  started_at timestamptz,
  updated_at timestamptz default now(),
  constraint reconcile_state_singleton check (id = 1)
);

insert into public.reconcile_state (id) values (1) on conflict (id) do nothing;
