-- Allow reading contract_data when the parent contract belongs to the user
-- (fixes rows where user_id was not set on insert)

drop policy if exists "Users manage own contract data" on public.contract_data;

create policy "Users manage own contract data"
  on public.contract_data
  for all
  using (
    auth.uid () = user_id
    or exists (
      select 1
      from public.contracts c
      where c.id = contract_data.contract_id
        and c.user_id = auth.uid ()
    )
  )
  with check (
    auth.uid () = user_id
    or exists (
      select 1
      from public.contracts c
      where c.id = contract_data.contract_id
        and c.user_id = auth.uid ()
    )
  );
