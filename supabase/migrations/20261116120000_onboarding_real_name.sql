-- Onboarding real-name capture.
-- Adds optional first_name / last_name on profiles and extends
-- complete_onboarding with optional p_first_name / p_last_name.
-- When both are supplied, stores them and writes "First Last" to profiles.name.
-- Full validation lives in src/lib/realName.ts (app + API); SQL enforces
-- presence, length, and a basic character allowlist when names are supplied.
-- DO NOT apply automatically from this PR; review before running.

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_first_name_len_check'
  ) then
    alter table public.profiles
      add constraint profiles_first_name_len_check
      check (first_name is null or char_length(trim(first_name)) between 2 and 40);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_last_name_len_check'
  ) then
    alter table public.profiles
      add constraint profiles_last_name_len_check
      check (last_name is null or char_length(trim(last_name)) between 2 and 40);
  end if;
end $$;

drop function if exists public.complete_onboarding(text, text, text, boolean, text);

create function public.complete_onboarding(
  p_role text,
  p_city text,
  p_state_code text,
  p_accept_safety boolean,
  p_safety_version text default 'v1',
  p_first_name text default null,
  p_last_name text default null
)
returns public.profiles
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_place public.us_places;
  v_row public.profiles;
  v_first text := nullif(trim(both from regexp_replace(coalesce(p_first_name, ''), '\s+', ' ', 'g')), '');
  v_last text := nullif(trim(both from regexp_replace(coalesce(p_last_name, ''), '\s+', ' ', 'g')), '');
  v_full text;
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  if p_role is null or p_role not in ('customer', 'helper') then
    raise exception 'Choose whether you are a customer or a helper' using errcode = '22023';
  end if;
  if not coalesce(p_accept_safety, false) then
    raise exception 'You must agree to the Beam safety commitment' using errcode = '22023';
  end if;

  -- When either name part is supplied, both are required and must look like names.
  if v_first is not null or v_last is not null then
    if v_first is null or v_last is null then
      raise exception 'This is not a real name. Please enter your legal first and last name.'
        using errcode = '22023';
    end if;
    if char_length(v_first) < 2 or char_length(v_first) > 40
       or char_length(v_last) < 2 or char_length(v_last) > 40 then
      raise exception 'This is not a real name. Please enter your legal first and last name.'
        using errcode = '22023';
    end if;
    -- Reject digits and common symbols; full Unicode letter rules live in the app.
    if v_first ~ '[0-9@_#]' or v_last ~ '[0-9@_#]' then
      raise exception 'This is not a real name. Please enter your legal first and last name.'
        using errcode = '22023';
    end if;
    if lower(v_first) = lower(v_last) then
      raise exception 'This is not a real name. Please enter your legal first and last name.'
        using errcode = '22023';
    end if;
    v_full := left(v_first || ' ' || v_last, 80);
  end if;

  select * into v_place
  from public.us_places
  where state_code = upper(trim(coalesce(p_state_code, '')))
    and lower(name) = lower(trim(coalesce(p_city, '')));
  if not found then
    raise exception 'Select a US city from the list' using errcode = '22023';
  end if;

  update public.profiles
  set account_role = p_role,
      city = v_place.name,
      state_code = v_place.state_code,
      city_geoid = v_place.geoid,
      location_label = v_place.name || ', ' || v_place.state_code,
      lat = v_place.lat,
      lng = v_place.lng,
      neighborhood = '',
      safety_disclaimer_accepted_at = now(),
      safety_disclaimer_version = left(coalesce(nullif(trim(p_safety_version), ''), 'v1'), 40),
      onboarding_completed_at = coalesce(onboarding_completed_at, now()),
      first_name = coalesce(v_first, first_name),
      last_name = coalesce(v_last, last_name),
      name = coalesce(v_full, name)
  where id = v_uid
  returning * into v_row;

  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;
  return v_row;
end;
$$;

revoke all on function public.complete_onboarding(text, text, text, boolean, text, text, text) from public, anon;
grant execute on function public.complete_onboarding(text, text, text, boolean, text, text, text) to authenticated;
