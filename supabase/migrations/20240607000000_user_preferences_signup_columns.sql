-- Ensure signup / billing preference columns exist on production
alter table public.user_preferences
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists company text,
  add column if not exists job_title text,
  add column if not exists contact_number text,
  add column if not exists subscription_status text,
  add column if not exists trial_started_at timestamptz,
  add column if not exists trial_expires_at timestamptz,
  add column if not exists trial_used boolean not null default false;
