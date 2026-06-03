create table if not exists public.billing_payments (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  merchant_reference text not null unique,
  revolut_order_id text unique,
  licenses integer not null check (licenses >= 1 and licenses <= 100),
  amount_pence integer not null,
  currency text not null default 'GBP',
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'failed', 'cancelled')),
  revolut_event text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz
);

create index if not exists billing_payments_org_id_idx
  on public.billing_payments (organisation_id);

create index if not exists billing_payments_user_id_idx
  on public.billing_payments (user_id);

create index if not exists billing_payments_revolut_order_id_idx
  on public.billing_payments (revolut_order_id);

alter table public.billing_payments enable row level security;

create policy "Owners can view own org billing payments"
  on public.billing_payments
  for select
  using (
    organisation_id in (
      select organisation_id
      from public.organisation_members
      where user_id = auth.uid()
        and role = 'owner'
        and status = 'active'
    )
  );
