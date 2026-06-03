-- Fix infinite recursion: organisation_members policies must not query
-- organisation_members from within organisation_members RLS.

create or replace function public.is_organisation_member(org_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.organisation_members
    where organisation_id = org_id
      and user_id = auth.uid()
      and status = 'active'
  );
$$;

create or replace function public.is_organisation_admin(org_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.organisation_members
    where organisation_id = org_id
      and user_id = auth.uid()
      and status = 'active'
      and role in ('owner', 'admin')
  );
$$;

grant execute on function public.is_organisation_member(uuid) to authenticated;
grant execute on function public.is_organisation_admin(uuid) to authenticated;

-- organisation_members
drop policy if exists "Members can view their memberships" on public.organisation_members;
drop policy if exists "Admins can manage members" on public.organisation_members;
drop policy if exists "Users can view own membership" on public.organisation_members;

create policy "Users can view own membership"
  on public.organisation_members
  for select
  using (user_id = auth.uid());

create policy "Admins can view org members"
  on public.organisation_members
  for select
  using (public.is_organisation_admin(organisation_id));

drop policy if exists "Users can insert own membership" on public.organisation_members;

create policy "Users can insert own membership"
  on public.organisation_members
  for insert
  with check (user_id = auth.uid());

create policy "Admins can update org members"
  on public.organisation_members
  for update
  using (public.is_organisation_admin(organisation_id));

create policy "Admins can delete org members"
  on public.organisation_members
  for delete
  using (
    public.is_organisation_admin(organisation_id)
    and role <> 'owner'
  );

-- organisations (subquery on members also triggered recursion)
drop policy if exists "Users can view their organisation" on public.organisations;

create policy "Users can view their organisation"
  on public.organisations
  for select
  using (
    owner_id = auth.uid()
    or public.is_organisation_member(id)
  );

-- invites
drop policy if exists "Users can view invites for their org" on public.invites;
drop policy if exists "Admins can manage invites" on public.invites;

create policy "Admins can view invites"
  on public.invites
  for select
  using (public.is_organisation_admin(organisation_id));

create policy "Admins can insert invites"
  on public.invites
  for insert
  with check (public.is_organisation_admin(organisation_id));

create policy "Admins can update invites"
  on public.invites
  for update
  using (public.is_organisation_admin(organisation_id));

create policy "Admins can delete invites"
  on public.invites
  for delete
  using (public.is_organisation_admin(organisation_id));
