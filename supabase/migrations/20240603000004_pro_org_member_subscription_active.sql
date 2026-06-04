-- Team members inherit Pro access when their organisation is on Pro.
update public.user_preferences up
set
  subscription_status = 'active',
  updated_at = timezone('utc', now())
from public.organisation_members om
inner join public.organisations o on o.id = om.organisation_id
where up.user_id = om.user_id
  and om.status = 'active'
  and o.plan = 'pro'
  and coalesce(up.subscription_status, '') <> 'active';
