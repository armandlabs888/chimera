-- Beam marketplace core schema + RLS
-- Live project: chimera (lfyqdrjqfpczsfkqjxpq)
-- Auth: email/password; ownership enforced via auth.uid() and SECURITY DEFINER helpers.

create extension if not exists pgcrypto;

create schema if not exists private;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  avatar_url text not null default '',
  bio text not null default '',
  neighborhood text not null default 'east-austin',
  skills text[] not null default '{}',
  hourly_rate numeric(10, 2) not null default 0 check (hourly_rate >= 0),
  availability text[] not null default '{}',
  rating numeric(3, 2) not null default 0 check (rating >= 0 and rating <= 5),
  review_count integer not null default 0 check (review_count >= 0),
  jobs_completed integer not null default 0 check (jobs_completed >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.help_requests (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 160),
  details text not null check (char_length(trim(details)) between 1 and 4000),
  category text not null,
  neighborhood text not null,
  when_option text not null,
  when_label text not null,
  budget numeric(10, 2) not null check (budget >= 0),
  status text not null default 'open'
    check (status in ('open', 'accepted', 'completed', 'cancelled')),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  image text not null default '',
  accepted_offer_id uuid,
  helper_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.help_requests (id) on delete cascade,
  helper_id uuid not null references public.profiles (id) on delete cascade,
  price numeric(10, 2) not null check (price >= 0),
  note text not null default '',
  eta text not null default 'Flexible',
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'withdrawn')),
  created_at timestamptz not null default now(),
  unique (request_id, helper_id)
);

alter table public.help_requests
  add constraint help_requests_accepted_offer_fkey
  foreign key (accepted_offer_id) references public.offers (id) on delete set null;

create table public.message_threads (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.help_requests (id) on delete cascade,
  participant_a uuid not null references public.profiles (id) on delete cascade,
  participant_b uuid not null references public.profiles (id) on delete cascade,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (participant_a <> participant_b),
  unique (request_id, participant_a, participant_b)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.message_threads (id) on delete cascade,
  request_id uuid not null references public.help_requests (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.help_requests (id) on delete cascade,
  from_id uuid not null references public.profiles (id) on delete cascade,
  to_id uuid not null references public.profiles (id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now(),
  check (from_id <> to_id),
  unique (request_id, from_id)
);

create index help_requests_status_idx on public.help_requests (status, created_at desc);
create index help_requests_requester_idx on public.help_requests (requester_id);
create index offers_request_idx on public.offers (request_id);
create index offers_helper_idx on public.offers (helper_id);
create index messages_thread_idx on public.messages (thread_id, created_at);
create index message_threads_participants_idx on public.message_threads (participant_a, participant_b);

-- ---------------------------------------------------------------------------
-- Helpers (private schema; not exposed via Data API)
-- ---------------------------------------------------------------------------

create or replace function private.is_thread_participant(thread public.message_threads, uid uuid)
returns boolean
language sql
stable
as $$
  select uid is not null
    and (thread.participant_a = uid or thread.participant_b = uid);
$$;

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
  );
$$;

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function private.touch_updated_at();

create trigger help_requests_touch_updated_at
before update on public.help_requests
for each row execute function private.touch_updated_at();

-- Auto-create a blank profile for every new auth user.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, avatar_url)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1), 'Neighbor'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

