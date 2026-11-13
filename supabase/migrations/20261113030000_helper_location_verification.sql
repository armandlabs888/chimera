-- Helper verification: replace utility-bill upload with one-time home location check.
-- Auto-approve only after this SECURITY DEFINER RPC geocodes the typed address via the
-- U.S. Census Bureau Geocoder (rooftop / range-interpolated). Clients cannot pass
-- address coordinates, a matched flag, distance, or geocode quality.
-- Live project: chimera (lfyqdrjqfpczsfkqjxpq). Do not apply to other projects.
--
-- Thresholds (meters): reject GPS accuracy worse than ~250m; accept when distance is
-- within ~150m plus a small accuracy buffer, hard-capped at ~200m.

create extension if not exists http with schema extensions;

-- Minimal query escaping for Census GET URLs (US address characters).
create or replace function private.urlencode(p text)
returns text
language sql
immutable
set search_path = ''
as $$
  select replace(replace(replace(replace(replace(replace(
    coalesce(p, ''),
    '%', '%25'), ' ', '+'), '#', '%23'), '&', '%26'), '?', '%3F'), ',', '%2C');
$$;

revoke all on function private.urlencode(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Schema: nullable documents (legacy), location fields, attempts, statuses
-- ---------------------------------------------------------------------------
alter table public.helper_verifications
  alter column document_path drop not null,
  alter column document_name drop not null;

alter table public.helper_verifications
  drop constraint if exists helper_verifications_status_check;

alter table public.helper_verifications
  add constraint helper_verifications_status_check
  check (status in ('unverified', 'pending', 'approved', 'needs_resubmission'));

alter table public.helper_verifications
  add column if not exists address_lat double precision,
  add column if not exists address_lng double precision,
  add column if not exists geocode_quality text
    check (
      geocode_quality is null
      or geocode_quality in ('rooftop', 'range_interpolated')
    ),
  add column if not exists last_device_lat double precision,
  add column if not exists last_device_lng double precision,
  add column if not exists last_device_accuracy_m double precision,
  add column if not exists last_distance_m double precision,
  add column if not exists last_check_result text
    check (
      last_check_result is null
      or last_check_result in (
        'matched',
        'not_at_home',
        'weak_signal',
        'geocode_imprecise',
        'geocode_failed',
        'rate_limited',
        'permission_denied'
      )
    ),
  add column if not exists last_checked_at timestamptz,
  add column if not exists verification_method text
    check (
      verification_method is null
      or verification_method in ('location', 'staff', 'document_legacy')
    );

-- Migrate any legacy pending document rows into staff-visible backup queue as-is.
-- Failed location checks use status = unverified (never "waiting on staff" for helpers).

create table if not exists public.helper_verification_attempts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  verification_id uuid references public.helper_verifications (id) on delete set null,
  result text not null
    check (
      result in (
        'matched',
        'not_at_home',
        'weak_signal',
        'geocode_imprecise',
        'geocode_failed',
        'rate_limited',
        'permission_denied'
      )
    ),
  email text,
  street text,
  apt text,
  city text,
  state_code text,
  zip text,
  address_lat double precision,
  address_lng double precision,
  geocode_quality text,
  device_lat double precision,
  device_lng double precision,
  device_accuracy_m double precision,
  distance_m double precision,
  created_at timestamptz not null default now()
);

create index if not exists helper_verification_attempts_profile_created_idx
  on public.helper_verification_attempts (profile_id, created_at desc);

create index if not exists helper_verification_attempts_result_idx
  on public.helper_verification_attempts (result, created_at desc);

alter table public.helper_verification_attempts enable row level security;
revoke all on table public.helper_verification_attempts from anon;
grant select on table public.helper_verification_attempts to authenticated;

drop policy if exists helper_verification_attempts_select_own_or_staff
  on public.helper_verification_attempts;
