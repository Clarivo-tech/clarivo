-- One trial per email; lock accounts after trial ends

alter table public.user_preferences
  add column if not exists trial_used boolean not null default false;

comment on column public.user_preferences.trial_used is
  'True once the user has started their free trial; prevents another trial.';

-- Mark existing trial users as having consumed their trial
update public.user_preferences
set trial_used = true
where trial_started_at is not null;

update public.user_preferences
set subscription_status = 'expired'
where subscription_status = 'trial'
  and trial_expires_at is not null
  and trial_expires_at < timezone('utc'::text, now());

create or replace function public.check_trial_eligibility(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_status text;
  v_trial_started timestamptz;
  v_trial_expires timestamptz;
begin
  select u.id
  into v_user_id
  from auth.users u
  where lower(u.email) = lower(trim(p_email))
  limit 1;

  if v_user_id is null then
    return jsonb_build_object('eligible', true);
  end if;

  select
    subscription_status,
    trial_started_at,
    trial_expires_at
  into v_status, v_trial_started, v_trial_expires
  from public.user_preferences
  where user_id = v_user_id;

  if not found then
    return jsonb_build_object('eligible', true);
  end if;

  if lower(coalesce(v_status, '')) = 'active' then
    return jsonb_build_object('eligible', false, 'reason', 'active');
  end if;

  if v_trial_started is not null then
    return jsonb_build_object('eligible', false, 'reason', 'trial_used');
  end if;

  if v_trial_expires is not null and v_trial_expires < timezone('utc'::text, now()) then
    return jsonb_build_object('eligible', false, 'reason', 'trial_used');
  end if;

  if lower(coalesce(v_status, '')) = 'expired' then
    return jsonb_build_object('eligible', false, 'reason', 'trial_used');
  end if;

  return jsonb_build_object('eligible', true);
end;
$$;

revoke all on function public.check_trial_eligibility(text) from public;
grant execute on function public.check_trial_eligibility(text) to service_role;
