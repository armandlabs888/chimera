-- Browse distance filter: return open jobs (and helpers) with rounded miles
-- from a viewer origin. Prefer this over client Haversine so exact home
-- coordinates stay request-scoped and only rounded miles are shown.
-- Idempotent. Do NOT apply from the agent; ship via repo migrations only.

-- Round for display: one decimal under 10 mi, whole miles at/above 10.
create or replace function public.round_browse_miles(p_miles double precision)
returns double precision
language sql
immutable
strict
set search_path = ''
as $$
  select case
    when p_miles < 10 then round(p_miles::numeric, 1)::double precision
    else round(p_miles::numeric, 0)::double precision
  end;
$$;

revoke all on function public.round_browse_miles(double precision) from public;
grant execute on function public.round_browse_miles(double precision) to anon, authenticated;

-- Resolve origin: explicit lat/lng, else approved helper verification home point.
create or replace function public.browse_marketplace_distances(
  p_origin_lat double precision default null,
  p_origin_lng double precision default null,
  p_radius_miles double precision default null
)
returns table (
  entity_type text,
  entity_id uuid,
  distance_miles double precision
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_lat double precision := p_origin_lat;
  v_lng double precision := p_origin_lng;
  v_uid uuid := (select auth.uid());
  v_radius double precision := p_radius_miles;
begin
  if v_radius is not null and v_radius <= 0 then
    v_radius := null;
  end if;

  -- Derive home from approved helper verification when caller omits origin.
  if (v_lat is null or v_lng is null) and v_uid is not null then
    select hv.address_lat, hv.address_lng
      into v_lat, v_lng
    from public.helper_verifications hv
    where hv.profile_id = v_uid
      and hv.status = 'approved'
      and hv.address_lat is not null
      and hv.address_lng is not null
    limit 1;
  end if;

  -- No usable origin: return open marketplace rows with null distance (Any).
  if v_lat is null or v_lng is null then
    return query
    select 'request'::text, r.id, null::double precision
    from public.help_requests r
    where r.status = 'open'
      and r.title <> 'Live persistence sofa lift';

    return query
    select 'profile'::text, p.id, null::double precision
    from public.profiles p
    where p.id not in (
      '11111111-1111-4111-8111-111111111111'::uuid,
      '22222222-2222-4222-8222-222222222222'::uuid,
      '33333333-3333-4333-8333-333333333333'::uuid,
      'b995b6bf-ad97-445f-9bbd-3073263e7c98'::uuid
    )
      and (
        p.is_helper = true
        or cardinality(coalesce(p.skills, '{}'::text[])) > 0
      );
    return;
  end if;

  -- Jobs: exclude rows without coordinates when a radius is set.
  return query
  select
    'request'::text,
    r.id,
    public.round_browse_miles(
      public.haversine_miles(v_lat, v_lng, r.lat, r.lng)
    ) as distance_miles
  from public.help_requests r
  where r.status = 'open'
    and r.title <> 'Live persistence sofa lift'
    and r.lat is not null
    and r.lng is not null
    and (
      v_radius is null
      or public.haversine_miles(v_lat, v_lng, r.lat, r.lng) <= v_radius
    );

  -- Jobs lacking coordinates only appear under Any (no radius).
  if v_radius is null then
    return query
    select 'request'::text, r.id, null::double precision
    from public.help_requests r
    where r.status = 'open'
      and r.title <> 'Live persistence sofa lift'
      and (r.lat is null or r.lng is null);
  end if;

  -- Helpers / people with coordinates.
  return query
  select
    'profile'::text,
    p.id,
    public.round_browse_miles(
      public.haversine_miles(v_lat, v_lng, p.lat, p.lng)
    ) as distance_miles
  from public.profiles p
  where p.id not in (
    '11111111-1111-4111-8111-111111111111'::uuid,
    '22222222-2222-4222-8222-222222222222'::uuid,
    '33333333-3333-4333-8333-333333333333'::uuid,
    'b995b6bf-ad97-445f-9bbd-3073263e7c98'::uuid
  )
    and (
      p.is_helper = true
      or cardinality(coalesce(p.skills, '{}'::text[])) > 0
    )
    and p.lat is not null
    and p.lng is not null
    and (
      v_radius is null
      or public.haversine_miles(v_lat, v_lng, p.lat, p.lng) <= v_radius
    );

  if v_radius is null then
    return query
    select 'profile'::text, p.id, null::double precision
    from public.profiles p
    where p.id not in (
      '11111111-1111-4111-8111-111111111111'::uuid,
      '22222222-2222-4222-8222-222222222222'::uuid,
      '33333333-3333-4333-8333-333333333333'::uuid,
      'b995b6bf-ad97-445f-9bbd-3073263e7c98'::uuid
    )
      and (
        p.is_helper = true
        or cardinality(coalesce(p.skills, '{}'::text[])) > 0
      )
      and (p.lat is null or p.lng is null);
  end if;
end;
$$;

revoke all on function public.browse_marketplace_distances(
  double precision, double precision, double precision
) from public;
grant execute on function public.browse_marketplace_distances(
  double precision, double precision, double precision
) to anon, authenticated;

comment on function public.browse_marketplace_distances(
  double precision, double precision, double precision
) is
  'Browse distance filter: rounded miles from viewer origin (or approved helper home). Jobs without lat/lng only appear when p_radius_miles is null (Any).';
