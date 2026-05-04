update public.applications
set status = 'draft'
where status is null;

alter table public.applications
  alter column status set default 'draft';

alter table public.applications
  drop constraint if exists applications_status_check;

alter table public.applications
  add constraint applications_status_check
  check (status in ('draft', 'applied', 'interview', 'offer', 'rejected', 'archived'));
