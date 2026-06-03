-- Vendor profiles, documents, activity, contract linkage

create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid references public.organisations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  website text,
  company_registration text,
  address text,
  country text not null default 'United Kingdom',
  industry text,
  vendor_type text,
  status text not null default 'active',
  risk_rating text not null default 'medium',
  is_critical boolean not null default false,
  is_single_source boolean not null default false,
  account_manager_name text,
  account_manager_email text,
  account_manager_phone text,
  support_contact_name text,
  support_contact_email text,
  escalation_contact_name text,
  escalation_contact_email text,
  notes text,
  tags text[],
  auto_created boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vendors_status_check check (
    status in ('active', 'inactive', 'under_review')
  ),
  constraint vendors_risk_rating_check check (
    risk_rating in ('low', 'medium', 'high', 'critical')
  )
);

create index if not exists vendors_user_id_idx on public.vendors (user_id);
create index if not exists vendors_organisation_id_idx on public.vendors (organisation_id);
create index if not exists vendors_name_lower_idx on public.vendors (lower(name));

alter table public.contracts
  add column if not exists vendor_id uuid references public.vendors (id) on delete set null;

create index if not exists contracts_vendor_id_idx on public.contracts (vendor_id);

create table if not exists public.vendor_documents (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  document_type text not null,
  storage_path text not null,
  file_size bigint,
  expiry_date date,
  uploaded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint vendor_documents_type_check check (
    document_type in (
      'insurance_certificate',
      'iso_certification',
      'soc2_report',
      'nda',
      'dpa',
      'other'
    )
  )
);

create index if not exists vendor_documents_vendor_id_idx
  on public.vendor_documents (vendor_id);

create table if not exists public.vendor_activity (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  action_type text not null,
  description text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists vendor_activity_vendor_id_idx
  on public.vendor_activity (vendor_id, created_at desc);

alter table public.vendors enable row level security;
alter table public.vendor_documents enable row level security;
alter table public.vendor_activity enable row level security;

-- Vendors: owner or org member
create policy "Users manage vendors"
  on public.vendors
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

create policy "Users manage vendor documents"
  on public.vendor_documents
  for all
  using (
    vendor_id in (
      select v.id
      from public.vendors v
      where v.user_id = auth.uid()
        or (
          v.organisation_id is not null
          and v.organisation_id in (
            select organisation_id
            from public.organisation_members
            where user_id = auth.uid()
              and status = 'active'
          )
        )
    )
  )
  with check (
    auth.uid() = user_id
    and vendor_id in (
      select v.id
      from public.vendors v
      where v.user_id = auth.uid()
        or (
          v.organisation_id is not null
          and v.organisation_id in (
            select organisation_id
            from public.organisation_members
            where user_id = auth.uid()
              and status = 'active'
              and role in ('owner', 'admin', 'member')
          )
        )
    )
  );

create policy "Users read vendor activity"
  on public.vendor_activity
  for select
  using (
    vendor_id in (
      select v.id
      from public.vendors v
      where v.user_id = auth.uid()
        or (
          v.organisation_id is not null
          and v.organisation_id in (
            select organisation_id
            from public.organisation_members
            where user_id = auth.uid()
              and status = 'active'
          )
        )
    )
  );

create policy "Users insert vendor activity"
  on public.vendor_activity
  for insert
  with check (
    auth.uid() = user_id
    and vendor_id in (
      select v.id
      from public.vendors v
      where v.user_id = auth.uid()
        or (
          v.organisation_id is not null
          and v.organisation_id in (
            select organisation_id
            from public.organisation_members
            where user_id = auth.uid()
              and status = 'active'
              and role in ('owner', 'admin', 'member')
          )
        )
    )
  );

-- Storage bucket for vendor documents
insert into storage.buckets (id, name, public)
values ('vendors', 'vendors', false)
on conflict (id) do nothing;

create policy "Users upload vendor documents"
  on storage.objects
  for insert
  with check (
    bucket_id = 'vendors'
    and auth.uid() is not null
    and (storage.foldername (name))[1] in (
      select v.id::text
      from public.vendors v
      where v.user_id = auth.uid()
        or (
          v.organisation_id is not null
          and v.organisation_id in (
            select organisation_id
            from public.organisation_members
            where user_id = auth.uid()
              and status = 'active'
              and role in ('owner', 'admin', 'member')
          )
        )
    )
  );

create policy "Users read vendor documents"
  on storage.objects
  for select
  using (
    bucket_id = 'vendors'
    and (storage.foldername (name))[1] in (
      select v.id::text
      from public.vendors v
      where v.user_id = auth.uid()
        or (
          v.organisation_id is not null
          and v.organisation_id in (
            select organisation_id
            from public.organisation_members
            where user_id = auth.uid()
              and status = 'active'
          )
        )
    )
  );

create policy "Users delete vendor documents"
  on storage.objects
  for delete
  using (
    bucket_id = 'vendors'
    and (storage.foldername (name))[1] in (
      select v.id::text
      from public.vendors v
      where v.user_id = auth.uid()
        or (
          v.organisation_id is not null
          and v.organisation_id in (
            select organisation_id
            from public.organisation_members
            where user_id = auth.uid()
              and status = 'active'
              and role in ('owner', 'admin', 'member')
          )
        )
    )
  );
