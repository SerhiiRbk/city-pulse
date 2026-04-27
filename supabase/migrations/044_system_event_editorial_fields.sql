-- ============================================================
-- City-Pulse: editorial workflow for system events ("Афиша")
-- ============================================================
-- Powers the admin /admin/system-events composer + dashboard:
--   * partner_name / partner_url — credit the curating organisation or
--     event venue without forcing it into the freeform description.
--   * editorial_pitch — short ~200-char teaser shown in city feeds and
--     newsletters; required for any "review/published" listing because
--     plain descriptions are usually scraped and read poorly out of
--     context.
--   * editorial_status — pipeline state that's separate from `status`
--     because we want admins to discuss `review` drafts together before
--     anyone is allowed to flip the publish switch. `published` mirrors
--     `events.status = 'published'` (we keep them in sync via trigger).
--   * system_event_targets — soft per-city goals (5/month by default).
--     The editorial dashboard reads from this table to show a progress
--     bar without baking the target into the events row.
-- ============================================================

alter table public.events
  add column if not exists partner_name text,
  add column if not exists partner_url text,
  add column if not exists editorial_pitch text,
  add column if not exists editorial_status text;

-- Allowed pipeline states. Default 'draft' so legacy rows are untouched.
alter table public.events
  drop constraint if exists events_editorial_status_check;
alter table public.events
  add constraint events_editorial_status_check
  check (
    editorial_status is null
    or editorial_status in ('draft', 'review', 'scheduled', 'published')
  );

-- Index used by the editorial dashboard / pipeline queries.
create index if not exists idx_events_editorial_status
  on public.events (editorial_status, starts_at)
  where is_system = true;

comment on column public.events.partner_name is
  'Optional curating partner (venue / promoter) credited on system event listings.';
comment on column public.events.partner_url is
  'Optional partner homepage / official site, validated as a URL on the application layer.';
comment on column public.events.editorial_pitch is
  'Short 200-char teaser used in feeds and newsletters; quality gate requires this for system events.';
comment on column public.events.editorial_status is
  'Editorial pipeline state (draft / review / scheduled / published). Distinct from events.status so editors can collaborate before publishing.';

-- Targets per city — used by the dashboard for progress bars.
create table if not exists public.system_event_targets (
  city text primary key,
  monthly_target integer not null default 5 check (monthly_target between 0 and 100),
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.system_event_targets is
  'Per-city monthly goals for editorial system events. Soft target — feed adapts but never blocks publishing.';

-- Updated-at trigger so manual UPDATE statements don't have to remember.
create or replace function public.system_event_targets_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_system_event_targets_updated_at on public.system_event_targets;
create trigger trg_system_event_targets_updated_at
  before update on public.system_event_targets
  for each row execute function public.system_event_targets_set_updated_at();

-- RLS: read for everyone (the dashboard is admin-only but the city
-- progress block can also light up on public city-events pages later);
-- write for site staff only.
alter table public.system_event_targets enable row level security;

drop policy if exists "Anyone can read system event targets" on public.system_event_targets;
create policy "Anyone can read system event targets"
  on public.system_event_targets for select
  using (true);

drop policy if exists "Site staff can manage system event targets" on public.system_event_targets;
create policy "Site staff can manage system event targets"
  on public.system_event_targets for all
  using (public.is_site_staff(auth.uid()))
  with check (public.is_site_staff(auth.uid()));

-- Seed a handful of targets so the dashboard isn't empty on first visit.
-- We pick the founding cities; admins can edit through the UI.
insert into public.system_event_targets (city, monthly_target, is_active)
values
  ('Praha', 5, true),
  ('Brno', 4, true),
  ('Bratislava', 4, true)
on conflict (city) do nothing;
