-- Help and contact: support inbox + product feedback.
-- Idempotent. Do NOT apply from the agent to live DB; ship via repo migrations only.
-- Inserts go through server API routes with the service-role client.
-- Staff read via service role only; anon/authenticated have no SELECT.

-- ---------------------------------------------------------------------------
-- Support messages (contact form)
-- ---------------------------------------------------------------------------
create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  name text not null
    check (char_length(btrim(name)) between 1 and 120),
  email text not null
    check (char_length(btrim(email)) between 3 and 254),
  topic text not null
    check (
      topic in (
        'account_sign_in',
        'job_or_offer',
        'verification',
        'safety_concern',
        'billing',
        'something_else'
      )
    ),
  job_link text
    check (job_link is null or char_length(job_link) <= 500),
  message text not null
    check (char_length(btrim(message)) between 1 and 5000),
  screenshot_path text
    check (screenshot_path is null or char_length(screenshot_path) <= 500),
  status text not null default 'new'
    check (status in ('new', 'in_progress', 'resolved', 'spam')),
  created_at timestamptz not null default now()
);

comment on table public.support_messages is
  'Contact form submissions from /help. Written by service-role API routes; staff read via service role.';

create index if not exists support_messages_created_at_idx
  on public.support_messages (created_at desc);

create index if not exists support_messages_status_idx
  on public.support_messages (status);

create index if not exists support_messages_user_id_idx
  on public.support_messages (user_id)
  where user_id is not null;

alter table public.support_messages enable row level security;

revoke all on table public.support_messages from anon, authenticated;
-- No SELECT/INSERT/UPDATE/DELETE policies for anon or authenticated.
-- Service role bypasses RLS for API inserts and staff tooling.

-- ---------------------------------------------------------------------------
-- Feedback entries (share feedback card)
-- ---------------------------------------------------------------------------
create table if not exists public.feedback_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  rating integer
    check (rating is null or (rating >= 1 and rating <= 5)),
  kind text
    check (kind is null or kind in ('idea', 'bug', 'praise')),
  message text not null
    check (char_length(btrim(message)) between 1 and 2000),
  page_path text
    check (page_path is null or char_length(page_path) <= 300),
  created_at timestamptz not null default now()
);

comment on table public.feedback_entries is
  'In-app feedback from /help. Written by service-role API routes; staff read via service role.';

create index if not exists feedback_entries_created_at_idx
  on public.feedback_entries (created_at desc);

create index if not exists feedback_entries_user_id_idx
  on public.feedback_entries (user_id)
  where user_id is not null;

alter table public.feedback_entries enable row level security;

revoke all on table public.feedback_entries from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Private storage for optional contact screenshots (PNG/JPG, 5 MB)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'support-screenshots',
  'support-screenshots',
  false,
  5242880,
  array['image/jpeg', 'image/png']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- No storage.objects policies for anon/authenticated on this bucket.
-- Uploads use the service-role client from /api/support/contact.
