-- Neighbor job referrals: suggest helpers you know for someone else's open job.
-- Apply manually after review. This file is not applied by the agent.
--
-- Creates public.job_referrals, extends notifications.kind with job_referral,
-- RLS for referrer / helper / job owner, and refer_helpers_to_job RPC.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
create table if not exists public.job_referrals (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.help_requests (id) on delete cascade,
  referrer_id uuid not null references public.profiles (id) on delete cascade,
  helper_id uuid not null references public.profiles (id) on delete cascade,
  note text not null default '' check (char_length(note) <= 280),
  status text not null default 'pending' check (status in ('pending', 'viewed', 'dismissed')),
  created_at timestamptz not null default now(),
  unique (job_id, helper_id)
);

create index if not exists job_referrals_job_created_idx
  on public.job_referrals (job_id, created_at desc);

create index if not exists job_referrals_helper_created_idx
  on public.job_referrals (helper_id, created_at desc);

create index if not exists job_referrals_referrer_created_idx
  on public.job_referrals (referrer_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Notifications kind: job_referral
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
      'job_referral'
    )
  );

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function private.profile_is_helper(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_profile_id
      and (
        p.is_helper = true
        or p.account_role = 'helper'
        or cardinality(p.skills) > 0
      )
  );
$$;

revoke all on function private.profile_is_helper(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.job_referrals enable row level security;
revoke all on table public.job_referrals from anon;
grant select, insert, update on table public.job_referrals to authenticated;

drop policy if exists job_referrals_select_involved on public.job_referrals;
create policy job_referrals_select_involved
  on public.job_referrals for select
  to authenticated
  using (
    referrer_id = (select auth.uid())
    or helper_id = (select auth.uid())
    or exists (
      select 1
      from public.help_requests r
      where r.id = job_id
        and r.requester_id = (select auth.uid())
    )
  );

drop policy if exists job_referrals_insert_referrer on public.job_referrals;
create policy job_referrals_insert_referrer
  on public.job_referrals for insert
  to authenticated
  with check (
    referrer_id = (select auth.uid())
    and helper_id <> (select auth.uid())
    and private.profile_is_helper(helper_id)
    and exists (
      select 1
      from public.help_requests r
      where r.id = job_id
        and r.status = 'open'
        and r.requester_id <> (select auth.uid())
    )
  );

-- Helper may mark viewed; job owner may dismiss. Referrer cannot update.
drop policy if exists job_referrals_update_helper_or_owner on public.job_referrals;
create policy job_referrals_update_helper_or_owner
  on public.job_referrals for update
  to authenticated
  using (
    helper_id = (select auth.uid())
    or exists (
      select 1
      from public.help_requests r
      where r.id = job_id
        and r.requester_id = (select auth.uid())
    )
  )
  with check (
    (
      helper_id = (select auth.uid())
      and status in ('pending', 'viewed')
    )
    or (
      exists (
        select 1
        from public.help_requests r
        where r.id = job_id
          and r.requester_id = (select auth.uid())
      )
      and status in ('pending', 'viewed', 'dismissed')
    )
  );

-- ---------------------------------------------------------------------------
-- RPC: refer one or more helpers (creates rows + helper notifications)
-- ---------------------------------------------------------------------------
create or replace function public.refer_helpers_to_job(
  p_job_id uuid,
  p_helper_ids uuid[],
  p_note text default ''
)
returns setof public.job_referrals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_request public.help_requests;
  v_note text := left(coalesce(trim(p_note), ''), 280);
  v_referrer_name text;
  v_helper_id uuid;
  v_row public.job_referrals;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_job_id is null then
    raise exception 'Job is required';
  end if;

  if p_helper_ids is null or cardinality(p_helper_ids) = 0 then
    raise exception 'Pick at least one helper';
  end if;

  if cardinality(p_helper_ids) > 20 then
    raise exception 'Too many helpers in one send';
  end if;

  select * into v_request from public.help_requests where id = p_job_id;
  if not found then
    raise exception 'Job not found';
  end if;

  if v_request.status <> 'open' then
    raise exception 'Job is no longer open';
  end if;

  if v_request.requester_id = v_uid then
    raise exception 'You cannot refer helpers on your own job';
  end if;

  select name into v_referrer_name from public.profiles where id = v_uid;

  foreach v_helper_id in array p_helper_ids
  loop
    if v_helper_id is null or v_helper_id = v_uid then
      continue;
    end if;

    if v_helper_id = v_request.requester_id then
      continue;
    end if;

    if not private.profile_is_helper(v_helper_id) then
      continue;
    end if;

    if exists (
      select 1 from public.job_referrals jr
      where jr.job_id = p_job_id and jr.helper_id = v_helper_id
    ) then
      continue;
    end if;

    insert into public.job_referrals (job_id, referrer_id, helper_id, note, status)
    values (p_job_id, v_uid, v_helper_id, v_note, 'pending')
    returning * into v_row;

    insert into public.notifications (user_id, kind, title, body, href, request_id)
    values (
      v_helper_id,
      'job_referral',
      format(
        '%s suggested you for %s',
        coalesce(nullif(trim(v_referrer_name), ''), 'A neighbor'),
        v_request.title
      ),
      case
        when v_note <> '' then v_note
        else coalesce(nullif(trim(v_request.details), ''), v_request.title)
      end,
      format('/requests/%s', v_request.id),
      v_request.id
    );

    return next v_row;
  end loop;

  return;
end;
$$;

revoke all on function public.refer_helpers_to_job(uuid, uuid[], text) from public, anon;
grant execute on function public.refer_helpers_to_job(uuid, uuid[], text) to authenticated;

create or replace function public.dismiss_job_referral(p_referral_id uuid)
returns public.job_referrals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.job_referrals;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  update public.job_referrals jr
  set status = 'dismissed'
  from public.help_requests r
  where jr.id = p_referral_id
    and r.id = jr.job_id
    and r.requester_id = v_uid
  returning jr.* into v_row;

  if not found then
    raise exception 'Referral not found or not allowed';
  end if;

  return v_row;
end;
$$;

revoke all on function public.dismiss_job_referral(uuid) from public, anon;
grant execute on function public.dismiss_job_referral(uuid) to authenticated;

create or replace function public.mark_job_referral_viewed(p_referral_id uuid)
returns public.job_referrals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.job_referrals;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  update public.job_referrals
  set status = case when status = 'dismissed' then status else 'viewed' end
  where id = p_referral_id
    and helper_id = v_uid
  returning * into v_row;

  if not found then
    raise exception 'Referral not found or not allowed';
  end if;

  return v_row;
end;
$$;

revoke all on function public.mark_job_referral_viewed(uuid) from public, anon;
grant execute on function public.mark_job_referral_viewed(uuid) to authenticated;
