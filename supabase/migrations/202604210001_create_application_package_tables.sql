-- This migration creates the Phase 1.5 tables for saved resumes and applications.
create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  target_roles_json jsonb,
  preferred_locations_json jsonb,
  work_mode_preference text,
  salary_expectation_min integer,
  salary_expectation_max integer,
  languages_json jsonb,
  cover_letter_tone text,
  email_tone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  file_name text,
  raw_resume_text text not null,
  parsed_resume_json jsonb,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  resume_id uuid references public.resumes(id) on delete set null,
  job_source_type text not null default 'manual_text',
  job_url text,
  raw_job_text text not null,
  parsed_job_json jsonb,
  company_name text,
  role_title text not null,
  location_text text,
  fit_summary text,
  fit_score integer,
  cover_letter_draft text not null,
  email_draft text not null,
  status text not null default 'draft' check (status in ('draft', 'applied', 'interview', 'rejected')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists preferences_set_updated_at on public.preferences;
create trigger preferences_set_updated_at
before update on public.preferences
for each row
execute function public.set_updated_at();

drop trigger if exists resumes_set_updated_at on public.resumes;
create trigger resumes_set_updated_at
before update on public.resumes
for each row
execute function public.set_updated_at();

drop trigger if exists applications_set_updated_at on public.applications;
create trigger applications_set_updated_at
before update on public.applications
for each row
execute function public.set_updated_at();
