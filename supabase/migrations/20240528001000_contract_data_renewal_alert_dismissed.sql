alter table public.contract_data
add column if not exists renewal_alert_dismissed boolean default false;
