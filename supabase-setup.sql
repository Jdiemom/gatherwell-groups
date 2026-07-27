-- Groups by Gatherwell · Stage 1 database setup
-- Paste this whole file into Supabase → SQL Editor → New query → Run.

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null unique,
  group_size text,
  trip_timing text
);

-- Lock the table down. The website writes to it through a private server key,
-- so nobody on the public internet can read or change your list.
alter table public.waitlist enable row level security;

-- No public policies are created on purpose: with row level security on and no
-- policies, the anon (public) key can neither read nor write this table.
-- The service role key used by the website's server bypasses RLS by design.

-- Helpful view for you: newest sign-ups first.
create or replace view public.waitlist_recent as
  select created_at, name, email, group_size, trip_timing
  from public.waitlist
  order by created_at desc;
