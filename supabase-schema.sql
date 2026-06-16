create table if not exists public.dorm_app_state (
  id integer primary key default 1,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  constraint dorm_app_state_single_row check (id = 1)
);

alter table public.dorm_app_state enable row level security;

grant select, insert, update on public.dorm_app_state to anon;

drop policy if exists "dorm app can read state" on public.dorm_app_state;
create policy "dorm app can read state"
on public.dorm_app_state
for select
to anon
using (true);

drop policy if exists "dorm app can insert state" on public.dorm_app_state;
create policy "dorm app can insert state"
on public.dorm_app_state
for insert
to anon
with check (id = 1);

drop policy if exists "dorm app can update state" on public.dorm_app_state;
create policy "dorm app can update state"
on public.dorm_app_state
for update
to anon
using (id = 1)
with check (id = 1);

-- Optional but recommended: lets already-open browsers receive updates after
-- another device saves data.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'dorm_app_state'
  ) then
    alter publication supabase_realtime add table public.dorm_app_state;
  end if;
end $$;
