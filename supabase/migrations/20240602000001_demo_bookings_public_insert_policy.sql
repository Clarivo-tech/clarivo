alter table public.demo_bookings enable row level security;

grant insert on table public.demo_bookings to anon, authenticated;
grant select on table public.demo_bookings to anon, authenticated;
grant update on table public.demo_bookings to authenticated;

drop policy if exists "Anyone can insert bookings" on public.demo_bookings;
create policy "Anyone can insert bookings"
  on public.demo_bookings
  for insert
  to anon, authenticated
  with check (status = 'confirmed');

drop policy if exists "Public can read confirmed bookings" on public.demo_bookings;
create policy "Public can read confirmed bookings"
  on public.demo_bookings
  for select
  to anon, authenticated
  using (status = 'confirmed');
