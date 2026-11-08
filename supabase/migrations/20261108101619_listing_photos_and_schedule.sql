-- Listing form: multi-photo gallery + optional schedule end time.
-- Additive only. Legacy `image` remains the cover (first photo) for cards/RPC.
-- Storage bucket `beam-media` already has owner-folder RLS; do not broaden.

alter table public.help_requests
  add column if not exists images text[] not null default '{}';

alter table public.help_requests
  add column if not exists scheduled_end timestamptz;

comment on column public.help_requests.images is
  'Ordered listing photo public URLs (0–5). Cover stays in image = images[1].';

comment on column public.help_requests.scheduled_end is
  'Optional end of requester-selected time window (local clock persisted as timestamptz).';

-- Backfill cover into images when a single legacy image exists.
update public.help_requests
set images = array[image]
where coalesce(cardinality(images), 0) = 0
  and image is not null
  and length(trim(image)) > 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'help_requests_images_max_five'
  ) then
    alter table public.help_requests
      add constraint help_requests_images_max_five
      check (cardinality(images) <= 5);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'help_requests_scheduled_end_after_start'
  ) then
    alter table public.help_requests
      add constraint help_requests_scheduled_end_after_start
      check (
        scheduled_end is null
        or scheduled_for is null
        or scheduled_end > scheduled_for
      );
  end if;
end $$;

-- Keep marketplace cover in sync when images are updated (trigger is cheap insurance).
create or replace function public.help_requests_sync_cover_image()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' or tg_op = 'UPDATE' then
    if new.images is not null and cardinality(new.images) > 0 then
      new.image := new.images[1];
    elsif new.image is null then
      new.image := '';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists help_requests_sync_cover_image on public.help_requests;
create trigger help_requests_sync_cover_image
before insert or update of images, image
on public.help_requests
for each row
execute function public.help_requests_sync_cover_image();
