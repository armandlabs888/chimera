-- Fix helper-verification privileges: staff check, submit, and review
-- must run as definer. The first migration made these SECURITY INVOKER, so
-- signed-in users could not call private.is_beam_staff (Staff only on the
-- admin page), and submit/review could not insert notifications (no client
-- INSERT policy on notifications).

create or replace function public.is_beam_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_beam_staff((select auth.uid()));
$$;

revoke all on function public.is_beam_staff() from public, anon;
grant execute on function public.is_beam_staff() to authenticated;

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
security definer
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
security definer
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
