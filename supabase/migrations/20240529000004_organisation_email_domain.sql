-- Organisation email domain for team invites (same company email)

alter table public.organisations
  add column if not exists allowed_email_domain text;

comment on column public.organisations.allowed_email_domain is
  'Work email domain for team invites, e.g. acme.com';

create index if not exists organisations_allowed_email_domain_idx
  on public.organisations (allowed_email_domain);
