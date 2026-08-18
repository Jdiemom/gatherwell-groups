-- Groups by Gatherwell · Stage 2 database setup
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- Safe to run once. (Running twice will error on existing objects; that's okay to ignore.)

-- ============ profiles ============
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "read own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "update own profile" on public.profiles
  for update using (auth.uid() = id);

-- auto-create a profile when a user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ groups & membership ============
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  trip_type text,
  owner_id uuid not null references auth.users(id) on delete cascade,
  join_code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- helper: is the current user a member of this group?
create or replace function public.is_group_member(gid uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.group_members
    where group_id = gid and user_id = auth.uid()
  );
$$;

alter table public.groups enable row level security;
alter table public.group_members enable row level security;

create policy "members read group" on public.groups
  for select using (public.is_group_member(id));
create policy "owner updates group" on public.groups
  for update using (owner_id = auth.uid());
create policy "owner deletes group" on public.groups
  for delete using (owner_id = auth.uid());
-- inserts happen through the website's server (service role), which also checks the subscription

create policy "members read members" on public.group_members
  for select using (public.is_group_member(group_id));
create policy "leave group" on public.group_members
  for delete using (user_id = auth.uid());
-- member inserts happen through the website's server (join links)

-- ============ step progress ============
create table if not exists public.step_progress (
  group_id uuid not null references public.groups(id) on delete cascade,
  step_n int not null check (step_n between 1 and 9),
  completed_by uuid references auth.users(id),
  data jsonb not null default '{}'::jsonb,
  completed_at timestamptz not null default now(),
  primary key (group_id, step_n)
);
alter table public.step_progress enable row level security;

create policy "members read progress" on public.step_progress
  for select using (public.is_group_member(group_id));
create policy "organizer completes steps" on public.step_progress
  for insert with check (
    exists (select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid())
  );
create policy "organizer updates steps" on public.step_progress
  for update using (
    exists (select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid())
  );

-- ============ polls & votes ============
create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  step_n int not null check (step_n between 1 and 9),
  kind text not null default 'choice',      -- 'choice' | 'budget' (budget shows only totals)
  question text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  label text not null,
  meta text,
  sort int not null default 0
);

create table if not exists public.votes (
  poll_id uuid not null references public.polls(id) on delete cascade,
  option_id uuid not null references public.poll_options(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (poll_id, user_id)
);

alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.votes enable row level security;

create policy "members read polls" on public.polls
  for select using (public.is_group_member(group_id));
create policy "members read options" on public.poll_options
  for select using (
    exists (select 1 from public.polls p where p.id = poll_id and public.is_group_member(p.group_id))
  );
create policy "members read votes" on public.votes
  for select using (
    exists (select 1 from public.polls p where p.id = poll_id and public.is_group_member(p.group_id))
  );
create policy "members vote" on public.votes
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from public.polls p where p.id = poll_id and public.is_group_member(p.group_id))
  );
create policy "members change own vote" on public.votes
  for update using (user_id = auth.uid());
-- poll creation happens through the website's server when a group is created

-- ============ subscriptions (written by Stripe webhook via service role) ============
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text,                 -- 'solo' | 'group' | 'concierge'
  status text,               -- 'active' | 'trialing' | 'canceled' | ...
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;

create policy "read own subscription" on public.subscriptions
  for select using (auth.uid() = user_id);
-- all writes via service role (bypasses RLS)

-- ============ hotfixes applied in production (Jul 28, 2026) ============
-- Link members to profiles so the travelers list can show them.
do $$ begin
  alter table public.group_members
    add constraint group_members_user_id_profiles_fkey
    foreign key (user_id) references public.profiles(id) on delete cascade;
exception when duplicate_object then null; end $$;

-- Let members of the same group see each other's names.
do $$ begin
  create policy "groupmates read profiles" on public.profiles
    for select using (
      exists (
        select 1 from public.group_members me
        join public.group_members them on me.group_id = them.group_id
        where me.user_id = auth.uid() and them.user_id = profiles.id
      )
    );
exception when duplicate_object then null; end $$;