-- Accept an offer: requester-only, atomic status updates + thread bootstrap.
create or replace function public.accept_offer(p_offer_id uuid)
returns public.offers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_offer public.offers;
  v_request public.help_requests;
  v_thread public.message_threads;
  v_a uuid;
  v_b uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_offer from public.offers where id = p_offer_id for update;
  if not found then
    raise exception 'Offer not found';
  end if;

  select * into v_request from public.help_requests where id = v_offer.request_id for update;
  if not found then
    raise exception 'Request not found';
  end if;

  if v_request.requester_id <> v_uid then
    raise exception 'Only the requester can accept offers';
  end if;

  if v_request.status <> 'open' or v_offer.status <> 'pending' then
    raise exception 'Offer is not acceptible';
  end if;

  update public.offers
  set status = 'accepted'
  where id = v_offer.id
  returning * into v_offer;

  update public.offers
  set status = 'declined'
  where request_id = v_request.id
    and id <> v_offer.id
    and status = 'pending';

  update public.help_requests
  set status = 'accepted',
      accepted_offer_id = v_offer.id,
      helper_id = v_offer.helper_id
  where id = v_request.id;

  v_a := least(v_request.requester_id, v_offer.helper_id);
  v_b := greatest(v_request.requester_id, v_offer.helper_id);

  insert into public.message_threads (request_id, participant_a, participant_b, last_message_at)
  values (v_request.id, v_a, v_b, now())
  on conflict (request_id, participant_a, participant_b) do update
    set last_message_at = excluded.last_message_at
  returning * into v_thread;

  insert into public.messages (thread_id, request_id, sender_id, body)
  values (
    v_thread.id,
    v_request.id,
    v_uid,
    format('Offer accepted at $%s. Let’s coordinate timing here.', v_offer.price)
  );

  return v_offer;
end;
$$;

revoke all on function public.accept_offer(uuid) from public, anon;
grant execute on function public.accept_offer(uuid) to authenticated;

-- Mark complete: requester or accepted helper only.
create or replace function public.complete_request(p_request_id uuid)
returns public.help_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_request public.help_requests;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_request from public.help_requests where id = p_request_id for update;
  if not found then
    raise exception 'Request not found';
  end if;

  if v_request.status <> 'accepted' then
    raise exception 'Only accepted requests can be completed';
  end if;

  if v_uid <> v_request.requester_id and v_uid <> v_request.helper_id then
    raise exception 'Only participants can complete a request';
  end if;

  update public.help_requests
  set status = 'completed'
  where id = v_request.id
  returning * into v_request;

  return v_request;
end;
$$;

revoke all on function public.complete_request(uuid) from public, anon;
grant execute on function public.complete_request(uuid) to authenticated;

-- Ensure thread between current user and counterpart for a request.
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

  if not (
    v_uid = v_request.requester_id
    or v_uid = v_request.helper_id
    or exists (
      select 1 from public.offers o
      where o.request_id = v_request.id and o.helper_id = v_uid
    )
  ) then
    raise exception 'Not allowed to open a thread on this request';
  end if;

  if not (
    p_other_user_id = v_request.requester_id
    or p_other_user_id = v_request.helper_id
    or exists (
      select 1 from public.offers o
      where o.request_id = v_request.id and o.helper_id = p_other_user_id
    )
  ) then
    raise exception 'Counterpart is not a participant';
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

-- Submit review + update aggregate rating atomically.
create or replace function public.submit_review(
  p_request_id uuid,
  p_to_id uuid,
  p_rating integer,
  p_comment text
)
returns public.reviews
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_request public.help_requests;
  v_review public.reviews;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_rating < 1 or p_rating > 5 then
    raise exception 'Rating must be 1-5';
  end if;

  select * into v_request from public.help_requests where id = p_request_id for update;
  if not found then
    raise exception 'Request not found';
  end if;

  if v_request.status <> 'completed' then
    raise exception 'Reviews require a completed request';
  end if;

  if v_uid <> v_request.requester_id and v_uid <> v_request.helper_id then
    raise exception 'Only participants can review';
  end if;

  if p_to_id is null or p_to_id = v_uid then
    raise exception 'Invalid review target';
  end if;

  if p_to_id <> v_request.requester_id and p_to_id <> v_request.helper_id then
    raise exception 'Review target must be the other participant';
  end if;

  insert into public.reviews (request_id, from_id, to_id, rating, comment)
  values (p_request_id, v_uid, p_to_id, p_rating, coalesce(p_comment, ''))
  returning * into v_review;

  update public.profiles
  set
    review_count = review_count + 1,
    rating = round(((rating * review_count) + p_rating) / (review_count + 1)::numeric, 1),
    jobs_completed = case
      when id = v_request.helper_id then jobs_completed + 1
      else jobs_completed
    end
  where id = p_to_id;

  return v_review;
