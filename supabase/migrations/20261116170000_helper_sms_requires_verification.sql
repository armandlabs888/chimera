-- Require home-location verification before enabling urgent job SMS alerts.
-- Does NOT change existing rows. Review and apply separately; do not auto-apply.

create or replace function private.guard_helper_urgent_sms_settings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_verified boolean := false;
begin
  if tg_op = 'UPDATE'
     and coalesce(auth.role(), '') = 'authenticated'
     and current_user <> 'postgres' then
    -- Preserve phone confirmation fields from client updates.
    if new.phone_e164 is distinct from old.phone_e164
       or new.phone_confirmed_at is distinct from old.phone_confirmed_at then
      new.phone_e164 := old.phone_e164;
      new.phone_confirmed_at := old.phone_confirmed_at;
    end if;
  end if;

  if tg_op = 'INSERT'
     and coalesce(auth.role(), '') = 'authenticated'
     and current_user <> 'postgres' then
    new.phone_confirmed_at := null;
    new.sms_opt_in := coalesce(new.sms_opt_in, false);
  end if;

  -- Turning texts on requires an approved home-location verification.
  -- Leaving texts on (already true) is left alone so existing rows are untouched.
  if coalesce(new.sms_opt_in, false) = true
     and (
       tg_op = 'INSERT'
       or coalesce(old.sms_opt_in, false) is distinct from true
     )
     and coalesce(auth.role(), '') = 'authenticated'
     and current_user <> 'postgres' then
    select exists (
      select 1
      from public.helper_verifications hv
      where hv.profile_id = new.profile_id
        and hv.status = 'approved'
    ) into v_verified;

    if not v_verified then
      raise exception 'You have to verify first to turn on text alerts.'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.guard_helper_urgent_sms_settings() from public, anon, authenticated;

comment on function private.guard_helper_urgent_sms_settings() is
  'Guards helper_urgent_sms_settings writes: preserves phone confirmation fields for clients, and rejects sms_opt_in=true unless helper_verifications.status is approved. Does not mutate existing opted-in rows.';
