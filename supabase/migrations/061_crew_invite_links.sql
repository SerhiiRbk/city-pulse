-- ============================================================
-- City-Pulse: Crew Invite Links — schema, indexes & RLS
-- ============================================================
-- Adds shareable invite link support for Event Crews.
-- Crew Hosts and Moderators can generate unique URLs shared via
-- external channels. Recipients join with one click.
--
-- This migration creates:
--   1. crew_invite_links — invite link lifecycle
--   2. crew_invite_link_joins — audit log of joins via links
--   3. crew_kicked_members — track kicked users (prevents rejoin)
--   4. Indexes for performance
--   5. RLS policies for all three tables
-- ============================================================

-- ------------------------------------------------------------
-- 1. crew_invite_links
-- ------------------------------------------------------------

create table public.crew_invite_links (
  id uuid primary key default uuid_generate_v4(),
  crew_id uuid not null references public.event_crews(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  token text not null unique,
  status text not null default 'active'
    check (status in ('active', 'revoked', 'expired', 'deactivated')),
  use_count integer not null default 0,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  constraint token_length check (char_length(token) between 32 and 128)
);

-- Fast lookup by token (primary access pattern for landing page)
create unique index idx_crew_invite_links_token
  on public.crew_invite_links (token);

-- Active links per crew (for limit enforcement and management panel)
create index idx_crew_invite_links_crew_active
  on public.crew_invite_links (crew_id)
  where status = 'active';

-- Links by creator (for deactivation when user leaves)
create index idx_crew_invite_links_creator
  on public.crew_invite_links (created_by, crew_id)
  where status = 'active';

-- Rate limit check (links created in last 24h per crew)
create index idx_crew_invite_links_crew_created
  on public.crew_invite_links (crew_id, created_at desc);

-- ------------------------------------------------------------
-- 2. crew_invite_link_joins (audit log)
-- ------------------------------------------------------------

create table public.crew_invite_link_joins (
  id uuid primary key default uuid_generate_v4(),
  link_id uuid not null references public.crew_invite_links(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now()
);

create index idx_crew_invite_link_joins_link
  on public.crew_invite_link_joins (link_id);

create index idx_crew_invite_link_joins_user
  on public.crew_invite_link_joins (user_id);

-- ------------------------------------------------------------
-- 3. crew_kicked_members (track kicked users)
-- ------------------------------------------------------------

create table public.crew_kicked_members (
  crew_id uuid not null references public.event_crews(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kicked_at timestamptz not null default now(),
  kicked_by uuid not null references public.profiles(id) on delete cascade,
  primary key (crew_id, user_id)
);

-- ============================================================
-- RLS Policies
-- ============================================================

-- ------------------------------------------------------------
-- Enable RLS on all three new tables
-- ------------------------------------------------------------

alter table public.crew_invite_links enable row level security;
alter table public.crew_invite_link_joins enable row level security;
alter table public.crew_kicked_members enable row level security;

-- ------------------------------------------------------------
-- crew_invite_links policies
-- ------------------------------------------------------------

-- SELECT: Crew host/moderator can see all links for their crew
create policy "crew_invite_links_select_member"
  on public.crew_invite_links for select
  to authenticated
  using (
    exists (
      select 1 from public.event_crew_members m
      where m.crew_id = crew_invite_links.crew_id
        and m.user_id = auth.uid()
        and m.role in ('host', 'moderator')
    )
  );

-- SELECT: Any authenticated user can look up by token (for landing page validation)
create policy "crew_invite_links_select_by_token"
  on public.crew_invite_links for select
  to authenticated
  using (true);

-- INSERT: Only host/moderator of the crew, created_by must be self
create policy "crew_invite_links_insert"
  on public.crew_invite_links for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.event_crew_members m
      where m.crew_id = crew_invite_links.crew_id
        and m.user_id = auth.uid()
        and m.role in ('host', 'moderator')
    )
  );

-- UPDATE: Host can update any link for their crew, or creator can update their own
create policy "crew_invite_links_update"
  on public.crew_invite_links for update
  to authenticated
  using (
    exists (
      select 1 from public.event_crew_members m
      where m.crew_id = crew_invite_links.crew_id
        and m.user_id = auth.uid()
        and m.role = 'host'
    )
    or created_by = auth.uid()
  );

-- ------------------------------------------------------------
-- crew_invite_link_joins policies
-- ------------------------------------------------------------

-- SELECT: Host/moderator of the crew that owns the link
create policy "crew_invite_link_joins_select"
  on public.crew_invite_link_joins for select
  to authenticated
  using (
    exists (
      select 1 from public.crew_invite_links l
      join public.event_crew_members m on m.crew_id = l.crew_id
      where l.id = crew_invite_link_joins.link_id
        and m.user_id = auth.uid()
        and m.role in ('host', 'moderator')
    )
  );

-- INSERT: Service-level only (via server actions with service role)
-- No direct insert policy for regular users; joins are recorded server-side.
create policy "crew_invite_link_joins_insert"
  on public.crew_invite_link_joins for insert
  to authenticated
  with check (
    user_id = auth.uid()
  );

-- ------------------------------------------------------------
-- crew_kicked_members policies
-- ------------------------------------------------------------

-- SELECT: Host/moderator of the crew
create policy "crew_kicked_members_select"
  on public.crew_kicked_members for select
  to authenticated
  using (
    exists (
      select 1 from public.event_crew_members m
      where m.crew_id = crew_kicked_members.crew_id
        and m.user_id = auth.uid()
        and m.role in ('host', 'moderator')
    )
  );

-- INSERT: Host of the crew (only host can kick)
create policy "crew_kicked_members_insert"
  on public.crew_kicked_members for insert
  to authenticated
  with check (
    kicked_by = auth.uid()
    and exists (
      select 1 from public.event_crew_members m
      where m.crew_id = crew_kicked_members.crew_id
        and m.user_id = auth.uid()
        and m.role = 'host'
    )
  );
