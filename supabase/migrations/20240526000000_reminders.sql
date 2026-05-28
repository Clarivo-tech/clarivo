create table if not exists public.reminders (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  contract_id uuid references public.contracts(id) on delete cascade,
  title text not null,
  reminder_date date not null,
  notes text,
  sent boolean default false,
  dismissed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.reminders enable row level security;

drop policy if exists "Users can manage own reminders" on public.reminders;
create policy "Users can manage own reminders"
  on public.reminders for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
