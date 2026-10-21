-- DreamEx Tech authenticated cloud persistence and team RBAC.
-- Apply in a Supabase project before setting VITE_SUPABASE_* build variables.
-- Only the public anon key is used by the client; never expose service_role credentials.

create extension if not exists pgcrypto;

create table if not exists public.workspace_snapshots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  workspace_key text not null check (workspace_key ~ '^[a-z0-9][a-z0-9-]{0,79}$'),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspace_snapshots_owner_key_unique unique (owner_id, workspace_key)
);

create table if not exists public.workspace_teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 100),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_team_members (
  team_id uuid not null references public.workspace_teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'editor', 'viewer')),
  added_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create table if not exists public.team_workspace_snapshots (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.workspace_teams(id) on delete cascade,
  workspace_key text not null check (workspace_key ~ '^[a-z0-9][a-z0-9-]{0,79}$'),
  payload jsonb not null default '{}'::jsonb,
  updated_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint team_workspace_snapshots_team_key_unique unique (team_id, workspace_key)
);

alter table public.workspace_snapshots enable row level security;
alter table public.workspace_teams enable row level security;
alter table public.workspace_team_members enable row level security;
alter table public.team_workspace_snapshots enable row level security;

-- SECURITY DEFINER membership check avoids recursive RLS policy evaluation.
-- It can only ask about the currently authenticated user, never an arbitrary user ID.
create or replace function public.is_workspace_team_member(p_team_id uuid, p_roles text[] default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_team_members as m
    where m.team_id = p_team_id
      and m.user_id = (select auth.uid())
      and (p_roles is null or m.role = any(p_roles))
  );
$$;

revoke all on function public.is_workspace_team_member(uuid, text[]) from public, anon;
grant execute on function public.is_workspace_team_member(uuid, text[]) to authenticated;

-- Creating a team automatically creates the first owner membership.
create or replace function public.add_workspace_team_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.workspace_team_members (team_id, user_id, role, added_by)
  values (new.id, new.created_by, 'owner', new.created_by)
  on conflict (team_id, user_id) do nothing;
  return new;
end;
$$;

revoke all on function public.add_workspace_team_owner() from public, anon, authenticated;
drop trigger if exists workspace_team_owner_after_insert on public.workspace_teams;
create trigger workspace_team_owner_after_insert
  after insert on public.workspace_teams
  for each row execute function public.add_workspace_team_owner();

-- Personal snapshots: an authenticated user can only read/write their own rows.
drop policy if exists "Users read their own workspace snapshots" on public.workspace_snapshots;
create policy "Users read their own workspace snapshots"
  on public.workspace_snapshots for select to authenticated
  using (owner_id = (select auth.uid()));

drop policy if exists "Users create their own workspace snapshots" on public.workspace_snapshots;
create policy "Users create their own workspace snapshots"
  on public.workspace_snapshots for insert to authenticated
  with check (owner_id = (select auth.uid()));

drop policy if exists "Users update their own workspace snapshots" on public.workspace_snapshots;
create policy "Users update their own workspace snapshots"
  on public.workspace_snapshots for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "Users delete their own workspace snapshots" on public.workspace_snapshots;
create policy "Users delete their own workspace snapshots"
  on public.workspace_snapshots for delete to authenticated
  using (owner_id = (select auth.uid()));

-- Teams: members can see their teams; owner/admin can change team metadata.
drop policy if exists "Team members can read teams" on public.workspace_teams;
create policy "Team members can read teams"
  on public.workspace_teams for select to authenticated
  using (public.is_workspace_team_member(id));

drop policy if exists "Authenticated users can create their own teams" on public.workspace_teams;
create policy "Authenticated users can create their own teams"
  on public.workspace_teams for insert to authenticated
  with check (created_by = (select auth.uid()));

