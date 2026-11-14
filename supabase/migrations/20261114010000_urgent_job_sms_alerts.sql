-- Hyperlocal urgent job SMS alerts (HouseCall).
-- Idempotent. Do NOT apply from the agent to live DB; ship via repo migrations only.
-- Live project: chimera (lfyqdrjqfpczsfkqjxpq).
--
-- SMS is strictly optional and OFF by default (sms_opt_in default false).
-- Helper home coordinates for matching: helper_verifications.address_lat/lng
-- (written only by verify / confirm_helper_home_location). Matching is SECURITY DEFINER
-- and never returns coordinates or street addresses to clients.

-- ---------------------------------------------------------------------------
-- Help requests: urgent flag + poster feedback count + escalation marker
-- ---------------------------------------------------------------------------
alter table public.help_requests
  add column if not exists is_urgent boolean not null default false;

alter table public.help_requests
  add column if not exists urgent_helpers_notified_count integer not null default 0
    check (urgent_helpers_notified_count >= 0);

alter table public.help_requests
  add column if not exists urgent_escalated_at timestamptz;

create index if not exists help_requests_urgent_open_idx
  on public.help_requests (created_at)
  where is_urgent = true and status = 'open';

comment on column public.help_requests.is_urgent is
  'Poster opted into I need help now SMS matching. Regular jobs stay false.';
comment on column public.help_requests.urgent_helpers_notified_count is
  'Count of helpers successfully texted for this urgent job (poster-facing).';

-- ---------------------------------------------------------------------------
-- Helper SMS settings (opt-in OFF by default; never required in onboarding/verify)
-- ---------------------------------------------------------------------------
create table if not exists public.helper_urgent_sms_settings (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  phone_e164 text
    check (
      phone_e164 is null
      or phone_e164 ~ '^\+[1-9][0-9]{7,14}$'
    ),
  phone_confirmed_at timestamptz,
  -- Strictly optional. Existing and new helpers default to false.
  sms_opt_in boolean not null default false,
  quiet_hours_start time,
  quiet_hours_end time,
  daily_text_limit integer not null default 5
    check (daily_text_limit >= 0 and daily_text_limit <= 50),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint helper_urgent_sms_settings_phone_confirmed_ck check (
    phone_confirmed_at is null
    or (phone_e164 is not null and phone_confirmed_at is not null)
  )
);

create index if not exists helper_urgent_sms_settings_opt_in_idx
  on public.helper_urgent_sms_settings (sms_opt_in)
  where sms_opt_in = true and phone_confirmed_at is not null;

drop trigger if exists helper_urgent_sms_settings_touch_updated_at
  on public.helper_urgent_sms_settings;
create trigger helper_urgent_sms_settings_touch_updated_at
before update on public.helper_urgent_sms_settings
for each row execute function private.touch_updated_at();

alter table public.helper_urgent_sms_settings enable row level security;
revoke all on table public.helper_urgent_sms_settings from anon;
grant select, insert, update on table public.helper_urgent_sms_settings to authenticated;

drop policy if exists helper_urgent_sms_settings_select_own
  on public.helper_urgent_sms_settings;
create policy helper_urgent_sms_settings_select_own
  on public.helper_urgent_sms_settings for select
  to authenticated
  using (profile_id = (select auth.uid()));

drop policy if exists helper_urgent_sms_settings_insert_own
  on public.helper_urgent_sms_settings;
create policy helper_urgent_sms_settings_insert_own
  on public.helper_urgent_sms_settings for insert
  to authenticated
  with check (
    profile_id = (select auth.uid())
    and sms_opt_in = false
    and phone_confirmed_at is null
  );

drop policy if exists helper_urgent_sms_settings_update_own
  on public.helper_urgent_sms_settings;
create policy helper_urgent_sms_settings_update_own
  on public.helper_urgent_sms_settings for update
  to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

-- Clients may flip opt-in / quiet hours / daily cap, but cannot self-confirm a phone
-- or rewrite a confirmed number without going through the SMS verify API (service role).
create or replace function private.guard_helper_urgent_sms_settings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
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
    -- Opting in without a confirmed phone is allowed in the row, but matching
    -- still requires phone_confirmed_at. Keep sms_opt_in writable (default false).
  end if;

  if tg_op = 'INSERT'
     and coalesce(auth.role(), '') = 'authenticated'
     and current_user <> 'postgres' then
    new.phone_confirmed_at := null;
    new.sms_opt_in := coalesce(new.sms_opt_in, false);
  end if;

  return new;
end;
$$;

revoke all on function private.guard_helper_urgent_sms_settings() from public, anon, authenticated;

drop trigger if exists helper_urgent_sms_settings_guard
  on public.helper_urgent_sms_settings;
create trigger helper_urgent_sms_settings_guard
before insert or update on public.helper_urgent_sms_settings
for each row execute function private.guard_helper_urgent_sms_settings();

comment on table public.helper_urgent_sms_settings is
  'Optional urgent-job SMS prefs. sms_opt_in defaults false; never required in onboarding.';
comment on column public.helper_urgent_sms_settings.sms_opt_in is
  'Text me urgent jobs near me. Optional; OFF by default for every helper.';

-- ---------------------------------------------------------------------------
-- OTP codes (server-only; used when Twilio Verify is not configured)
-- ---------------------------------------------------------------------------
create table if not exists public.helper_sms_otp_codes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  phone_e164 text not null check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  code_hash text not null,
  expires_at timestamptz not null,
  attempt_count integer not null default 0,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists helper_sms_otp_codes_profile_idx
  on public.helper_sms_otp_codes (profile_id, created_at desc);

