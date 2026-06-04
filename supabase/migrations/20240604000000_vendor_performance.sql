-- Vendor performance tracking

alter table public.vendors
  add column if not exists performance_score numeric(4, 2),
  add column if not exists last_reviewed_at timestamptz,
  add column if not exists performance_rag text default 'none';

alter table public.vendors
  drop constraint if exists vendors_performance_rag_check;

alter table public.vendors
  add constraint vendors_performance_rag_check check (
    performance_rag in ('none', 'green', 'amber', 'red')
  );

create table if not exists public.performance_criteria (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  is_default boolean not null default false,
  is_active boolean not null default true,
  weight integer not null default 1,
  created_at timestamptz not null default timezone('utc', now()),
  constraint performance_criteria_weight_check check (weight >= 1 and weight <= 10)
);

create index if not exists performance_criteria_user_id_idx
  on public.performance_criteria (user_id);

create table if not exists public.performance_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  review_period text,
  overall_score numeric(4, 2),
  notes text,
  reviewed_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists performance_reviews_user_id_idx
  on public.performance_reviews (user_id);

create index if not exists performance_reviews_vendor_id_idx
  on public.performance_reviews (vendor_id);

create table if not exists public.performance_scores (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.performance_reviews (id) on delete cascade,
  criteria_id uuid not null references public.performance_criteria (id) on delete cascade,
  score integer not null,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint performance_scores_score_check check (score >= 1 and score <= 10)
);

create index if not exists performance_scores_review_id_idx
  on public.performance_scores (review_id);

alter table public.performance_criteria enable row level security;
alter table public.performance_reviews enable row level security;
alter table public.performance_scores enable row level security;

drop policy if exists "Users can manage own criteria" on public.performance_criteria;
create policy "Users can manage own criteria"
  on public.performance_criteria
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage own reviews" on public.performance_reviews;
create policy "Users can manage own reviews"
  on public.performance_reviews
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage own scores" on public.performance_scores;
create policy "Users can manage own scores"
  on public.performance_scores
  for all
  using (
    review_id in (
      select id from public.performance_reviews where user_id = auth.uid()
    )
  )
  with check (
    review_id in (
      select id from public.performance_reviews where user_id = auth.uid()
    )
  );
