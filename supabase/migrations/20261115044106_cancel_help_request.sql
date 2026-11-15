-- Requester cancel for help_requests: set status to cancelled, decline pending
-- offers, and notify those helpers. SECURITY DEFINER because offer RLS only
-- lets helpers update their own rows, and notifications have no INSERT policy
-- for authenticated clients.

-- ---------------------------------------------------------------------------
-- Notifications kind: job_cancelled
-- ---------------------------------------------------------------------------
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (
    kind in (
      'match_request',
      'invite',
      'new_offer',
      'offer_accepted',
      'new_message',
      'job_completed',
      'new_review',
      'verification_submitted',
      'verification_approved',
      'verification_needs_resubmission',
      'job_referral',
      'job_cancelled'
    )
  );

-- ---------------------------------------------------------------------------
-- RPC: cancel a help request (requester only; open or accepted)
-- ---------------------------------------------------------------------------
create or replace function public.cancel_help_request(p_request_id uuid)
returns public.help_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_request public.help_requests;
  v_helper_id uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_request_id is null then
    raise exception 'Request is required';
  end if;

  select * into v_request
  from public.help_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Request not found';
  end if;

  if v_request.requester_id is distinct from v_uid then
    raise exception 'Only the requester can cancel this job';
  end if;

  if v_request.status not in ('open', 'accepted') then
    raise exception 'Only open or accepted jobs can be cancelled';
  end if;

  -- Decline every pending offer on this job (requester cannot update others'
  -- offers under RLS). Keep accepted / withdrawn / already-declined as-is.
  for v_helper_id in
    update public.offers
    set status = 'declined'
    where request_id = v_request.id
      and status = 'pending'
    returning helper_id
  loop
    insert into public.notifications (user_id, kind, title, body, href, request_id)
    values (
      v_helper_id,
      'job_cancelled',
      'Job cancelled',
      format(
        'The neighbor cancelled "%s". Your pending offer is no longer active.',
        v_request.title
      ),
      format('/requests/%s', v_request.id),
      v_request.id
    );
  end loop;

  -- If the job was already accepted, tell the booked helper.
  if v_request.status = 'accepted'
     and v_request.helper_id is not null then
    insert into public.notifications (user_id, kind, title, body, href, request_id)
    values (
      v_request.helper_id,
      'job_cancelled',
      'Job cancelled',
      format(
        'The neighbor cancelled "%s". The booking is no longer active.',
        v_request.title
      ),
      format('/requests/%s', v_request.id),
      v_request.id
    );
  end if;

  update public.help_requests
  set status = 'cancelled'
  where id = v_request.id
  returning * into v_request;

  return v_request;
end;
$$;

revoke all on function public.cancel_help_request(uuid) from public, anon;
grant execute on function public.cancel_help_request(uuid) to authenticated;

-- RLS policies call these helpers; signed-in users must be able to execute them
-- (same class of bug as private.helper_is_offer_verified).
grant execute on function private.request_visible_to(uuid, public.help_requests) to authenticated;
grant execute on function private.is_thread_participant(public.message_threads, uuid) to authenticated;
