alter table public.user_preferences
add column if not exists reminder_sent boolean default false;

alter table public.user_preferences
add column if not exists expiry_notified boolean default false;
