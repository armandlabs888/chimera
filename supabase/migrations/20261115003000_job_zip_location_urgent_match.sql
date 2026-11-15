-- Job ZIP centers + urgent SMS matching (same ZIP or within ZIP-center radius).
-- Idempotent. Do NOT apply from the agent to live DB; ship via repo migrations only.
-- Live project: chimera (lfyqdrjqfpczsfkqjxpq).
--
-- ZIP lat/lng/city/state resolution happens in the app from the bundled Census ZCTA
-- gazetteer (src/data/us-zips.v1.json). This migration only adds job columns and
-- updates matching. Existing jobs/helpers are NOT backfilled.

-- ---------------------------------------------------------------------------
-- help_requests: optional structured place from the poster ZIP
-- ---------------------------------------------------------------------------
alter table public.help_requests
  add column if not exists zip text;

alter table public.help_requests
  add column if not exists city text;

alter table public.help_requests
  add column if not exists state_code text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'help_requests_zip_check'
  ) then
    alter table public.help_requests
      add constraint help_requests_zip_check
      check (zip is null or zip ~ '^[0-9]{5}$');
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'help_requests_state_code_check'
  ) then
    alter table public.help_requests
      add constraint help_requests_state_code_check
      check (state_code is null or state_code ~ '^[A-Z]{2}$');
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'help_requests_city_check'
  ) then
    alter table public.help_requests
      add constraint help_requests_city_check
      check (city is null or char_length(city) between 1 and 80);
  end if;
end $$;

create index if not exists help_requests_zip_idx
  on public.help_requests (zip)
  where zip is not null;

comment on column public.help_requests.zip is
  'Poster 5-digit US ZIP. New posts set this; legacy rows may be null.';
comment on column public.help_requests.city is
  'City derived from the poster ZIP centroid (not a street address).';
comment on column public.help_requests.state_code is
  'Two-letter state derived from the poster ZIP centroid.';

