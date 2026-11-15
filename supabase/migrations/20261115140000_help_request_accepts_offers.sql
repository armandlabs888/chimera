-- Price model: keep help_requests.budget as the poster price, add accepts_offers
-- for firm vs negotiable. Existing budget_type stays for older rows/clients and
-- stays derived in app code (accepts_offers false -> fixed, true -> open).
--
-- Backfill choice: budget_type='open' -> accepts_offers=true;
-- budget_type='fixed' -> accepts_offers=true.
-- Reason: today "fixed" only sets an expected amount ("Helpers still name their
-- price"). Mapping fixed->false would suddenly make existing priced jobs firm.
-- Preserve negotiable behavior for all historical rows.

alter table public.help_requests
  add column if not exists accepts_offers boolean not null default true;

update public.help_requests
set accepts_offers = true
where budget_type = 'open' or budget_type = 'fixed';

-- Firm-price enforcement when offers are inserted/updated directly (RLS insert
-- path and any future RPC). Pending offers on firm jobs must match job.budget.
create or replace function public.enforce_firm_offer_price()
returns trigger
language plpgsql
as $$
declare
  v_accepts boolean;
  v_budget numeric(10, 2);
begin
  select r.accepts_offers, r.budget
    into v_accepts, v_budget
  from public.help_requests r
  where r.id = new.request_id;

  if not found then
    raise exception 'Job not found for offer';
  end if;

  if coalesce(v_accepts, true) = false and new.status = 'pending' then
    if round(new.price::numeric, 2) is distinct from round(v_budget::numeric, 2) then
      raise exception 'This job has a firm price of $%. Offer amount must match.',
        round(v_budget::numeric, 2);
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists offers_enforce_firm_price on public.offers;
create trigger offers_enforce_firm_price
  before insert or update of price, status, request_id
  on public.offers
  for each row
  execute function public.enforce_firm_offer_price();

-- Expose accepts_offers on the public marketplace payload (signed-out browse).
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
