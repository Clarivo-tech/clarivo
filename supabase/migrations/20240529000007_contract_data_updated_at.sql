-- Ensure contract_data has updated_at (required for manual value edits and dedupe)

alter table public.contract_data
  add column if not exists updated_at timestamptz not null default now();

-- Backfill any nulls if the column existed without defaults
update public.contract_data
set updated_at = coalesce(created_at, timezone('utc'::text, now()))
where updated_at is null;
