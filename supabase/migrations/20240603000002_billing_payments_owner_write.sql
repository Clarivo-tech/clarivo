drop policy if exists "Owners can insert own billing payments" on public.billing_payments;
create policy "Owners can insert own billing payments"
  on public.billing_payments
  for insert
  with check (
    user_id = auth.uid()
    and organisation_id in (
      select organisation_id
      from public.organisation_members
      where user_id = auth.uid()
        and role = 'owner'
        and status = 'active'
    )
  );

drop policy if exists "Owners can update own org billing payments" on public.billing_payments;
create policy "Owners can update own org billing payments"
  on public.billing_payments
  for update
  using (
    organisation_id in (
      select organisation_id
      from public.organisation_members
      where user_id = auth.uid()
        and role = 'owner'
        and status = 'active'
    )
  )
  with check (
    organisation_id in (
      select organisation_id
      from public.organisation_members
      where user_id = auth.uid()
        and role = 'owner'
        and status = 'active'
    )
  );
