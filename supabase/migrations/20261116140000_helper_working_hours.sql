-- Helper working hours for live Available / Unavailable status.
-- Adds profiles.work_start, work_end, timezone and exposes them on get_public_marketplace.
-- Does not migrate rate_type or availability arrays.

alter table public.profiles
  add column if not exists work_start time without time zone,
  add column if not exists work_end time without time zone,
  add column if not exists timezone text;

comment on column public.profiles.work_start is
  'Optional local start of typical working hours (HH:MM). Used with work_end for live Available status.';
comment on column public.profiles.work_end is
  'Optional local end of typical working hours (HH:MM). Must be after work_start (no overnight).';
comment on column public.profiles.timezone is
  'IANA timezone for the helper (set from browser on save; fallback from state_code in app).';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_work_hours_order'
  ) then
    alter table public.profiles
      add constraint profiles_work_hours_order
      check (
        (work_start is null and work_end is null)
        or (work_start is not null and work_end is not null and work_end > work_start)
      );
  end if;
end $$;

-- Latest get_public_marketplace body from 20261116020711_help_request_views.sql,
-- plus work_start / work_end / timezone / state_code / city for public helper cards.
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
      p.city, p.state_code,
      p.lat, p.lng, p.service_radius_miles, p.skills, p.hourly_rate, p.rate_type,
      p.available_now, p.is_helper, p.availability, p.rating, p.review_count,
      p.jobs_completed, p.created_at, p.updated_at,
      p.work_start, p.work_end, p.timezone
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
