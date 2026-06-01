-- Fix RLS: users must read their own membership row (avoids recursive policy gaps)

drop policy if exists "Users can view own membership" on public.organisation_members;

create policy "Users can view own membership"
  on public.organisation_members
  for select
  using (user_id = auth.uid());
