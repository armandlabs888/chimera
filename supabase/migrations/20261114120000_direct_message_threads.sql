-- Direct (jobless) message threads between two signed-in neighbors.
-- Does NOT change job-tied ensure_thread behavior beyond supporting nullable request_id.
--
-- What this migration does:
-- 1. Allows message_threads.request_id and messages.request_id to be NULL for DMs.
-- 2. Replaces the old unique(request_id, participant_a, participant_b) with:
--    - unique (request_id, participant_a, participant_b) WHERE request_id IS NOT NULL
--    - unique (participant_a, participant_b) WHERE request_id IS NULL (one DM per pair)
-- 3. Adds public.ensure_direct_thread(p_other_user_id) — authenticated only, security definer.
--    Creates or reopens the DM thread for (auth.uid(), other). Participants are ordered
--    least/greatest so the pair is stable. Only the two participants can later read/write
--    via existing threads_select_participants / messages_* RLS (participant check).
-- 4. Updates ensure_thread ON CONFLICT to the partial unique index for job threads.
--
-- Apply manually after review. This file is not applied by the agent.

alter table public.message_threads
  alter column request_id drop not null;

alter table public.messages
  alter column request_id drop not null;

alter table public.message_threads
  drop constraint if exists message_threads_request_id_participant_a_participant_b_key;

create unique index if not exists message_threads_request_participants_uidx
  on public.message_threads (request_id, participant_a, participant_b)
  where request_id is not null;

create unique index if not exists message_threads_direct_participants_uidx
  on public.message_threads (participant_a, participant_b)
  where request_id is null;

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

  if p_request_id is null then
    raise exception 'Request id required';
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
  on conflict (request_id, participant_a, participant_b) where request_id is not null
  do update
    set last_message_at = public.message_threads.last_message_at
  returning * into v_thread;

  return v_thread;
end;
$$;

revoke all on function public.ensure_thread(uuid, uuid) from public, anon;
grant execute on function public.ensure_thread(uuid, uuid) to authenticated;

create or replace function public.ensure_direct_thread(p_other_user_id uuid)
returns public.message_threads
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
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

  if not exists (select 1 from public.profiles where id = p_other_user_id) then
    raise exception 'Counterpart profile not found';
  end if;

  v_a := least(v_uid, p_other_user_id);
  v_b := greatest(v_uid, p_other_user_id);

  insert into public.message_threads (request_id, participant_a, participant_b, last_message_at)
  values (null, v_a, v_b, now())
  on conflict (participant_a, participant_b) where request_id is null
  do update
    set last_message_at = public.message_threads.last_message_at
  returning * into v_thread;

  return v_thread;
end;
$$;

revoke all on function public.ensure_direct_thread(uuid) from public, anon;
grant execute on function public.ensure_direct_thread(uuid) to authenticated;
