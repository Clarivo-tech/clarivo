-- Stripe billing fields (Revolut columns kept for historical records)
alter table public.billing_subscriptions
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_price_id text,
  add column if not exists stripe_status text;

create unique index if not exists billing_subscriptions_stripe_subscription_id_uidx
  on public.billing_subscriptions (stripe_subscription_id)
  where stripe_subscription_id is not null;

create unique index if not exists billing_subscriptions_stripe_checkout_session_id_uidx
  on public.billing_subscriptions (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create index if not exists billing_subscriptions_stripe_subscription_id_idx
  on public.billing_subscriptions (stripe_subscription_id);
