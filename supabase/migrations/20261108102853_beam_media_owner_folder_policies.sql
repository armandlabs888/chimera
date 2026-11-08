-- Document/ensure beam-media owner-folder RLS (public read, owner write/delete).
-- Policies already live on chimera; this is idempotent for fresh envs and repo fidelity.
-- Does NOT widen access: insert/update/delete require first path segment = auth.uid().

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'beam_media_public_read'
  ) then
    create policy beam_media_public_read
      on storage.objects
      for select
      to public
      using (bucket_id = 'beam-media');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'beam_media_auth_insert_own'
  ) then
    create policy beam_media_auth_insert_own
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'beam-media'
        and (storage.foldername(name))[1] = (select auth.uid())::text
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'beam_media_auth_update_own'
  ) then
    create policy beam_media_auth_update_own
      on storage.objects
      for update
      to authenticated
      using (
        bucket_id = 'beam-media'
        and (storage.foldername(name))[1] = (select auth.uid())::text
      )
      with check (
        bucket_id = 'beam-media'
        and (storage.foldername(name))[1] = (select auth.uid())::text
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'beam_media_auth_delete_own'
  ) then
    create policy beam_media_auth_delete_own
      on storage.objects
      for delete
      to authenticated
      using (
        bucket_id = 'beam-media'
        and (storage.foldername(name))[1] = (select auth.uid())::text
      );
  end if;
end $$;

-- Keep bucket limits aligned (5 MB, image MIME allow-list). Public bucket for listing covers.
update storage.buckets
set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
where id = 'beam-media';