alter table public.helper_sms_otp_codes enable row level security;
revoke all on table public.helper_sms_otp_codes from anon, authenticated;
-- No policies: service role / SQL only.

-- ---------------------------------------------------------------------------
-- Notification log (server-only; prevents duplicate sends)
-- ---------------------------------------------------------------------------
create table if not exists public.urgent_job_sms_notifications (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.help_requests (id) on delete cascade,
  helper_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null
    check (kind in ('urgent_match', 'urgent_escalation', 'urgent_taken')),
  status text not null
    check (status in ('queued', 'sent', 'skipped', 'failed')),
  twilio_sid text,
  distance_miles double precision,
  error_message text,
  created_at timestamptz not null default now(),
  unique (request_id, helper_id, kind)
);

create index if not exists urgent_job_sms_notifications_request_idx
  on public.urgent_job_sms_notifications (request_id, kind, status);

create index if not exists urgent_job_sms_notifications_helper_day_idx
  on public.urgent_job_sms_notifications (helper_id, created_at desc);

alter table public.urgent_job_sms_notifications enable row level security;
revoke all on table public.urgent_job_sms_notifications from anon, authenticated;
-- Server-only log. Poster-facing count lives on help_requests.urgent_helpers_notified_count.
-- Allow poster to read aggregate count only via the help_requests column (already readable).

-- Poster may read their own jobs' notification counts without seeing helper phones.
-- Optional: let poster SELECT count rows for their requests (no phone columns here).
grant select on table public.urgent_job_sms_notifications to authenticated;

drop policy if exists urgent_job_sms_notifications_select_poster
  on public.urgent_job_sms_notifications;
create policy urgent_job_sms_notifications_select_poster
  on public.urgent_job_sms_notifications for select
  to authenticated
  using (
    exists (
      select 1
      from public.help_requests r
      where r.id = request_id
        and r.requester_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- Quiet-hours helper (America/Chicago local clock for HouseCall launch market)
-- ---------------------------------------------------------------------------
create or replace function private.in_quiet_hours(
  p_start time,
  p_end time,
  p_now timestamptz default now()
)
returns boolean
language sql
stable
set search_path = ''
as $$
  select case
    when p_start is null or p_end is null then false
    when p_start = p_end then false
    else (
      with local_t as (
        select (p_now at time zone 'America/Chicago')::time as t
      )
      select case
        when p_start < p_end then t >= p_start and t < p_end
        else t >= p_start or t < p_end
      end
      from local_t
    )
  end;
$$;

revoke all on function private.in_quiet_hours(time, time, timestamptz)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Match helpers for an urgent job (SECURITY DEFINER; no coords in result)
-- Uses privately stored verification home coords (address_lat/lng).
-- ---------------------------------------------------------------------------
create or replace function private.match_urgent_job_helpers(
  p_request_id uuid,
  p_radius_miles double precision default 3
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
begin
  select * into v_req from public.help_requests where id = p_request_id;
  if v_req.id is null then
    return;
  end if;
  if v_req.lat is null or v_req.lng is null then
    return;
  end if;
  if coalesce(p_radius_miles, 0) <= 0 then
    return;
  end if;

  return query
  select
    p.id as helper_id,
    public.haversine_miles(v_req.lat, v_req.lng, hv.address_lat, hv.address_lng) as distance_miles,
    s.phone_e164
  from public.profiles p
  inner join public.helper_verifications hv
    on hv.profile_id = p.id
   and hv.status = 'approved'
   and hv.address_lat is not null
   and hv.address_lng is not null
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
    and public.haversine_miles(v_req.lat, v_req.lng, hv.address_lat, hv.address_lng)
        <= p_radius_miles
    and (
      select count(*)::int
      from public.urgent_job_sms_notifications n
      where n.helper_id = p.id
        and n.status = 'sent'
        and n.kind in ('urgent_match', 'urgent_escalation')
        and n.created_at >= (timezone('America/Chicago', now()))::date
          at time zone 'America/Chicago'
    ) < coalesce(s.daily_text_limit, 5)
  order by distance_miles asc;
end;
$$;

revoke all on function private.match_urgent_job_helpers(uuid, double precision)
  from public, anon, authenticated;

-- Public wrapper callable only with service role (for Next.js admin client RPC).
create or replace function public.match_urgent_job_helpers(
  p_request_id uuid,
  p_radius_miles double precision default 3
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
  -- Reject browser JWT callers; service_role uses role service_role.
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

-- List urgent jobs due for 10-minute escalation (service role).
create or replace function public.list_urgent_jobs_due_for_escalation(
  p_after_minutes integer default 10
)
returns table (
  request_id uuid
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
  select r.id
  from public.help_requests r
  where r.is_urgent = true
    and r.status = 'open'
    and r.urgent_escalated_at is null
    and r.created_at <= now() - make_interval(mins => greatest(coalesce(p_after_minutes, 10), 1))
    and not exists (
      select 1
      from public.offers o
      where o.request_id = r.id
        and o.status in ('pending', 'accepted')
    );
end;
$$;

revoke all on function public.list_urgent_jobs_due_for_escalation(integer)
  from public, anon, authenticated;

-- Expose is_urgent (not helper phones/coords) on the public marketplace payload.
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
