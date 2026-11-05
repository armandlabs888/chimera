-- Sync live chimera handle_new_user with Google OAuth + email signup metadata.
-- Populates name (name | full_name | email local-part), avatar_url (avatar_url | picture),
-- and validated Austin neighborhood (default east-austin).

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_avatar text;
  v_neighborhood text;
  v_meta_neighborhood text;
begin
  v_name := left(
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(split_part(coalesce(new.email, ''), '@', 1)), ''),
      'Neighbor'
    ),
    80
  );

  v_avatar := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'avatar_url'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'picture'), ''),
    ''
  );

  v_meta_neighborhood := lower(trim(coalesce(new.raw_user_meta_data ->> 'neighborhood', '')));
  if v_meta_neighborhood in (
    'east-austin',
    'hyde-park',
    'mueller',
    'zilker',
    'south-congress',
    'travis-heights',
    'clarksville',
    'the-domain'
  ) then
    v_neighborhood := v_meta_neighborhood;
  else
    v_neighborhood := 'east-austin';
  end if;

  insert into public.profiles (id, name, avatar_url, neighborhood)
  values (new.id, v_name, v_avatar, v_neighborhood)
  on conflict (id) do nothing;

  return new;
end;
$$;
