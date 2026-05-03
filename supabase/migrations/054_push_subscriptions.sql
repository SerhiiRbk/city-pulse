-- ============================================================
-- City-Pulse: Web push subscriptions + VAPID payload routing
-- ============================================================
-- Stores the (endpoint, p256dh, auth) triplets returned by the
-- browser's PushManager.subscribe() call. We key the table by
-- (user_id, endpoint) because:
--   * a single user often has the same site open across phone +
--     laptop and we want both to get pushes;
--   * the endpoint is globally unique per device, so it prevents
--     duplicates at the column level without an awkward composite.
--
-- We also stamp `last_seen_at` on every successful push so the
-- cleanup cron can prune subscriptions that have been silently
-- expired for >30d (push servers stop returning errors after a
-- while, so we have to age them out ourselves).
-- ============================================================

create table if not exists public.push_subscriptions (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create index if not exists idx_push_subscriptions_user
  on public.push_subscriptions (user_id);
create index if not exists idx_push_subscriptions_endpoint
  on public.push_subscriptions (endpoint);

alter table public.push_subscriptions enable row level security;

-- Users own their subscriptions; the server worker uses the
-- service-role client for sends and prunes.
drop policy if exists "Users can read own push subs" on public.push_subscriptions;
create policy "Users can read own push subs"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own push subs" on public.push_subscriptions;
create policy "Users can insert own push subs"
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own push subs" on public.push_subscriptions;
create policy "Users can delete own push subs"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);