drop policy if exists "Team owners and admins can update teams" on public.workspace_teams;
create policy "Team owners and admins can update teams"
  on public.workspace_teams for update to authenticated
  using (public.is_workspace_team_member(id, array['owner', 'admin']))
  with check (public.is_workspace_team_member(id, array['owner', 'admin']));

drop policy if exists "Team owners and admins can delete teams" on public.workspace_teams;
create policy "Team owners and admins can delete teams"
  on public.workspace_teams for delete to authenticated
  using (public.is_workspace_team_member(id, array['owner', 'admin']));

-- Membership reads are team-scoped; owner/admin can add, change, and remove non-owner roles.
-- Owner membership is created only by the SECURITY DEFINER trigger above and cannot be client-demoted.
drop policy if exists "Team members can read membership" on public.workspace_team_members;
create policy "Team members can read membership"
  on public.workspace_team_members for select to authenticated
  using (public.is_workspace_team_member(team_id));

drop policy if exists "Team owners and admins manage membership" on public.workspace_team_members;
create policy "Team owners and admins manage membership"
  on public.workspace_team_members for insert to authenticated
  with check (
    added_by = (select auth.uid())
    and role <> 'owner'
    and public.is_workspace_team_member(team_id, array['owner', 'admin'])
  );

drop policy if exists "Team owners and admins change non-owner membership" on public.workspace_team_members;
create policy "Team owners and admins change non-owner membership"
  on public.workspace_team_members for update to authenticated
  using (
    role <> 'owner'
    and public.is_workspace_team_member(team_id, array['owner', 'admin'])
  )
  with check (
    role <> 'owner'
    and public.is_workspace_team_member(team_id, array['owner', 'admin'])
  );

drop policy if exists "Team owners and admins remove non-owner membership" on public.workspace_team_members;
create policy "Team owners and admins remove non-owner membership"
  on public.workspace_team_members for delete to authenticated
  using (
    role <> 'owner'
    and public.is_workspace_team_member(team_id, array['owner', 'admin'])
  );

-- Shared snapshots: every member can read, editor/admin/owner can write, only admin/owner can delete.
drop policy if exists "Team members can read shared workspace snapshots" on public.team_workspace_snapshots;
create policy "Team members can read shared workspace snapshots"
  on public.team_workspace_snapshots for select to authenticated
  using (public.is_workspace_team_member(team_id));

drop policy if exists "Team editors can create shared workspace snapshots" on public.team_workspace_snapshots;
create policy "Team editors can create shared workspace snapshots"
  on public.team_workspace_snapshots for insert to authenticated
  with check (
    updated_by = (select auth.uid())
    and public.is_workspace_team_member(team_id, array['owner', 'admin', 'editor'])
  );

drop policy if exists "Team editors can update shared workspace snapshots" on public.team_workspace_snapshots;
create policy "Team editors can update shared workspace snapshots"
  on public.team_workspace_snapshots for update to authenticated
  using (public.is_workspace_team_member(team_id, array['owner', 'admin', 'editor']))
  with check (
    updated_by = (select auth.uid())
    and public.is_workspace_team_member(team_id, array['owner', 'admin', 'editor'])
  );

drop policy if exists "Team owners and admins delete shared workspace snapshots" on public.team_workspace_snapshots;
create policy "Team owners and admins delete shared workspace snapshots"
  on public.team_workspace_snapshots for delete to authenticated
  using (public.is_workspace_team_member(team_id, array['owner', 'admin']));

-- Explicit privileges + RLS: anonymous clients cannot access these tables.
revoke all on public.workspace_snapshots from public, anon;
revoke all on public.workspace_teams from public, anon;
revoke all on public.workspace_team_members from public, anon;
revoke all on public.team_workspace_snapshots from public, anon;
grant select, insert, update, delete on public.workspace_snapshots to authenticated;
grant select, insert, update, delete on public.workspace_teams to authenticated;
grant select, insert, update, delete on public.workspace_team_members to authenticated;
grant select, insert, update, delete on public.team_workspace_snapshots to authenticated;
