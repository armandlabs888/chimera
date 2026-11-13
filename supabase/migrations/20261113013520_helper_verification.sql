-- Helper address verification: helpers cannot offer until Beam manually approves
-- email + home address + electricity/water bill. Live project: chimera (lfyqdrjqfpczsfkqjxpq).
-- Private documents only (no public bucket / no anon read).

-- ---------------------------------------------------------------------------
-- Staff allowlist (write only via service role / SQL; never client-writable)
-- ---------------------------------------------------------------------------
create table if not exists public.beam_staff (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.beam_staff enable row level security;
revoke all on table public.beam_staff from anon, authenticated;
grant select on table public.beam_staff to authenticated;

drop policy if exists beam_staff_select_self_or_staff on public.beam_staff;
create policy beam_staff_select_self_or_staff
  on public.beam_staff for select
  to authenticated
  using (
    profile_id = (select auth.uid())
    or exists (
      select 1 from public.beam_staff s
      where s.profile_id = (select auth.uid())
    )
  );

create or replace function private.is_beam_staff(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.beam_staff s where s.profile_id = uid
  );
$$;

revoke all on function private.is_beam_staff(uuid) from public, anon, authenticated;

create or replace function public.is_beam_staff()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.is_beam_staff((select auth.uid()));
$$;

revoke all on function public.is_beam_staff() from public, anon;
grant execute on function public.is_beam_staff() to authenticated;

-- ---------------------------------------------------------------------------
-- Verification records (exact address + document path; never public)
-- ---------------------------------------------------------------------------
create table if not exists public.helper_verifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'needs_resubmission')),
  email text not null check (char_length(trim(email)) between 3 and 254),
  street text not null check (char_length(trim(street)) between 1 and 120),
  apt text check (apt is null or char_length(trim(apt)) between 1 and 40),
  city text not null check (char_length(trim(city)) between 1 and 80),
  state_code text not null check (state_code ~ '^[A-Z]{2}$'),
  zip text not null check (zip ~ '^[0-9]{5}(-[0-9]{4})?$'),
  document_path text not null check (char_length(trim(document_path)) between 1 and 500),
  document_name text not null check (char_length(trim(document_name)) between 1 and 200),
  document_mime text check (
    document_mime is null
    or document_mime in (
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif'
    )
  ),
  document_bytes integer check (document_bytes is null or (document_bytes > 0 and document_bytes <= 10485760)),
  review_reason text check (
    review_reason is null or char_length(trim(review_reason)) between 1 and 1000
  ),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id)
);

create index if not exists helper_verifications_status_idx
  on public.helper_verifications (status, submitted_at desc);

alter table public.helper_verifications enable row level security;
revoke all on table public.helper_verifications from anon;
grant select, insert, update on table public.helper_verifications to authenticated;

drop policy if exists helper_verifications_select_own_or_staff on public.helper_verifications;
create policy helper_verifications_select_own_or_staff
  on public.helper_verifications for select
  to authenticated
  using (
    profile_id = (select auth.uid())
    or private.is_beam_staff((select auth.uid()))
  );

-- Helpers insert/update their own row only while not already approved; status forced via RPC.
drop policy if exists helper_verifications_insert_own on public.helper_verifications;
create policy helper_verifications_insert_own
  on public.helper_verifications for insert
  to authenticated
  with check (
    profile_id = (select auth.uid())
    and status = 'pending'
  );

drop policy if exists helper_verifications_update_own_pending on public.helper_verifications;
create policy helper_verifications_update_own_pending
  on public.helper_verifications for update
  to authenticated
  using (
    profile_id = (select auth.uid())
    and status in ('pending', 'needs_resubmission')
  )
  with check (
    profile_id = (select auth.uid())
    and status = 'pending'
  );

-- Staff may update any row (approve / request resubmission) via RPC preferred; direct update allowed for staff.
drop policy if exists helper_verifications_update_staff on public.helper_verifications;
create policy helper_verifications_update_staff
  on public.helper_verifications for update
  to authenticated
  using (private.is_beam_staff((select auth.uid())))
  with check (private.is_beam_staff((select auth.uid())));

create or replace function private.helper_is_offer_verified(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.helper_verifications v
    where v.profile_id = uid
      and v.status = 'approved'
  );
$$;

revoke all on function private.helper_is_offer_verified(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Gate offers: insert + revive-to-pending require approved verification
-- ---------------------------------------------------------------------------
drop policy if exists offers_insert_helper on public.offers;
create policy offers_insert_helper
  on public.offers for insert
  to authenticated
  with check (
    helper_id = (select auth.uid())
    and status = 'pending'
    and private.helper_is_offer_verified((select auth.uid()))
    and exists (
      select 1 from public.help_requests r
      where r.id = request_id
        and r.status = 'open'
        and r.requester_id <> (select auth.uid())
    )
  );

drop policy if exists offers_update_helper_withdraw on public.offers;
create policy offers_update_helper_withdraw
  on public.offers for update
  to authenticated
  using (helper_id = (select auth.uid()))
  with check (
    helper_id = (select auth.uid())
    and status in ('pending', 'withdrawn')
    and (
      status = 'withdrawn'
      or private.helper_is_offer_verified((select auth.uid()))
    )
  );

-- ---------------------------------------------------------------------------
-- Notifications: verification lifecycle kinds
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
      'verification_needs_resubmission'
    )
  );

