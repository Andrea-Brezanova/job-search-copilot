alter table public.applications
  add column if not exists applied_at timestamptz,
  add column if not exists follow_up_at timestamptz,
  add column if not exists archived_at timestamptz;
