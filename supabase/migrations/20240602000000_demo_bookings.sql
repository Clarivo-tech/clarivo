create table if not exists public.demo_bookings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  company text not null,
  job_title text,
  booking_date date not null,
  booking_time text not null,
  timezone text not null default 'Europe/London',
  status text not null default 'confirmed',
  notes text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint demo_bookings_status_check check (
    status in ('confirmed', 'completed', 'cancelled')
  )
);

create index if not exists demo_bookings_date_time_idx
  on public.demo_bookings (booking_date, booking_time);

alter table public.demo_bookings enable row level security;

drop policy if exists "Anyone can insert bookings" on public.demo_bookings;
create policy "Anyone can insert bookings"
  on public.demo_bookings
  for insert
  with check (true);

drop policy if exists "Admin can view all bookings" on public.demo_bookings;
create policy "Admin can view all bookings"
  on public.demo_bookings
  for select
  using (true);

drop policy if exists "Admin can update bookings" on public.demo_bookings;
create policy "Admin can update bookings"
  on public.demo_bookings
  for update
  using (true)
  with check (true);
