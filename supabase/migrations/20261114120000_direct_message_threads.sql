-- Direct (jobless) message threads between two signed-in neighbors.
-- Apply manually after review. This file is not applied by the agent.
--
-- What this migration does:
-- 1. Makes message_threads.request_id and messages.request_id nullable for DMs.
-- 2. KEEPS the existing unique constraint
--    message_threads_request_id_participant_a_participant_b_key.
--    NULL request_ids do not collide under that constraint (Postgres UNIQUE),
--    so accept_offer() / invite_helper() / ensure_thread() that use
--    `on conflict (request_id, participant_a, participant_b)` without a WHERE
--    predicate keep working unchanged. ensure_thread is NOT redefined.
-- 3. Adds a partial unique index on (participant_a, participant_b)
--    WHERE request_id IS NULL so there is at most one DM per participant pair.
-- 4. Adds public.ensure_direct_thread(p_other_user_id) (authenticated, security
--    definer). Creates or reopens the DM for (auth.uid(), other) with participants
--    ordered least/greatest. Conflict target:
--    `on conflict (participant_a, participant_b) where request_id is null`.
-- 5. Recreates policy messages_insert_own_as_participant with the same checks,
--    but compares request ids with `is not distinct from` so NULL = NULL DMs
--    are allowed. Existing participant RLS still limits read/write to the two
--    participants only.

alter table public.message_threads
  alter column request_id drop not null;

alter table public.messages
  alter column request_id drop not null;

-- One direct thread per pair. Do NOT drop or replace the job-thread unique
-- constraint (message_threads_request_id_participant_a_participant_b_key).
create unique index if not exists message_threads_direct_participants_uidx
  on public.message_threads (participant_a, participant_b)
  where request_id is null;

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

-- NULL request_id must match for DM inserts (Postgres NULL = NULL is unknown).
drop policy if exists messages_insert_own_as_participant on public.messages;

create policy messages_insert_own_as_participant
  on public.messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.message_threads t
      where t.id = thread_id
        and private.is_thread_participant(t, auth.uid())
        and t.request_id is not distinct from messages.request_id
    )
  );
