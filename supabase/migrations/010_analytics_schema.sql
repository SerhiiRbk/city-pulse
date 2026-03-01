-- ============================================================
-- City-Pulse: Analytics Schema
-- ============================================================

-- 1. ANALYTICS EVENTS (generic event tracking)
create table public.analytics_events (
  id uuid primary key default uuid_generate_v4(),
  event_name text not null,
  user_id uuid references public.profiles(id) on delete set null,
  properties jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.analytics_events enable row level security;

create policy "Only admins see analytics"
  on public.analytics_events for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "System can insert analytics"
  on public.analytics_events for insert
  with check (true);

-- 2. DAILY STATS (pre-aggregated by cron)
create table public.daily_stats (
  date date not null,
  metric text not null,
  value numeric not null default 0,
  metadata jsonb default '{}',
  primary key (date, metric)
);

alter table public.daily_stats enable row level security;

create policy "Only admins see daily stats"
  on public.daily_stats for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "System can upsert stats"
  on public.daily_stats for insert
  with check (true);

create policy "System can update stats"
  on public.daily_stats for update
  using (true);

-- 3. INDEXES
create index idx_analytics_event_name on public.analytics_events(event_name, created_at desc);
create index idx_analytics_user on public.analytics_events(user_id, created_at desc);
create index idx_daily_stats_metric on public.daily_stats(metric, date desc);
