alter table public.applications
  add column if not exists follow_up_email_draft text null;
