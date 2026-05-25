-- Clarivo: contracts + contract_data + storage
-- Run in Supabase SQL Editor or via: supabase db push

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  file_name text not null,
  storage_path text not null unique,
  status text not null default 'pending',
  uploaded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contracts_status_check check (
    status in ('pending', 'processing', 'completed', 'failed')
  )
);

create table if not exists public.contract_data (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  vendor_name text,
  contract_value numeric(14, 2),
  start_date date,
  end_date date,
  renewal_date date,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contract_data_status_check check (
    status in ('active', 'expiring', 'expired', 'renewed', 'pending')
  )
);

create index if not exists contracts_user_id_idx on public.contracts (user_id);
create index if not exists contract_data_user_id_idx on public.contract_data (user_id);
create index if not exists contract_data_renewal_date_idx on public.contract_data (renewal_date);

alter table public.contracts enable row level security;
alter table public.contract_data enable row level security;

create policy "Users manage own contracts"
  on public.contracts
  for all
  using (auth.uid () = user_id)
  with check (auth.uid () = user_id);

create policy "Users manage own contract data"
  on public.contract_data
  for all
  using (auth.uid () = user_id)
  with check (auth.uid () = user_id);

insert into storage.buckets (id, name, public)
values ('contracts', 'contracts', false)
on conflict (id) do nothing;

create policy "Users upload own contract files"
  on storage.objects
  for insert
  with check (
    bucket_id = 'contracts'
    and auth.uid ()::text = (storage.foldername (name))[1]
  );

create policy "Users read own contract files"
  on storage.objects
  for select
  using (
    bucket_id = 'contracts'
    and auth.uid ()::text = (storage.foldername (name))[1]
  );

create policy "Users delete own contract files"
  on storage.objects
  for delete
  using (
    bucket_id = 'contracts'
    and auth.uid ()::text = (storage.foldername (name))[1]
  );
