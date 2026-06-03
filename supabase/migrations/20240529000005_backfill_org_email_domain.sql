-- Backfill allowed_email_domain from organisation owner auth email

update public.organisations o
set allowed_email_domain = lower(split_part(u.email, '@', 2))
from auth.users u
where o.owner_id = u.id
  and u.email is not null
  and (o.allowed_email_domain is null or trim(o.allowed_email_domain) = '');