end;
$$;

revoke all on function public.submit_review(uuid, uuid, integer, text) from public, anon;
grant execute on function public.submit_review(uuid, uuid, integer, text) to authenticated;

create or replace function private.bump_thread_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.message_threads
  set last_message_at = new.created_at
  where id = new.thread_id;
  return new;
end;
$$;

create trigger messages_bump_thread
after insert on public.messages
for each row execute function private.bump_thread_on_message();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.help_requests enable row level security;
alter table public.offers enable row level security;
alter table public.message_threads enable row level security;
alter table public.messages enable row level security;
alter table public.reviews enable row level security;

-- Profiles: marketplace-readable to signed-in users; write own row only.
create policy profiles_select_authenticated
  on public.profiles for select
  to authenticated
  using (true);

create policy profiles_insert_own
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy profiles_update_own
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Requests
create policy requests_select_authenticated
  on public.help_requests for select
  to authenticated
  using (private.request_visible_to(auth.uid(), help_requests));

create policy requests_insert_own
  on public.help_requests for insert
  to authenticated
  with check (requester_id = auth.uid() and status = 'open');

create policy requests_update_limited
  on public.help_requests for update
  to authenticated
  using (
    requester_id = auth.uid()
    or helper_id = auth.uid()
  )
  with check (
    requester_id = auth.uid()
    or helper_id = auth.uid()
  );

-- Prefer RPCs for accept/complete; still allow requester cancel while open.
create policy requests_delete_none
  on public.help_requests for delete
  to authenticated
  using (false);

-- Offers
create policy offers_select_participants
  on public.offers for select
  to authenticated
  using (
    helper_id = auth.uid()
    or exists (
      select 1 from public.help_requests r
      where r.id = offers.request_id
        and (r.requester_id = auth.uid() or r.helper_id = auth.uid())
    )
  );

create policy offers_insert_helper
  on public.offers for insert
  to authenticated
  with check (
    helper_id = auth.uid()
    and status = 'pending'
    and exists (
      select 1 from public.help_requests r
      where r.id = request_id
        and r.status = 'open'
        and r.requester_id <> auth.uid()
    )
  );

create policy offers_update_helper_withdraw
  on public.offers for update
  to authenticated
  using (helper_id = auth.uid())
  with check (
    helper_id = auth.uid()
    and status in ('pending', 'withdrawn')
  );

-- Threads / messages
create policy threads_select_participants
  on public.message_threads for select
  to authenticated
  using (private.is_thread_participant(message_threads, auth.uid()));

create policy threads_insert_via_rpc_only
  on public.message_threads for insert
  to authenticated
  with check (false);

create policy messages_select_participants
  on public.messages for select
  to authenticated
  using (
    exists (
      select 1 from public.message_threads t
      where t.id = messages.thread_id
        and private.is_thread_participant(t, auth.uid())
    )
  );

create policy messages_insert_own_as_participant
  on public.messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.message_threads t
      where t.id = thread_id
        and private.is_thread_participant(t, auth.uid())
        and t.request_id = messages.request_id
    )
  );

-- Reviews readable to authenticated; writes only via RPC.
create policy reviews_select_authenticated
  on public.reviews for select
  to authenticated
  using (true);

create policy reviews_insert_none_direct
  on public.reviews for insert
  to authenticated
  with check (false);

-- Keep anon locked out of marketplace tables.
revoke all on table public.profiles from anon;
revoke all on table public.help_requests from anon;
revoke all on table public.offers from anon;
revoke all on table public.message_threads from anon;
revoke all on table public.messages from anon;
revoke all on table public.reviews from anon;

grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update on table public.help_requests to authenticated;
grant select, insert, update on table public.offers to authenticated;
grant select on table public.message_threads to authenticated;
grant select, insert on table public.messages to authenticated;
grant select on table public.reviews to authenticated;
