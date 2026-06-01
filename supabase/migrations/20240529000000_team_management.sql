-- Team management: organisations, members, invites

create table if not exists public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid references auth.users (id) on delete cascade,
  plan text not null default 'trial',
  seat_limit integer not null default 1,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.organisation_members (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  role text not null default 'member',
  invited_email text,
  status text not null default 'active',
  joined_at timestamptz not null default timezone('utc', now()),
  unique (organisation_id, user_id)
);

create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  invited_by uuid references auth.users (id),
  email text not null,
  role text not null default 'member',
  token text not null unique,
  status text not null default 'pending',
  expires_at timestamptz not null default timezone('utc', now()) + interval '7 days',
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists organisation_members_user_id_idx
  on public.organisation_members (user_id);

create index if not exists organisation_members_org_id_idx
  on public.organisation_members (organisation_id);

create index if not exists invites_org_id_idx on public.invites (organisation_id);

create index if not exists invites_token_idx on public.invites (token);

alter table public.organisations enable row level security;
alter table public.organisation_members enable row level security;
alter table public.invites enable row level security;

create policy "Users can view their organisation"
  on public.organisations
  for select
  using (
    id in (
      select organisation_id
      from public.organisation_members
      where user_id = auth.uid()
    )
  );

create policy "Owners can update organisation"
  on public.organisations
  for update
  using (owner_id = auth.uid());

create policy "Users can create organisations they own"
  on public.organisations
  for insert
  with check (owner_id = auth.uid());

create policy "Members can view their memberships"
  on public.organisation_members
  for select
  using (
    organisation_id in (
      select organisation_id
      from public.organisation_members
      where user_id = auth.uid()
    )
  );

create policy "Users can insert own membership"
  on public.organisation_members
  for insert
  with check (user_id = auth.uid());

create policy "Admins can manage members"
  on public.organisation_members
  for all
  using (
    organisation_id in (
      select organisation_id
      from public.organisation_members
      where user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );

create policy "Users can view invites for their org"
  on public.invites
  for select
  using (
    organisation_id in (
      select organisation_id
      from public.organisation_members
      where user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );

create policy "Admins can manage invites"
  on public.invites
  for all
  using (
    organisation_id in (
      select organisation_id
      from public.organisation_members
      where user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );

alter table public.user_preferences
  add column if not exists organisation_id uuid references public.organisations (id) on delete set null;

create index if not exists user_preferences_organisation_id_idx
  on public.user_preferences (organisation_id);
