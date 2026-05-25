alter table public.contract_data
add column if not exists currency text,
add column if not exists notice_period_days integer,
add column if not exists auto_renews boolean,
add column if not exists contract_type text,
add column if not exists summary text;
