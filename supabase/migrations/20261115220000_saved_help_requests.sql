-- Saved help requests (jobs) for signed-in users.
-- Mirrors public.saved_helpers: own-row RLS, authenticated grants only.

create table if not exists public.saved_help_requests (
  user_id uuid not null references public.profiles (id) on delete cascade,
  help_request_id uuid not null references public.help_requests (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, help_request_id)
);

create index if not exists saved_help_requests_request_idx
  on public.saved_help_requests (help_request_id);

alter table public.saved_help_requests enable row level security;
revoke all on table public.saved_help_requests from anon;
grant select, insert, delete on table public.saved_help_requests to authenticated;

drop policy if exists saved_help_requests_select_own on public.saved_help_requests;
create policy saved_help_requests_select_own
  on public.saved_help_requests for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists saved_help_requests_insert_own on public.saved_help_requests;
create policy saved_help_requests_insert_own
  on public.saved_help_requests for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists saved_help_requests_delete_own on public.saved_help_requests;
create policy saved_help_requests_delete_own
  on public.saved_help_requests for delete
  to authenticated
  using (user_id = (select auth.uid()));
