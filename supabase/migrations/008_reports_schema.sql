-- ============================================================
-- City-Pulse: Reports & Trust/Safety Schema
-- ============================================================

create table public.reports (
  id uuid primary key default uuid_generate_v4(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('user', 'event', 'group', 'comment')),
  target_id uuid not null,
  reason text not null check (reason in ('spam', 'harassment', 'inappropriate', 'fake', 'other')),
  description text,
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'resolved', 'dismissed')),
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.reports enable row level security;

create policy "Users can create reports"
  on public.reports for insert
  with check (auth.uid() = reporter_id);

create policy "Users can see own reports"
  on public.reports for select
  using (
    auth.uid() = reporter_id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'moderator')
    )
  );

create policy "Admins can update reports"
  on public.reports for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'moderator')
    )
  );

-- Activity log for suspicious behaviour
create table public.activity_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  action text not null,
  target_type text,
  target_id uuid,
  metadata jsonb default '{}',
  ip_address text,
  created_at timestamptz not null default now()
);

alter table public.activity_logs enable row level security;

create policy "Only admins see logs"
  on public.activity_logs for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "System can insert logs"
  on public.activity_logs for insert
  with check (true);

-- Indexes
create index idx_reports_status on public.reports(status, created_at desc);
create index idx_reports_target on public.reports(target_type, target_id);
create index idx_reports_reporter on public.reports(reporter_id);
create index idx_activity_logs_user on public.activity_logs(user_id, created_at desc);
