alter table public.billing_subscriptions
  add column if not exists confirmation_email_sent_at timestamptz;

alter table public.billing_payments
  add column if not exists confirmation_email_sent_at timestamptz;