-- ---------------------------------------------------------------------------
-- Submit / review RPCs
-- ---------------------------------------------------------------------------
create or replace function public.submit_helper_verification(
  p_email text,
  p_street text,
  p_apt text,
  p_city text,
  p_state_code text,
  p_zip text,
  p_document_path text,
  p_document_name text,
  p_document_mime text default null,
  p_document_bytes integer default null
)
returns public.helper_verifications
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_row public.helper_verifications;
  v_email text := lower(trim(coalesce(p_email, '')));
  v_street text := trim(coalesce(p_street, ''));
  v_apt text := nullif(trim(coalesce(p_apt, '')), '');
  v_city text := trim(coalesce(p_city, ''));
  v_state text := upper(trim(coalesce(p_state_code, '')));
  v_zip text := trim(coalesce(p_zip, ''));
  v_path text := trim(coalesce(p_document_path, ''));
  v_name text := trim(coalesce(p_document_name, ''));
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  if v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Enter a full email address' using errcode = '22023';
  end if;
  if char_length(v_street) < 1 then
    raise exception 'Enter your home street address' using errcode = '22023';
  end if;
  if char_length(v_city) < 1 then
    raise exception 'Enter your city' using errcode = '22023';
  end if;
  if v_state !~ '^[A-Z]{2}$' then
    raise exception 'Enter a valid US state code' using errcode = '22023';
  end if;
  if v_zip !~ '^[0-9]{5}(-[0-9]{4})?$' then
    raise exception 'Enter a valid ZIP code' using errcode = '22023';
  end if;
  if v_path is null or char_length(v_path) < 1 then
    raise exception 'Upload an electricity or water bill' using errcode = '22023';
  end if;
  -- Path must live under the caller's folder in the private bucket.
  if split_part(v_path, '/', 1) is distinct from v_uid::text then
    raise exception 'Invalid document path' using errcode = '42501';
  end if;
  if char_length(v_name) < 1 then
    raise exception 'Upload an electricity or water bill' using errcode = '22023';
  end if;

  insert into public.helper_verifications as hv (
    profile_id,
    status,
    email,
    street,
    apt,
    city,
    state_code,
    zip,
    document_path,
    document_name,
    document_mime,
    document_bytes,
    review_reason,
    reviewed_by,
    reviewed_at,
    submitted_at,
    updated_at
  )
  values (
    v_uid,
    'pending',
    v_email,
    v_street,
    v_apt,
    v_city,
    v_state,
    v_zip,
    v_path,
    v_name,
    nullif(trim(coalesce(p_document_mime, '')), ''),
    p_document_bytes,
    null,
    null,
    null,
    now(),
    now()
  )
  on conflict (profile_id) do update
  set
    status = 'pending',
    email = excluded.email,
    street = excluded.street,
    apt = excluded.apt,
    city = excluded.city,
    state_code = excluded.state_code,
    zip = excluded.zip,
    document_path = excluded.document_path,
    document_name = excluded.document_name,
    document_mime = excluded.document_mime,
    document_bytes = excluded.document_bytes,
    review_reason = null,
    reviewed_by = null,
    reviewed_at = null,
    submitted_at = now(),
    updated_at = now()
  where hv.status in ('pending', 'needs_resubmission')
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Your verification is already approved' using errcode = '22023';
  end if;

  insert into public.notifications (user_id, kind, title, body, href)
  values (
    v_uid,
    'verification_submitted',
    'Verification submitted',
    'Beam is reviewing your documents. You can browse jobs and ask questions while you wait.',
    '/verify'
  );

  return v_row;
end;
$$;

revoke all on function public.submit_helper_verification(
  text, text, text, text, text, text, text, text, text, integer
) from public, anon;
grant execute on function public.submit_helper_verification(
  text, text, text, text, text, text, text, text, text, integer
) to authenticated;

create or replace function public.review_helper_verification(
  p_profile_id uuid,
  p_approve boolean,
  p_reason text default null
)
returns public.helper_verifications
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_row public.helper_verifications;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  if not private.is_beam_staff(v_uid) then
    raise exception 'Staff only' using errcode = '42501';
  end if;
  if p_profile_id is null then
    raise exception 'Missing helper' using errcode = '22023';
  end if;
  if not coalesce(p_approve, false) and v_reason is null then
    raise exception 'Tell the Helper why a new submission is needed' using errcode = '22023';
  end if;

  update public.helper_verifications
  set
    status = case when p_approve then 'approved' else 'needs_resubmission' end,
    review_reason = case when p_approve then null else v_reason end,
    reviewed_by = v_uid,
    reviewed_at = now(),
    updated_at = now()
  where profile_id = p_profile_id
    and status = 'pending'
  returning * into v_row;

  if v_row.id is null then
    raise exception 'No pending verification for this Helper' using errcode = '22023';
  end if;

  if p_approve then
    insert into public.notifications (user_id, kind, title, body, href)
    values (
      p_profile_id,
      'verification_approved',
      'You are verified',
      'Beam approved your documents. You can make offers on local jobs now.',
      '/browse'
    );
  else
    insert into public.notifications (user_id, kind, title, body, href)
    values (
      p_profile_id,
      'verification_needs_resubmission',
      'Beam needs a new submission',
      v_reason,
      '/verify'
    );
  end if;

  return v_row;
end;
$$;

revoke all on function public.review_helper_verification(uuid, boolean, text) from public, anon;
grant execute on function public.review_helper_verification(uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Private storage bucket for utility bills (PDF / clear photos)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'helper-verification',
  'helper-verification',
  false,
  10485760,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists helper_verification_select_own_or_staff on storage.objects;
create policy helper_verification_select_own_or_staff
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'helper-verification'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or private.is_beam_staff((select auth.uid()))
    )
  );

drop policy if exists helper_verification_insert_own on storage.objects;
create policy helper_verification_insert_own
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'helper-verification'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists helper_verification_update_own on storage.objects;
create policy helper_verification_update_own
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'helper-verification'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'helper-verification'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists helper_verification_delete_own on storage.objects;
create policy helper_verification_delete_own
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'helper-verification'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
