alter table public.user_preferences
  add column if not exists trial_documents_hint_dismissed boolean not null default false;
