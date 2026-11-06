-- Beam: new-user onboarding (role + verified US city + safety commitment). Additive only.

-- 1) Reference table of every US Census place (50 states + DC + PR), 2025 Gazetteer + 2024 PEP population.
create table if not exists public.us_places (
  geoid text primary key check (geoid ~ '^[0-9]{7}$'),
  name text not null check (char_length(name) between 1 and 80),
  state_code text not null check (state_code ~ '^[A-Z]{2}$'),
  state_name text not null,
  lat double precision not null check (lat between 15 and 72),
  lng double precision not null check (lng between -180 and 180),
  population integer check (population >= 0),
  is_incorporated boolean not null default true,
  label text generated always as (name || ', ' || state_code) stored
);
create unique index if not exists us_places_state_name_key on public.us_places (state_code, lower(name));
create index if not exists us_places_population_idx on public.us_places (population desc nulls last);

alter table public.us_places enable row level security;
drop policy if exists us_places_select_all on public.us_places;
create policy us_places_select_all on public.us_places for select to anon, authenticated using (true);
revoke insert, update, delete, truncate on public.us_places from anon, authenticated;

-- 2) Onboarding columns on profiles (reuses existing location_label / lat / lng / is_helper).
alter table public.profiles
  add column if not exists account_role text,
  add column if not exists city text,
  add column if not exists state_code text,
  add column if not exists city_geoid text references public.us_places (geoid) on delete set null,
  add column if not exists safety_disclaimer_accepted_at timestamptz,
  add column if not exists safety_disclaimer_version text,
  add column if not exists onboarding_completed_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_account_role_check') then
    alter table public.profiles add constraint profiles_account_role_check
      check (account_role is null or account_role in ('customer', 'helper'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_state_code_check') then
    alter table public.profiles add constraint profiles_state_code_check
      check (state_code is null or state_code ~ '^[A-Z]{2}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_city_check') then
    alter table public.profiles add constraint profiles_city_check
      check (city is null or char_length(city) between 1 and 80);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_onboarding_role_check') then
    alter table public.profiles add constraint profiles_onboarding_role_check
      check (onboarding_completed_at is null or account_role is not null);
  end if;
end $$;

create index if not exists profiles_city_geoid_idx on public.profiles (city_geoid);

-- 3) Single sanctioned write path for completing onboarding (SECURITY INVOKER: RLS profiles_update_own applies).
create or replace function public.complete_onboarding(
  p_role text,
  p_city text,
  p_state_code text,
  p_accept_safety boolean,
  p_safety_version text default 'v1'
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
      onboarding_completed_at = coalesce(onboarding_completed_at, now())
  where id = v_uid
  returning * into v_row;

  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;
  return v_row;
end;
$$;

revoke all on function public.complete_onboarding(text, text, text, boolean, text) from public, anon;
grant execute on function public.complete_onboarding(text, text, text, boolean, text) to authenticated;

-- 4) Backfill ONLY the 4 QA fixture accounts (excluded from get_public_marketplace) so live QA scripts
--    are not gated. Real users (Google sign-ups) stay un-onboarded and will see the flow.
update public.profiles
set account_role = case when id = '22222222-2222-4222-8222-222222222222'::uuid then 'helper' else 'customer' end,
    onboarding_completed_at = coalesce(onboarding_completed_at, created_at)
where id in (
  '11111111-1111-4111-8111-111111111111'::uuid,
  '22222222-2222-4222-8222-222222222222'::uuid,
  '33333333-3333-4333-8333-333333333333'::uuid,
  'b995b6bf-ad97-445f-9bbd-3073263e7c98'::uuid
)
and onboarding_completed_at is null;
