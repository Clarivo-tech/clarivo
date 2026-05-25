-- Allow 'complete' status on contracts (upload pipeline uses this value)
alter table public.contracts
drop constraint if exists contracts_status_check;

alter table public.contracts
add constraint contracts_status_check check (
  status in ('pending', 'processing', 'completed', 'complete', 'failed')
);

-- Backfill user_id on contract_data from parent contract where missing
update public.contract_data cd
set user_id = c.user_id
from public.contracts c
where cd.contract_id = c.id
  and cd.user_id is null;
