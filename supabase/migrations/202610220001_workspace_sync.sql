-- DreamEx Tech cloud workspace persistence.
-- Apply with Supabase SQL Editor or Supabase CLI before setting VITE_SUPABASE_*.
-- Browser clients use the anon key and the signed-in user's JWT; never ship service_role credentials.

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

alter table public.workspace_snapshots enable row level security;

drop policy if exists "Users read their own workspace snapshots" on public.workspace_snapshots;
create policy "Users read their own workspace snapshots"
  on public.workspace_snapshots for select
  to authenticated using (owner_id = (select auth.uid()));

drop policy if exists "Users create their own workspace snapshots" on public.workspace_snapshots;
create policy "Users create their own workspace snapshots"
  on public.workspace_snapshots for insert
  to authenticated with check (owner_id = (select auth.uid()));

drop policy if exists "Users update their own workspace snapshots" on public.workspace_snapshots;
create policy "Users update their own workspace snapshots"
  on public.workspace_snapshots for update
  to authenticated using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "Users delete their own workspace snapshots" on public.workspace_snapshots;
create policy "Users delete their own workspace snapshots"
  on public.workspace_snapshots for delete
  to authenticated using (owner_id = (select auth.uid()));

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

alter table public.workspace_teams enable row level security;
alter table public.workspace_team_members enable row level security;
alter table public.team_workspace_snapshots enable row level security;

-- Team creators automatically receive the owner role. The trigger runs with a fixed search_path.
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

drop trigger if exists workspace_team_owner_after_insert on public.workspace_teams;
create trigger workspace_team_owner_after_insert
  after insert on public.workspace_teams
  for each row execute function public.add_workspace_team_owner();

drop policy if exists "Team members can read teams" on public.workspace_teams;
create policy "Team members can read teams"
  on public.workspace_teams for select
  to authenticated using (
    exists (
      select 1 from public.workspace_team_members m
      where m.team_id = id and m.user_id = (select auth.uid())
    )
  );

drop policy if exists "Authenticated users can create their own teams" on public.workspace_teams;
create policy "Authenticated users can create their own teams"
  on public.workspace_teams for insert
  to authenticated with check (created_by = (select auth.uid()));

drop policy if exists "Team owners and admins can update teams" on public.workspace_teams;
create policy "Team owners and admins can update teams"
  on public.workspace_teams for update
  to authenticated using (
    exists (
      select 1 from public.workspace_team_members m
      where m.team_id = id and m.user_id = (select auth.uid()) and m.role in ('owner', 'admin')
    )
  ) with check (
    exists (
      select 1 from public.workspace_team_members m
      where m.team_id = id and m.user_id = (select auth.uid()) and m.role in ('owner', 'admin')
    )
  );

drop policy if exists "Team owners and admins can delete teams" on public.workspace_teams;
create policy "Team owners and admins can delete teams"
  on public.workspace_teams for delete
  to authenticated using (
    exists (
      select 1 from public.workspace_team_members m
      where m.team_id = id and m.user_id = (select auth.uid()) and m.role in ('owner', 'admin')
    )
  );

drop policy if exists "Team members can read membership" on public.workspace_team_members;
create policy "Team members can read membership"
  on public.workspace_team_members for select
  to authenticated using (
    exists (
      select 1 from public.workspace_team_members viewer
      where viewer.team_id = team_id and viewer.user_id = (select auth.uid())
    )
  );

drop policy if exists "Team owners and admins manage membership" on public.workspace_team_members;
create policy "Team owners and admins manage membership"
  on public.workspace_team_members for insert
  to authenticated with check (
    added_by = (select auth.uid())
    and exists (
      select 1 from public.workspace_team_members manager
      where manager.team_id = team_id and manager.user_id = (select auth.uid()) and manager.role in ('owner', 'admin')
    )
    and role <> 'owner'
  );

drop policy if exists "Team owners and admins change non-owner membership" on public.workspace_team_members;
create policy "Team owners and admins change non-owner membership"
  on public.workspace_team_members for update
  to authenticated using (
    role <> 'owner'
    and exists (
      select 1 from public.workspace_team_members manager
      where manager.team_id = team_id and manager.user_id = (select auth.uid()) and manager.role in ('owner', 'admin')
    )
  ) with check (
    role <> 'owner'
    and exists (
      select 1 from public.workspace_team_members manager
      where manager.team_id = team_id and manager.user_id = (select auth.uid()) and manager.role in ('owner', 'admin')
    )
  );

drop policy if exists "Team owners and admins remove non-owner membership" on public.workspace_team_members;
create policy "Team owners and admins remove non-owner membership"
  on public.workspace_team_members for delete
  to authenticated using (
    role <> 'owner'
    and exists (
      select 1 from public.workspace_team_members manager
      where manager.team_id = team_id and manager.user_id = (select auth.uid()) and manager.role in ('owner', 'admin')
    )
  );

drop policy if exists "Team members can read shared workspace snapshots" on public.team_workspace_snapshots;
create policy "Team members can read shared workspace snapshots"
  on public.team_workspace_snapshots for select
  to authenticated using (
    exists (
      select 1 from public.workspace_team_members m
      where m.team_id = team_id and m.user_id = (select auth.uid())
    )
  );

drop policy if exists "Team editors can create shared workspace snapshots" on public.team_workspace_snapshots;
create policy "Team editors can create shared workspace snapshots"
  on public.team_workspace_snapshots for insert
  to authenticated with check (
    updated_by = (select auth.uid())
    and exists (
      select 1 from public.workspace_team_members m
      where m.team_id = team_id and m.user_id = (select auth.uid()) and m.role in ('owner', 'admin', 'editor')
    )
  );

drop policy if exists "Team editors can update shared workspace snapshots" on public.team_workspace_snapshots;
create policy "Team editors can update shared workspace snapshots"
  on public.team_workspace_snapshots for update
  to authenticated using (
    exists (
      select 1 from public.workspace_team_members m
      where m.team_id = team_id and m.user_id = (select auth.uid()) and m.role in ('owner', 'admin', 'editor')
    )
  ) with check (
    updated_by = (select auth.uid())
    and exists (
      select 1 from public.workspace_team_members m
      where m.team_id = team_id and m.user_id = (select auth.uid()) and m.role in ('owner', 'admin', 'editor')
    )
  );

drop policy if exists "Team owners and admins delete shared workspace snapshots" on public.team_workspace_snapshots;
create policy "Team owners and admins delete shared workspace snapshots"
  on public.team_workspace_snapshots for delete
  to authenticated using (
    exists (
      select 1 from public.workspace_team_members m
      where m.team_id = team_id and m.user_id = (select auth.uid()) and m.role in ('owner', 'admin')
    )
  );

-- The Supabase anon role has no direct table privileges; authenticated requests are constrained by RLS.
revoke all on public.workspace_snapshots from anon;
revoke all on public.workspace_teams from anon;
revoke all on public.workspace_team_members from anon;
revoke all on public.team_workspace_snapshots from anon;
grant select, insert, update, delete on public.workspace_snapshots to authenticated;
grant select, insert, update, delete on public.workspace_teams to authenticated;
grant select, insert, update, delete on public.workspace_team_members to authenticated;
grant select, insert, update, delete on public.team_workspace_snapshots to authenticated;