create policy helper_verification_attempts_select_own_or_staff
  on public.helper_verification_attempts for select
  to authenticated
  using (
    profile_id = (select auth.uid())
    or private.is_beam_staff((select auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- Census geocode (server-side only; never trust client address coords)
-- ---------------------------------------------------------------------------
create or replace function private.census_geocode_us_address(
  p_street text,
  p_city text,
  p_state text,
  p_zip text
)
returns table (
  lat double precision,
  lng double precision,
  quality text,
  matched_address text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_resp extensions.http_response;
  v_json jsonb;
  v_match jsonb;
  v_lat double precision;
  v_lng double precision;
  v_from text;
  v_to text;
  v_quality text;
begin
  v_url :=
    'https://geocoding.geo.census.gov/geocoder/locations/address'
    || '?street=' || private.urlencode(p_street)
    || '&city=' || private.urlencode(p_city)
    || '&state=' || private.urlencode(p_state)
    || '&zip=' || private.urlencode(p_zip)
    || '&benchmark=Public_AR_Current&format=json';

  begin
    v_resp := extensions.http_get(v_url);
  exception
    when others then
      return;
  end;

  if v_resp.status is distinct from 200 or v_resp.content is null then
    return;
  end if;

  begin
    v_json := v_resp.content::jsonb;
  exception
    when others then
      return;
  end;

  v_match := v_json #>'{result,addressMatches,0}';
  if v_match is null then
    return;
  end if;

  v_lat := nullif(v_match #>> '{coordinates,y}', '')::double precision;
  v_lng := nullif(v_match #>> '{coordinates,x}', '')::double precision;
  if v_lat is null or v_lng is null then
    return;
  end if;
  if v_lat < 15 or v_lat > 72 or v_lng < -180 or v_lng > -60 then
    -- Outside a generous CONUS/AK/HI box: treat as imprecise / unusable for HouseCall US market.
    return;
  end if;

  v_from := nullif(v_match #>> '{addressComponents,fromAddress}', '');
  v_to := nullif(v_match #>> '{addressComponents,toAddress}', '');
  -- Census locations matches are street-range interpolated when a TIGER span exists;
  -- treat a single-point span as rooftop-quality for threshold purposes.
  if v_from is not null and v_to is not null and v_from = v_to then
    v_quality := 'rooftop';
  else
    v_quality := 'range_interpolated';
  end if;

  lat := v_lat;
  lng := v_lng;
  quality := v_quality;
  matched_address := nullif(v_match #>> '{matchedAddress}', '');
  return next;
end;
$$;

revoke all on function private.census_geocode_us_address(text, text, text, text)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Confirm home: authenticated may call, but cannot supply match inputs
-- ---------------------------------------------------------------------------
create or replace function public.confirm_helper_home_location(
  p_email text,
  p_street text,
  p_apt text,
  p_city text,
  p_state_code text,
  p_zip text,
  p_device_lat double precision,
  p_device_lng double precision,
  p_device_accuracy_m double precision
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_email text := lower(trim(coalesce(p_email, '')));
  v_street text := trim(coalesce(p_street, ''));
  v_apt text := nullif(trim(coalesce(p_apt, '')), '');
  v_city text := trim(coalesce(p_city, ''));
  v_state text := upper(trim(coalesce(p_state_code, '')));
  v_zip text := trim(coalesce(p_zip, ''));
  v_row public.helper_verifications;
  v_geo_lat double precision := null;
  v_geo_lng double precision := null;
  v_geo_quality text := null;
  v_result text;
  v_distance_m double precision := null;
  v_distance_miles double precision;
  v_allowed_m double precision;
  v_accuracy double precision := p_device_accuracy_m;
  -- ~250m coarse GPS; ~150m match radius; hard cap ~200m (see migration header).
  v_max_accuracy_m constant double precision := 250;
  v_match_radius_m constant double precision := 150;
  v_hard_cap_m constant double precision := 200;
  v_recent int;
  v_attempt_id uuid;
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  if v_email !~* '^[^@\s]+@[^@\s]+\.[^\s@]+$' then
    raise exception 'Enter a full email address' using errcode = '22023';
  end if;
  if char_length(v_street) < 1 then
    raise exception 'Enter your home street address' using errcode = '22023';
  end if;
  if char_length(v_city) < 1 then
    raise exception 'Enter your city' using errcode = '22023';
  end if;
  if v_state !~ '^[A-Z]{2}$' then
    raise exception 'Enter a valid US state code' using errcode = '22023';
  end if;
  if v_zip !~ '^[0-9]{5}(-[0-9]{4})?$' then
    raise exception 'Enter a valid ZIP code' using errcode = '22023';
  end if;
  if p_device_lat is null or p_device_lng is null
     or p_device_lat < -90 or p_device_lat > 90
     or p_device_lng < -180 or p_device_lng > 180 then
    raise exception 'Location reading was incomplete. Try again on your phone.' using errcode = '22023';
  end if;

  -- Already approved: return current row, do not re-check.
  select * into v_row
  from public.helper_verifications hv
  where hv.profile_id = v_uid;

  if v_row.id is not null and v_row.status = 'approved' then
    return jsonb_build_object(
      'ok', true,
      'result', 'matched',
      'status', 'approved',
      'verification', to_jsonb(v_row)
    );
  end if;

  -- Rate limit: 8 attempts / rolling hour (blocks hammering / GPS spoof sweeps).
  select count(*)::int into v_recent
  from public.helper_verification_attempts a
  where a.profile_id = v_uid
    and a.created_at > now() - interval '1 hour';

  if v_recent >= 8 then
    v_result := 'rate_limited';
    insert into public.helper_verification_attempts (
      profile_id, verification_id, result, email, street, apt, city, state_code, zip,
      device_lat, device_lng, device_accuracy_m
    ) values (
      v_uid, v_row.id, v_result, v_email, v_street, v_apt, v_city, v_state, v_zip,
      p_device_lat, p_device_lng, v_accuracy
    ) returning id into v_attempt_id;

    return jsonb_build_object(
      'ok', false,
      'result', v_result,
      'status', coalesce(v_row.status, 'unverified'),
      'message', 'Too many attempts. Wait a bit, then try again when you are home.',
      'attempt_id', v_attempt_id
    );
  end if;

  if v_accuracy is null or v_accuracy > v_max_accuracy_m then
    v_result := 'weak_signal';
  else
    select g.lat, g.lng, g.quality
      into v_geo_lat, v_geo_lng, v_geo_quality
    from private.census_geocode_us_address(v_street, v_city, v_state, v_zip) g
    limit 1;

    if v_geo_lat is null or v_geo_lng is null or v_geo_quality is null then
      v_result := 'geocode_imprecise';
    else
      v_distance_miles := public.haversine_miles(
        v_geo_lat, v_geo_lng, p_device_lat, p_device_lng
      );
      v_distance_m := v_distance_miles * 1609.344;
      -- Buffer up to 50m of reported accuracy, hard-capped.
      v_allowed_m := least(
        v_hard_cap_m,
        v_match_radius_m + least(coalesce(v_accuracy, 50), 50)
      );
      if v_distance_m <= v_allowed_m then
        v_result := 'matched';
      else
        v_result := 'not_at_home';
      end if;
    end if;
  end if;

  insert into public.helper_verifications as hv (
    profile_id,
    status,
    email,
    street,
    apt,
    city,
    state_code,
    zip,
    document_path,
    document_name,
    document_mime,
    document_bytes,
    address_lat,
    address_lng,
    geocode_quality,
    last_device_lat,
    last_device_lng,
    last_device_accuracy_m,
    last_distance_m,
    last_check_result,
    last_checked_at,
    verification_method,
    review_reason,
    reviewed_by,
    reviewed_at,
    submitted_at,
    updated_at
  )
  values (
    v_uid,
    case when v_result = 'matched' then 'approved' else 'unverified' end,
    v_email,
    v_street,
    v_apt,
    v_city,
    v_state,
    v_zip,
    null,
    null,
    null,
    null,
    v_geo_lat,
    v_geo_lng,
    v_geo_quality,
    p_device_lat,
    p_device_lng,
    v_accuracy,
    v_distance_m,
    v_result,
    now(),
    case when v_result = 'matched' then 'location' else null end,
    null,
    null,
    case when v_result = 'matched' then now() else null end,
    now(),
    now()
  )
  on conflict (profile_id) do update
  set
    status = case
      when hv.status = 'approved' then hv.status
      when v_result = 'matched' then 'approved'
      else 'unverified'
    end,
    email = excluded.email,
    street = excluded.street,
    apt = excluded.apt,
    city = excluded.city,
    state_code = excluded.state_code,
    zip = excluded.zip,
    document_path = null,
    document_name = null,
    document_mime = null,
    document_bytes = null,
    address_lat = coalesce(excluded.address_lat, hv.address_lat),
    address_lng = coalesce(excluded.address_lng, hv.address_lng),
    geocode_quality = coalesce(excluded.geocode_quality, hv.geocode_quality),
    last_device_lat = excluded.last_device_lat,
    last_device_lng = excluded.last_device_lng,
    last_device_accuracy_m = excluded.last_device_accuracy_m,
    last_distance_m = excluded.last_distance_m,
    last_check_result = excluded.last_check_result,
    last_checked_at = excluded.last_checked_at,
    verification_method = case
      when v_result = 'matched' then 'location'
      else hv.verification_method
    end,
    review_reason = case when v_result = 'matched' then null else hv.review_reason end,
    reviewed_by = case when v_result = 'matched' then null else hv.reviewed_by end,
    reviewed_at = case when v_result = 'matched' then now() else hv.reviewed_at end,
    submitted_at = now(),
    updated_at = now()
  where hv.status is distinct from 'approved'
     or v_result = 'matched'
  returning * into v_row;

  if v_row.id is null then
    select * into v_row from public.helper_verifications where profile_id = v_uid;
  end if;

  insert into public.helper_verification_attempts (
    profile_id,
    verification_id,
    result,
    email,
    street,
    apt,
    city,
    state_code,
    zip,
    address_lat,
    address_lng,
    geocode_quality,
    device_lat,
    device_lng,
    device_accuracy_m,
    distance_m
  ) values (
    v_uid,
    v_row.id,
    v_result,
    v_email,
    v_street,
    v_apt,
    v_city,
    v_state,
    v_zip,
    v_geo_lat,
    v_geo_lng,
    v_geo_quality,
    p_device_lat,
    p_device_lng,
    v_accuracy,
    v_distance_m
  ) returning id into v_attempt_id;

  if v_result = 'matched' then
    insert into public.notifications (user_id, kind, title, body, href)
    values (
      v_uid,
      'verification_approved',
      'You are verified',
      'You are at this address, so you can make offers on local jobs right away.',
      '/browse'
    );

    return jsonb_build_object(
      'ok', true,
      'result', v_result,
      'status', 'approved',
      'distance_m', v_distance_m,
      'geocode_quality', v_geo_quality,
      'attempt_id', v_attempt_id,
      'verification', to_jsonb(v_row)
    );
  end if;

  return jsonb_build_object(
    'ok', false,
    'result', v_result,
    'status', 'unverified',
    'distance_m', v_distance_m,
    'geocode_quality', v_geo_quality,
    'attempt_id', v_attempt_id,
    'verification', to_jsonb(v_row),
    'message', case v_result
      when 'not_at_home' then
        'It looks like you are not at this address right now. Try again when you are home. This works best on your phone.'
      when 'weak_signal' then
        'Location accuracy was too weak. Try again on your phone with location turned on.'
      when 'geocode_imprecise' then
        'We could not precisely locate that address. Check the street, city, state, and ZIP, then try again. If it still fails, HouseCall staff can review your attempts.'
      else
        'We could not confirm you are home. Try again when you are at this address.'
    end
  );
end;
$$;

revoke all on function public.confirm_helper_home_location(
  text, text, text, text, text, text, double precision, double precision, double precision
) from public, anon;
grant execute on function public.confirm_helper_home_location(
  text, text, text, text, text, text, double precision, double precision, double precision
) to authenticated;

-- Soft-retire bill submit: keep signature for old clients, but reject with clear guidance.
create or replace function public.submit_helper_verification(
  p_email text,
  p_street text,
  p_apt text,
  p_city text,
  p_state_code text,
  p_zip text,
  p_document_path text,
  p_document_name text,
  p_document_mime text default null,
  p_document_bytes integer default null
)
returns public.helper_verifications
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception
    'Utility bill upload is no longer used. Confirm you are home with a one-time location check.'
    using errcode = '22023';
end;
$$;

revoke all on function public.submit_helper_verification(
  text, text, text, text, text, text, text, text, text, integer
) from public, anon;
grant execute on function public.submit_helper_verification(
  text, text, text, text, text, text, text, text, text, integer
) to authenticated;

-- Staff backup: approve helpers stuck on unverified / legacy pending / needs_resubmission.
create or replace function public.review_helper_verification(
  p_profile_id uuid,
  p_approve boolean,
  p_reason text default null
)
returns public.helper_verifications
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_row public.helper_verifications;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  if not private.is_beam_staff(v_uid) then
    raise exception 'Staff only' using errcode = '42501';
  end if;
  if p_profile_id is null then
    raise exception 'Missing helper' using errcode = '22023';
  end if;
  if not coalesce(p_approve, false) and v_reason is null then
    raise exception 'Tell the Helper why they should try again' using errcode = '22023';
  end if;

  update public.helper_verifications
  set
    status = case when p_approve then 'approved' else 'unverified' end,
    review_reason = case when p_approve then null else v_reason end,
    reviewed_by = v_uid,
    reviewed_at = now(),
    verification_method = case when p_approve then 'staff' else verification_method end,
    updated_at = now()
  where profile_id = p_profile_id
    and status in ('unverified', 'pending', 'needs_resubmission')
  returning * into v_row;

  if v_row.id is null then
    raise exception 'No reviewable verification for this Helper' using errcode = '22023';
  end if;

  if p_approve then
    insert into public.notifications (user_id, kind, title, body, href)
    values (
      p_profile_id,
      'verification_approved',
      'You are verified',
      'HouseCall verified your home address. You can make offers on local jobs now.',
      '/browse'
    );
  else
    insert into public.notifications (user_id, kind, title, body, href)
    values (
      p_profile_id,
      'verification_needs_resubmission',
      'Try home confirmation again',
      v_reason,
      '/verify'
    );
  end if;

  return v_row;
end;
$$;

revoke all on function public.review_helper_verification(uuid, boolean, text) from public, anon;
grant execute on function public.review_helper_verification(uuid, boolean, text) to authenticated;

-- Staff queue helper: latest attempt per non-approved verification.
create or replace function public.list_helper_verification_review_queue()
returns table (
  verification public.helper_verifications,
  latest_attempt public.helper_verification_attempts
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_beam_staff((select auth.uid())) then
    raise exception 'Staff only' using errcode = '42501';
  end if;

  return query
  select
    hv,
    a
  from public.helper_verifications hv
  left join lateral (
    select att.*
    from public.helper_verification_attempts att
    where att.profile_id = hv.profile_id
    order by att.created_at desc
    limit 1
  ) a on true
  where hv.status in ('unverified', 'pending', 'needs_resubmission')
  order by coalesce(hv.last_checked_at, hv.submitted_at) desc;
end;
$$;

revoke all on function public.list_helper_verification_review_queue() from public, anon;
grant execute on function public.list_helper_verification_review_queue() to authenticated;
