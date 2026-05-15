alter table public.preferences
  drop constraint if exists preferences_user_id_fkey;
alter table public.preferences
  add constraint preferences_user_id_fkey
  foreign key (user_id)
  references auth.users(id)
  on delete cascade
  not valid;

alter table public.resumes
  drop constraint if exists resumes_user_id_fkey;
alter table public.resumes
  add constraint resumes_user_id_fkey
  foreign key (user_id)
  references auth.users(id)
  on delete cascade
  not valid;

alter table public.applications
  drop constraint if exists applications_user_id_fkey;
alter table public.applications
  add constraint applications_user_id_fkey
  foreign key (user_id)
  references auth.users(id)
  on delete cascade
  not valid;

alter table public.preferences enable row level security;
alter table public.resumes enable row level security;
alter table public.applications enable row level security;

drop policy if exists preferences_select_own on public.preferences;
create policy preferences_select_own
on public.preferences
for select
using (auth.uid() = user_id);

drop policy if exists preferences_insert_own on public.preferences;
create policy preferences_insert_own
on public.preferences
for insert
with check (auth.uid() = user_id);

drop policy if exists preferences_update_own on public.preferences;
create policy preferences_update_own
on public.preferences
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists preferences_delete_own on public.preferences;
create policy preferences_delete_own
on public.preferences
for delete
using (auth.uid() = user_id);

drop policy if exists resumes_select_own on public.resumes;
create policy resumes_select_own
on public.resumes
for select
using (auth.uid() = user_id);

drop policy if exists resumes_insert_own on public.resumes;
create policy resumes_insert_own
on public.resumes
for insert
with check (auth.uid() = user_id);

drop policy if exists resumes_update_own on public.resumes;
create policy resumes_update_own
on public.resumes
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists resumes_delete_own on public.resumes;
create policy resumes_delete_own
on public.resumes
for delete
using (auth.uid() = user_id);

drop policy if exists applications_select_own on public.applications;
create policy applications_select_own
on public.applications
for select
using (auth.uid() = user_id);

drop policy if exists applications_insert_own on public.applications;
create policy applications_insert_own
on public.applications
for insert
with check (auth.uid() = user_id);

drop policy if exists applications_update_own on public.applications;
create policy applications_update_own
on public.applications
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists applications_delete_own on public.applications;
create policy applications_delete_own
on public.applications
for delete
using (auth.uid() = user_id);
