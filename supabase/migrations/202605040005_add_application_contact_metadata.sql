alter table public.applications
  add column if not exists contact_name text,
  add column if not exists contact_email text;
