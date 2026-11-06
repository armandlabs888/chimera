-- Synced with live Supabase migrations:
--   20261106_beam_full_requester_provider_flows
--   20261106_beam_rls_initplan_and_fk_indexes
-- Adds universal location + radius, open-to-offers, helper rate_type & available_now,
-- private exact_address table, direct helper invites, saved helpers, notifications + triggers,
-- sanitized get_public_marketplace() RPC for signed-out guests, beam-media storage bucket,
-- and RLS (select auth.uid()) initplan + FK index optimizations.

alter table public.profiles
  alter column neighborhood set default '';

alter table public.profiles
  add column if not exists location_label text not null default '',
  add column if not exists lat double precision,
  add column if not exists lng double precision,
  add column if not exists service_radius_miles integer not null default 5
    check (service_radius_miles between 1 and 100),
  add column if not exists rate_type text not null default 'hourly'
    check (rate_type in ('hourly', 'quote')),
  add column if not exists available_now boolean not null default false,
  add column if not exists is_helper boolean not null default false,
  add column if not exists email_notifications boolean not null default true;

update public.profiles
set is_helper = true
where cardinality(skills) > 0 and is_helper = false;

alter table public.help_requests
  alter column neighborhood set default '';

alter table public.help_requests
  add column if not exists location_label text not null default '',
  add column if not exists lat double precision,
  add column if not exists lng double precision,
  add column if not exists radius_miles integer not null default 5
    check (radius_miles between 1 and 100),
  add column if not exists budget_type text not null default 'fixed'
    check (budget_type in ('fixed', 'open')),
  add column if not exists scheduled_for timestamptz,
  add column if not exists preferred_helper_id uuid references public.profiles (id) on delete set null;

create index if not exists help_requests_preferred_helper_idx
  on public.help_requests (preferred_helper_id)
  where preferred_helper_id is not null;
create index if not exists help_requests_accepted_offer_idx
  on public.help_requests (accepted_offer_id)
  where accepted_offer_id is not null;
create index if not exists help_requests_helper_idx
  on public.help_requests (helper_id)
  where helper_id is not null;
create index if not exists profiles_is_helper_idx
  on public.profiles (is_helper, available_now desc, rating desc);
create index if not exists message_threads_participant_b_idx
  on public.message_threads (participant_b);
create index if not exists messages_request_idx
  on public.messages (request_id);
create index if not exists messages_sender_idx
  on public.messages (sender_id);
create index if not exists reviews_from_idx
  on public.reviews (from_id);
create index if not exists reviews_to_idx
  on public.reviews (to_id);

create or replace function public.haversine_miles(
  lat1 double precision,
  lng1 double precision,
  lat2 double precision,
  lng2 double precision
)
returns double precision
language sql
immutable
strict
set search_path = public
as $$
  select 3958.8 * 2 * asin(
    least(
      1.0,
      sqrt(
        power(sin(radians((lat2 - lat1) / 2.0)), 2) +
        cos(radians(lat1)) * cos(radians(lat2)) *
        power(sin(radians((lng2 - lng1) / 2.0)), 2)
      )
    )
  );
$$;

create table if not exists public.request_private_details (
  request_id uuid primary key references public.help_requests (id) on delete cascade,
  exact_address text not null default '' check (char_length(exact_address) <= 500),
  updated_at timestamptz not null default now()
);

drop trigger if exists request_private_details_touch_updated_at on public.request_private_details;
create trigger request_private_details_touch_updated_at
before update on public.request_private_details
for each row execute function private.touch_updated_at();

alter table public.request_private_details enable row level security;
revoke all on table public.request_private_details from anon;
grant select, insert, update on table public.request_private_details to authenticated;

drop policy if exists request_private_details_select_participants on public.request_private_details;
create policy request_private_details_select_participants
  on public.request_private_details for select
  to authenticated
  using (
    exists (
      select 1 from public.help_requests r
      where r.id = request_private_details.request_id
        and (r.requester_id = (select auth.uid()) or r.helper_id = (select auth.uid()))
    )
  );

drop policy if exists request_private_details_insert_requester on public.request_private_details;
create policy request_private_details_insert_requester
  on public.request_private_details for insert
  to authenticated
  with check (
    exists (
      select 1 from public.help_requests r
      where r.id = request_private_details.request_id
        and r.requester_id = (select auth.uid())
    )
  );

drop policy if exists request_private_details_update_requester on public.request_private_details;
create policy request_private_details_update_requester
  on public.request_private_details for update
  to authenticated
  using (
    exists (
      select 1 from public.help_requests r
      where r.id = request_private_details.request_id
        and r.requester_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.help_requests r
      where r.id = request_private_details.request_id
        and r.requester_id = (select auth.uid())
    )
  );