-- ---------------------------------------------------------------------------
-- Match helpers: same verified home ZIP OR within radius of job ZIP center.
-- First wave uses 5 mi; escalation uses 8 mi (passed by the app).
-- ---------------------------------------------------------------------------
create or replace function private.match_urgent_job_helpers(
  p_request_id uuid,
  p_radius_miles double precision default 5
)
returns table (
  helper_id uuid,
  distance_miles double precision,
  phone_e164 text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_req public.help_requests;
  v_job_zip text;
begin
  select * into v_req from public.help_requests where id = p_request_id;
  if v_req.id is null then
    return;
  end if;
  if coalesce(p_radius_miles, 0) <= 0 then
    return;
  end if;

  v_job_zip := nullif(left(trim(coalesce(v_req.zip, '')), 5), '');
  if v_job_zip is not null and v_job_zip !~ '^[0-9]{5}$' then
    v_job_zip := null;
  end if;

  -- Need a job ZIP (same-ZIP match) and/or a point (radius match).
  if v_job_zip is null and (v_req.lat is null or v_req.lng is null) then
    return;
  end if;

  return query
  select
    p.id as helper_id,
    case
      when hv.address_lat is not null
           and hv.address_lng is not null
           and v_req.lat is not null
           and v_req.lng is not null
        then public.haversine_miles(
          v_req.lat, v_req.lng, hv.address_lat, hv.address_lng
        )
      when v_job_zip is not null
           and left(trim(coalesce(hv.zip, '')), 5) = v_job_zip
        then 0::double precision
      else null::double precision
    end as distance_miles,
    s.phone_e164
  from public.profiles p
  inner join public.helper_verifications hv
    on hv.profile_id = p.id
   and hv.status = 'approved'
  inner join public.helper_urgent_sms_settings s
    on s.profile_id = p.id
   and s.sms_opt_in = true
   and s.phone_confirmed_at is not null
   and s.phone_e164 is not null
  where p.id is distinct from v_req.requester_id
    and coalesce(p.available_now, false) = true
    and (
      p.is_helper = true
      or cardinality(coalesce(p.skills, '{}'::text[])) > 0
    )
    and v_req.category = any (coalesce(p.skills, '{}'::text[]))
    and not private.in_quiet_hours(s.quiet_hours_start, s.quiet_hours_end, now())
    and (
      -- Same verified home ZIP as the job
      (
        v_job_zip is not null
        and nullif(left(trim(coalesce(hv.zip, '')), 5), '') = v_job_zip
      )
      or (
        -- Or home point within radius of the job ZIP center
        v_req.lat is not null
        and v_req.lng is not null
        and hv.address_lat is not null
        and hv.address_lng is not null
        and public.haversine_miles(
          v_req.lat, v_req.lng, hv.address_lat, hv.address_lng
        ) <= p_radius_miles
      )
    )
    and (
      select count(*)::int
      from public.urgent_job_sms_notifications n
      where n.helper_id = p.id
        and n.status = 'sent'
        and n.kind in ('urgent_match', 'urgent_escalation')
        and n.created_at >= (timezone('America/Los_Angeles', now()))::date
          at time zone 'America/Los_Angeles'
    ) < coalesce(s.daily_text_limit, 5)
  order by distance_miles asc nulls last;
end;
$$;

revoke all on function private.match_urgent_job_helpers(uuid, double precision)
  from public, anon, authenticated;

create or replace function public.match_urgent_job_helpers(
  p_request_id uuid,
  p_radius_miles double precision default 5
)
returns table (
  helper_id uuid,
  distance_miles double precision,
  phone_e164 text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') is distinct from 'service_role'
     and current_user is distinct from 'postgres'
     and current_user is distinct from 'supabase_admin' then
    raise exception 'service role only' using errcode = '42501';
  end if;

  return query
  select m.helper_id, m.distance_miles, m.phone_e164
  from private.match_urgent_job_helpers(p_request_id, p_radius_miles) m;
end;
$$;

revoke all on function public.match_urgent_job_helpers(uuid, double precision)
  from public, anon, authenticated;

-- Expose city / state_code / zip on marketplace payloads (null for legacy jobs).
create or replace function public.get_public_marketplace()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with open_reqs as (
    select
      r.id, r.title, r.details, r.category, r.category_custom, r.neighborhood, r.location_label,
      r.city, r.state_code, r.zip,
      r.lat, r.lng, r.radius_miles, r.when_option, r.when_label, r.scheduled_for, r.scheduled_end,
      r.budget, r.budget_type, r.status, r.requester_id, r.image, r.images, r.created_at, r.updated_at,
      r.is_urgent, r.urgent_helpers_notified_count,
      (select count(*)::int from public.offers o where o.request_id = r.id and o.status = 'pending') as offer_count
    from public.help_requests r
    where r.status = 'open' and r.title <> 'Live persistence sofa lift'
    order by r.created_at desc
    limit 60
  ),
  visible_profiles as (
    select
      p.id, p.name, p.avatar_url, p.bio, p.neighborhood, p.location_label,
      p.lat, p.lng, p.service_radius_miles, p.skills, p.hourly_rate, p.rate_type,
      p.available_now, p.is_helper, p.availability, p.rating, p.review_count,
      p.jobs_completed, p.created_at, p.updated_at
    from public.profiles p
    where p.id not in (
      '11111111-1111-4111-8111-111111111111'::uuid,
      '22222222-2222-4222-8222-222222222222'::uuid,
      '33333333-3333-4333-8333-333333333333'::uuid,
      'b995b6bf-ad97-445f-9bbd-3073263e7c98'::uuid
    )
    and (p.is_helper = true or cardinality(p.skills) > 0 or p.id in (select requester_id from open_reqs))
    order by p.available_now desc, p.rating desc, p.jobs_completed desc
    limit 80
  ),
  visible_reviews as (
    select rv.id, rv.request_id, rv.from_id, rv.to_id, rv.rating, rv.comment, rv.created_at
    from public.reviews rv
    where rv.to_id in (select id from visible_profiles)
    order by rv.created_at desc
    limit 100
  )
  select jsonb_build_object(
    'requests', coalesce((select jsonb_agg(to_jsonb(open_reqs)) from open_reqs), '[]'::jsonb),
    'profiles', coalesce((select jsonb_agg(to_jsonb(visible_profiles)) from visible_profiles), '[]'::jsonb),
    'reviews', coalesce((select jsonb_agg(to_jsonb(visible_reviews)) from visible_reviews), '[]'::jsonb)
  );
$$;

revoke all on function public.get_public_marketplace() from public;
grant execute on function public.get_public_marketplace() to anon, authenticated;
