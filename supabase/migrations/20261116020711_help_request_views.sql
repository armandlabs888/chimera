-- Public job view counts: one row per viewer per help_request.
-- Do NOT apply from the agent; ship via repo migrations for human review.

-- Denormalized counter on help_requests (existing rows start at 0; no backfill).
alter table public.help_requests
  add column if not exists view_count integer not null default 0;

alter table public.help_requests
  drop constraint if exists help_requests_view_count_nonnegative;
alter table public.help_requests
  add constraint help_requests_view_count_nonnegative check (view_count >= 0);

-- Unique viewer keys per job. No direct client access (RLS on, revoke all).
create table if not exists public.help_request_views (
  help_request_id uuid not null references public.help_requests (id) on delete cascade,
  viewer_key text not null,
  viewed_at timestamptz not null default now(),
  primary key (help_request_id, viewer_key),
  constraint help_request_views_viewer_key_len check (
    char_length(viewer_key) >= 8 and char_length(viewer_key) <= 64
  )
);

create index if not exists help_request_views_request_idx
  on public.help_request_views (help_request_id);

alter table public.help_request_views enable row level security;
revoke all on table public.help_request_views from public;
revoke all on table public.help_request_views from anon;
revoke all on table public.help_request_views from authenticated;

-- Record a view: insert-once, skip owner, validate key length.
-- Signed-in callers always use auth.uid() as the viewer key (ignore client spoof).
create or replace function public.record_help_request_view(
  p_request_id uuid,
  p_viewer_key text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_uid uuid := auth.uid();
  v_key text;
  v_inserted uuid;
begin
  if p_request_id is null then
    return false;
  end if;

  select r.requester_id into v_owner
  from public.help_requests r
  where r.id = p_request_id;

  if not found then
    return false;
  end if;

  -- Owners never inflate their own count.
  if v_uid is not null and v_uid = v_owner then
    return false;
  end if;

  if v_uid is not null then
    v_key := v_uid::text;
  else
    v_key := trim(coalesce(p_viewer_key, ''));
  end if;

  if char_length(v_key) < 8 or char_length(v_key) > 64 then
    return false;
  end if;

  insert into public.help_request_views (help_request_id, viewer_key)
  values (p_request_id, v_key)
  on conflict do nothing
  returning help_request_id into v_inserted;

  if v_inserted is null then
    return false;
  end if;

  update public.help_requests
  set view_count = view_count + 1
  where id = p_request_id;

  return true;
end;
$$;

revoke all on function public.record_help_request_view(uuid, text) from public;
grant execute on function public.record_help_request_view(uuid, text) to anon, authenticated;

-- Expose view_count on the public marketplace payload (signed-out browse).
-- Copied from 20261115140000_help_request_accepts_offers.sql; only add view_count.
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
      r.city, r.state_code, r.zip,
      r.lat, r.lng, r.radius_miles, r.when_option, r.when_label, r.scheduled_for, r.scheduled_end,
      r.budget, r.budget_type, r.accepts_offers, r.status, r.requester_id, r.image, r.images,
      r.created_at, r.updated_at,
      r.is_urgent, r.urgent_helpers_notified_count,
      r.view_count,
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