create table if not exists public.request_invites (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.help_requests (id) on delete cascade,
  requester_id uuid not null references public.profiles (id) on delete cascade,
  helper_id uuid not null references public.profiles (id) on delete cascade,
  note text not null default '' check (char_length(note) <= 1000),
  status text not null default 'pending'
    check (status in ('pending', 'responded', 'declined')),
  created_at timestamptz not null default now(),
  check (requester_id <> helper_id),
  unique (request_id, helper_id)
);

create index if not exists request_invites_request_idx on public.request_invites (request_id);
create index if not exists request_invites_helper_idx on public.request_invites (helper_id);
create index if not exists request_invites_requester_idx on public.request_invites (requester_id);

alter table public.request_invites enable row level security;
revoke all on table public.request_invites from anon;
grant select, insert, update on table public.request_invites to authenticated;

drop policy if exists request_invites_select_participants on public.request_invites;
create policy request_invites_select_participants
  on public.request_invites for select
  to authenticated
  using (requester_id = (select auth.uid()) or helper_id = (select auth.uid()));

drop policy if exists request_invites_insert_requester on public.request_invites;
create policy request_invites_insert_requester
  on public.request_invites for insert
  to authenticated
  with check (
    requester_id = (select auth.uid())
    and exists (
      select 1 from public.help_requests r
      where r.id = request_invites.request_id
        and r.requester_id = (select auth.uid())
        and r.status = 'open'
    )
  );

drop policy if exists request_invites_update_participants on public.request_invites;
create policy request_invites_update_participants
  on public.request_invites for update
  to authenticated
  using (requester_id = (select auth.uid()) or helper_id = (select auth.uid()))
  with check (requester_id = (select auth.uid()) or helper_id = (select auth.uid()));

create table if not exists public.saved_helpers (
  user_id uuid not null references public.profiles (id) on delete cascade,
  helper_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, helper_id),
  check (user_id <> helper_id)
);

create index if not exists saved_helpers_helper_idx on public.saved_helpers (helper_id);

alter table public.saved_helpers enable row level security;
revoke all on table public.saved_helpers from anon;
grant select, insert, delete on table public.saved_helpers to authenticated;

drop policy if exists saved_helpers_select_own on public.saved_helpers;
create policy saved_helpers_select_own
  on public.saved_helpers for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists saved_helpers_insert_own on public.saved_helpers;
create policy saved_helpers_insert_own
  on public.saved_helpers for insert
  to authenticated
  with check (user_id = (select auth.uid()) and helper_id <> (select auth.uid()));

drop policy if exists saved_helpers_delete_own on public.saved_helpers;
create policy saved_helpers_delete_own
  on public.saved_helpers for delete
  to authenticated
  using (user_id = (select auth.uid()));

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (
    kind in (
      'match_request',
      'invite',
      'new_offer',
      'offer_accepted',
      'new_message',
      'job_completed',
      'new_review'
    )
  ),
  title text not null check (char_length(trim(title)) between 1 and 200),
  body text not null default '' check (char_length(body) <= 1000),
  href text not null default '/home',
  request_id uuid references public.help_requests (id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);
create index if not exists notifications_request_idx
  on public.notifications (request_id)
  where request_id is not null;

alter table public.notifications enable row level security;
revoke all on table public.notifications from anon;
grant select, update on table public.notifications to authenticated;

drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own
  on public.notifications for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own
  on public.notifications for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create or replace function public.mark_all_notifications_read()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_count integer := 0;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  update public.notifications
  set read_at = now()
  where user_id = v_uid and read_at is null;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.mark_all_notifications_read() from public, anon;
grant execute on function public.mark_all_notifications_read() to authenticated;

create or replace function private.request_visible_to(uid uuid, req public.help_requests)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select uid is not null and (
    req.requester_id = uid
    or req.helper_id = uid
    or req.status = 'open'
    or exists (
      select 1 from public.offers o
      where o.request_id = req.id and o.helper_id = uid
    )
    or exists (
      select 1 from public.request_invites i
      where i.request_id = req.id and i.helper_id = uid
    )
  );
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_name text;
  resolved_avatar text;
  resolved_neighborhood text;
  resolved_location_label text;
begin
  resolved_name := left(
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(split_part(coalesce(new.email, ''), '@', 1)), ''),
      'Neighbor'
    ),
    80
  );

  resolved_avatar := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'avatar_url'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'picture'), ''),
    ''
  );

  resolved_neighborhood := case
    when (new.raw_user_meta_data ->> 'neighborhood') in (
      'east-austin',
      'hyde-park',
      'mueller',
      'zilker',
      'south-congress',
      'travis-heights',
      'clarksville',
      'the-domain'
    ) then (new.raw_user_meta_data ->> 'neighborhood')
    else ''
  end;

  resolved_location_label := left(
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'location_label'), ''), ''),
    120
  );

  insert into public.profiles (id, name, avatar_url, neighborhood, location_label)
  values (
    new.id,
    resolved_name,
    resolved_avatar,
    resolved_neighborhood,
    resolved_location_label
  )
  on conflict (id) do update
  set
    avatar_url = case
      when public.profiles.avatar_url = '' and excluded.avatar_url <> '' then excluded.avatar_url
      else public.profiles.avatar_url
    end,
    location_label = case
      when public.profiles.location_label = '' and excluded.location_label <> '' then excluded.location_label
      else public.profiles.location_label
    end;

  return new;
