-- Phone verification for onboarding (all accounts) + pending urgent SMS opt-in.
-- Idempotent. Do NOT apply from the agent to live DB; ship via repo migrations only.
-- Existing onboarded users are untouched (no backfill of onboarding_completed_at).

-- ---------------------------------------------------------------------------
-- Account phone verification (one row per profile)
-- ---------------------------------------------------------------------------
create table if not exists public.phone_verifications (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  phone_e164 text
    check (
      phone_e164 is null
      or phone_e164 ~ '^\+[1-9][0-9]{7,14}$'
    ),
  verified_at timestamptz,
  pending_code_hash text,
  pending_code_expires_at timestamptz,
  pending_attempts integer not null default 0
    check (pending_attempts >= 0),
  pending_send_count integer not null default 0
    check (pending_send_count >= 0),
  pending_send_window_start timestamptz,
  pending_channel text
    check (
      pending_channel is null
      or pending_channel in ('inbound_sms', 'otp')
    ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint phone_verifications_verified_ck check (
    verified_at is null
    or (phone_e164 is not null and verified_at is not null)
  )
);

comment on table public.phone_verifications is
  'Per-account phone confirmation. Pending inbound/OTP codes are hashed server-side; webhook + OTP APIs write with service role.';

-- One verified number per Bunk account.
create unique index if not exists phone_verifications_phone_unique
  on public.phone_verifications (phone_e164)
  where verified_at is not null and phone_e164 is not null;

create index if not exists phone_verifications_pending_hash_idx
  on public.phone_verifications (pending_code_hash)
  where pending_code_hash is not null and verified_at is null;

drop trigger if exists phone_verifications_touch_updated_at
  on public.phone_verifications;
create trigger phone_verifications_touch_updated_at
before update on public.phone_verifications
for each row execute function private.touch_updated_at();

alter table public.phone_verifications enable row level security;
revoke all on table public.phone_verifications from anon;
grant select on table public.phone_verifications to authenticated;
-- Authenticated clients cannot insert/update/delete; service role only for writes.

drop policy if exists phone_verifications_select_own
  on public.phone_verifications;
create policy phone_verifications_select_own
  on public.phone_verifications for select
  to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Helper SMS: pending opt-in (unverified helpers) + optional alert parents
-- ---------------------------------------------------------------------------
alter table public.helper_urgent_sms_settings
  add column if not exists sms_opt_in_pending boolean not null default false;

alter table public.helper_urgent_sms_settings
  add column if not exists sms_alert_parents text[] not null default '{}'::text[];

comment on column public.helper_urgent_sms_settings.sms_opt_in_pending is
  'Helper chose Turn on text alerts before Get verified. Activates to sms_opt_in when home verification is approved.';
comment on column public.helper_urgent_sms_settings.sms_alert_parents is
  'Optional browse parents to hear about (home, auto, junk-removal, pets, other). Empty means all urgent jobs.';

-- ---------------------------------------------------------------------------
-- Activate pending SMS opt-in when home verification becomes approved
-- ---------------------------------------------------------------------------
create or replace function private.activate_pending_sms_on_verification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
     and new.status = 'approved'
     and coalesce(old.status, '') is distinct from 'approved' then
    update public.helper_urgent_sms_settings s
    set
      sms_opt_in = true,
      sms_opt_in_pending = false,
      updated_at = now()
    where s.profile_id = new.profile_id
      and s.sms_opt_in_pending = true
      and s.sms_opt_in = false
      and s.phone_confirmed_at is not null
      and s.phone_e164 is not null;
  end if;
  return new;
end;
$$;

revoke all on function private.activate_pending_sms_on_verification()
  from public, anon, authenticated;

drop trigger if exists helper_verifications_activate_pending_sms
  on public.helper_verifications;
create trigger helper_verifications_activate_pending_sms
after update of status on public.helper_verifications
for each row execute function private.activate_pending_sms_on_verification();

-- ---------------------------------------------------------------------------
-- Match filter: keep live ZIP/radius definition (job_zip_location_urgent_match),
-- only add optional sms_alert_parents filter when non-empty.
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
  v_parent text;
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

  v_parent := case
    when v_req.category in ('house-cleaning', 'carpet-cleaning') then 'home'
    when v_req.category = 'auto-detailing' then 'auto'
    when v_req.category = 'junk-removal' then 'junk-removal'
    when v_req.category in ('pet-sitting', 'grooming') then 'pets'
    when v_req.category = 'other' then 'other'
    else null
  end;

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
    and (
      cardinality(coalesce(s.sms_alert_parents, '{}'::text[])) = 0
      or (
        v_parent is not null
        and v_parent = any (s.sms_alert_parents)
      )
    )
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
