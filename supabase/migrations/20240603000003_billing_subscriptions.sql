create table if not exists public.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  merchant_reference text not null unique,
  revolut_customer_id text,
  revolut_subscription_id text unique,
  revolut_setup_order_id text unique,
  plan_variation_id text,
  licenses integer not null check (licenses >= 1 and licenses <= 100),
  amount_pence integer not null,
  currency text not null default 'GBP',
  status text not null default 'pending'
    check (status in ('pending', 'active', 'overdue', 'cancelled', 'finished', 'failed')),
  revolut_state text,
  revolut_event text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  activated_at timestamptz
);

create index if not exists billing_subscriptions_org_id_idx
  on public.billing_subscriptions (organisation_id);

create index if not exists billing_subscriptions_user_id_idx
  on public.billing_subscriptions (user_id);

create index if not exists billing_subscriptions_revolut_subscription_id_idx
  on public.billing_subscriptions (revolut_subscription_id);

create index if not exists billing_subscriptions_revolut_setup_order_id_idx
  on public.billing_subscriptions (revolut_setup_order_id);

alter table public.billing_subscriptions enable row level security;

create policy "Owners can view own org billing subscriptions"
  on public.billing_subscriptions
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

create policy "Owners can insert own billing subscriptions"
  on public.billing_subscriptions
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

create policy "Owners can update own org billing subscriptions"
  on public.billing_subscriptions
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