end;
$$;

create or replace function public.ensure_thread(p_request_id uuid, p_other_user_id uuid)
returns public.message_threads
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_request public.help_requests;
  v_thread public.message_threads;
  v_a uuid;
  v_b uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_other_user_id is null or p_other_user_id = v_uid then
    raise exception 'Invalid participant';
  end if;

  select * into v_request from public.help_requests where id = p_request_id;
  if not found then
    raise exception 'Request not found';
  end if;

  if not exists (select 1 from public.profiles where id = p_other_user_id) then
    raise exception 'Counterpart profile not found';
  end if;

  if v_uid = v_request.requester_id then
    if v_request.status not in ('open', 'accepted', 'completed') then
      raise exception 'Request is closed';
    end if;
  elsif p_other_user_id = v_request.requester_id then
    if not (
      v_request.status = 'open'
      or v_uid = v_request.helper_id
      or exists (
        select 1 from public.offers o
        where o.request_id = v_request.id and o.helper_id = v_uid
      )
      or exists (
        select 1 from public.request_invites i
        where i.request_id = v_request.id and i.helper_id = v_uid
      )
    ) then
      raise exception 'Not allowed to open a thread on this request';
    end if;
  else
    raise exception 'One participant must be the requester';
  end if;

  v_a := least(v_uid, p_other_user_id);
  v_b := greatest(v_uid, p_other_user_id);

  insert into public.message_threads (request_id, participant_a, participant_b, last_message_at)
  values (p_request_id, v_a, v_b, now())
  on conflict (request_id, participant_a, participant_b) do update
    set last_message_at = public.message_threads.last_message_at
  returning * into v_thread;

  return v_thread;
end;
$$;

revoke all on function public.ensure_thread(uuid, uuid) from public, anon;
grant execute on function public.ensure_thread(uuid, uuid) to authenticated;

create or replace function public.invite_helper(
  p_request_id uuid,
  p_helper_id uuid,
  p_note text default ''
)
returns public.request_invites
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_request public.help_requests;
  v_invite public.request_invites;
  v_thread public.message_threads;
  v_requester_name text;
  v_a uuid;
  v_b uuid;
  v_msg text;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_request from public.help_requests where id = p_request_id;
  if not found then
    raise exception 'Request not found';
  end if;

  if v_request.requester_id <> v_uid then
    raise exception 'Only the requester can invite helpers';
  end if;

  if v_request.status <> 'open' then
    raise exception 'Request is no longer open';
  end if;

  if p_helper_id is null or p_helper_id = v_uid then
    raise exception 'Invalid helper';
  end if;

  insert into public.request_invites (request_id, requester_id, helper_id, note, status)
  values (p_request_id, v_uid, p_helper_id, coalesce(trim(p_note), ''), 'pending')
  on conflict (request_id, helper_id) do update
    set note = case when excluded.note <> '' then excluded.note else public.request_invites.note end
  returning * into v_invite;

  v_a := least(v_uid, p_helper_id);
  v_b := greatest(v_uid, p_helper_id);

  insert into public.message_threads (request_id, participant_a, participant_b, last_message_at)
  values (p_request_id, v_a, v_b, now())
  on conflict (request_id, participant_a, participant_b) do update
    set last_message_at = now()
  returning * into v_thread;

  v_msg := coalesce(
    nullif(trim(p_note), ''),
    format('Hi! I just posted "%s" and would love your help if you are available.', v_request.title)
  );

  insert into public.messages (thread_id, request_id, sender_id, body)
  values (v_thread.id, p_request_id, v_uid, v_msg);

  select name into v_requester_name from public.profiles where id = v_uid;

  insert into public.notifications (user_id, kind, title, body, href, request_id)
  values (
    p_helper_id,
    'invite',
    format('%s invited you to help', coalesce(v_requester_name, 'A neighbor')),
    v_request.title,
    format('/requests/%s', v_request.id),
    v_request.id
  );

  return v_invite;
end;
$$;

revoke all on function public.invite_helper(uuid, uuid, text) from public, anon;
grant execute on function public.invite_helper(uuid, uuid, text) to authenticated;

create or replace function public.get_public_marketplace()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with open_reqs as (
    select
      r.id, r.title, r.details, r.category, r.neighborhood, r.location_label,
      r.lat, r.lng, r.radius_miles, r.when_option, r.when_label, r.scheduled_for,
      r.budget, r.budget_type, r.status, r.requester_id, r.image, r.created_at, r.updated_at,
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

grant execute on function public.get_public_marketplace() to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('beam-media', 'beam-media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update
set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
