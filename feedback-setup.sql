-- Groups by Gatherwell: the live feedback table.
-- Paste this whole file into Supabase -> SQL Editor -> New query -> Run.

-- ============================================================
-- Live feedback ("what should we build next?"), added Sep 2026.
-- Anyone can leave feedback, signed in or not, so the app writes
-- with the service role. Nobody can read it back from the browser:
-- Julie reads it in the Supabase table editor and by email.
-- Safe to run more than once.
-- ============================================================

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'idea' check (kind in ('idea','confusing','broken','praise')),
  message text not null,
  page text,
  email text,
  name text,
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'new' check (status in ('new','reviewed','planned','shipped','declined')),
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;
-- No policies on purpose. Only the service role (the API route) can write,
-- and only you can read it, in the Supabase dashboard.

create index if not exists feedback_created_idx on public.feedback (created_at desc);
create index if not exists feedback_status_idx on public.feedback (status);
