-- Supabase setup for 3mtyy vault (run in SQL Editor)
-- https://supabase.com → New Project → SQL Editor → paste & run

create table if not exists visits (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  visitor_id text not null default '',
  device text default '',
  browser text default '',
  language text default '',
  timezone text default '',
  screen text default '',
  entry text default 'password_unlock'
);

create index if not exists visits_created_at_idx on visits (created_at desc);
create index if not exists visits_visitor_id_idx on visits (visitor_id);

alter table visits enable row level security;

drop policy if exists "visits_insert_anon" on visits;
create policy "visits_insert_anon" on visits
  for insert to anon with check (true);

drop policy if exists "visits_select_anon" on visits;
create policy "visits_select_anon" on visits
  for select to anon using (true);

-- Optional: block updates/deletes from public API (no policies = denied)
