create policy "Users can update own contract data"
  on public.contract_data for update
  using (
    contract_id in (
      select id from public.contracts where user_id = auth.uid()
    )
  )
  with check (
    contract_id in (
      select id from public.contracts where user_id = auth.uid()
    )
  );
