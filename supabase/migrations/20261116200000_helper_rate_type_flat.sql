-- Allow helpers to set a flat (per-job) rate in addition to hourly / legacy quote.
-- Does NOT update existing rows. Legacy rate_type = 'quote' remains valid.

alter table public.profiles
  drop constraint if exists profiles_rate_type_check;

alter table public.profiles
  add constraint profiles_rate_type_check
  check (rate_type in ('hourly', 'quote', 'flat'));
