-- Organisation-scoped contracts

alter table public.contracts
  add column if not exists organisation_id uuid references public.organisations (id) on delete set null;

create index if not exists contracts_organisation_id_idx
  on public.contracts (organisation_id);

drop policy if exists "Users manage own contracts" on public.contracts;

create policy "Users manage own contracts"
  on public.contracts
  for all
  using (
    auth.uid() = user_id
    or (
      organisation_id is not null
      and organisation_id in (
        select organisation_id
        from public.organisation_members
        where user_id = auth.uid()
          and status = 'active'
      )
    )
  )
  with check (
    auth.uid() = user_id
    or (
      organisation_id is not null
      and organisation_id in (
        select organisation_id
        from public.organisation_members
        where user_id = auth.uid()
          and status = 'active'
          and role in ('owner', 'admin', 'member')
      )
    )
  );

drop policy if exists "Users manage own contract data" on public.contract_data;

create policy "Users manage own contract data"
  on public.contract_data
  for all
  using (
    auth.uid() = user_id
    or contract_id in (
      select c.id
      from public.contracts c
      where c.organisation_id is not null
        and c.organisation_id in (
          select organisation_id
          from public.organisation_members
          where user_id = auth.uid()
            and status = 'active'
        )
    )
  )
  with check (
    auth.uid() = user_id
    or contract_id in (
      select c.id
      from public.contracts c
      where c.organisation_id is not null
        and c.organisation_id in (
          select organisation_id
          from public.organisation_members
          where user_id = auth.uid()
            and status = 'active'
            and role in ('owner', 'admin', 'member')
        )
    )
  );

drop policy if exists "Users read own contract files" on storage.objects;

create policy "Users read own contract files"
  on storage.objects
  for select
  using (
    bucket_id = 'contracts'
    and (
      auth.uid()::text = (storage.foldername (name))[1]
      or exists (
        select 1
        from public.organisation_members om_self
        join public.organisation_members om_owner
          on om_self.organisation_id = om_owner.organisation_id
        where om_self.user_id = auth.uid()
          and om_self.status = 'active'
          and om_owner.user_id = ((storage.foldername (name))[1])::uuid
          and om_owner.status = 'active'
      )
    )
  );
