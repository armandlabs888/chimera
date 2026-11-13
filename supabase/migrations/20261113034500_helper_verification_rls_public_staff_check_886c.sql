-- Policies that called private.is_beam_staff() failed with permission denied
-- for authenticated helpers, because execute on that private function is revoked.
-- Use the public SECURITY DEFINER wrapper instead so helpers can read their own
-- verification row (and the success screen / offer gate can load).
-- Already applied on live chimera (lfyqdrjqfpczsfkqjxpq). Do not re-apply as a new change.

drop policy if exists helper_verifications_select_own_or_staff
  on public.helper_verifications;
create policy helper_verifications_select_own_or_staff
  on public.helper_verifications for select
  to authenticated
  using (
    profile_id = (select auth.uid())
    or public.is_beam_staff()
  );

drop policy if exists helper_verifications_update_staff
  on public.helper_verifications;
create policy helper_verifications_update_staff
  on public.helper_verifications for update
  to authenticated
  using (public.is_beam_staff())
  with check (public.is_beam_staff());

drop policy if exists helper_verification_attempts_select_own_or_staff
  on public.helper_verification_attempts;
create policy helper_verification_attempts_select_own_or_staff
  on public.helper_verification_attempts for select
  to authenticated
  using (
    profile_id = (select auth.uid())
    or public.is_beam_staff()
  );

drop policy if exists helper_verification_select_own_or_staff
  on storage.objects;
create policy helper_verification_select_own_or_staff
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'helper-verification'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or public.is_beam_staff()
    )
  );

notify pgrst, 'reload schema';
