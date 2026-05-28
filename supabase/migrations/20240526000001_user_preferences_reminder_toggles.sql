alter table public.user_preferences add column if not exists remind_90_days boolean default true;
alter table public.user_preferences add column if not exists remind_60_days boolean default true;
alter table public.user_preferences add column if not exists remind_30_days boolean default true;
alter table public.user_preferences add column if not exists remind_14_days boolean default false;
alter table public.user_preferences add column if not exists remind_7_days boolean default false;
alter table public.user_preferences add column if not exists remind_renewal boolean default true;
alter table public.user_preferences add column if not exists remind_notice_deadline boolean default true;
alter table public.user_preferences add column if not exists remind_expiry boolean default true;
