-- Casual launch taxonomy: store Other custom labels without remapping legacy rows.
-- category / skills remain free-form text (no CHECK) so historical IDs stay readable.

alter table public.help_requests
  add column if not exists category_custom text;

alter table public.profiles
  add column if not exists other_skill_label text;

comment on column public.help_requests.category_custom is
  'Required when category = other; trimmed everyday task name. Null for standard services.';

comment on column public.profiles.other_skill_label is
  'Required when skills includes other; helper-described service name.';

-- Soft length guard (null allowed). Existing rows unaffected.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'help_requests_category_custom_len'
  ) then
    alter table public.help_requests
      add constraint help_requests_category_custom_len
      check (
        category_custom is null
        or char_length(trim(category_custom)) between 2 and 60
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'profiles_other_skill_label_len'
  ) then
    alter table public.profiles
      add constraint profiles_other_skill_label_len
      check (
        other_skill_label is null
        or char_length(trim(other_skill_label)) between 2 and 60
      );
  end if;
end $$;
