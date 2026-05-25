-- Optional: align schema with upload API (skip if columns already exist)
alter table public.contracts
add column if not exists file_url text,
add column if not exists storage_path text;
