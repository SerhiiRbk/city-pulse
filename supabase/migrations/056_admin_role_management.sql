-- ============================================================
-- City-Pulse: Admin role management + audit log
-- ============================================================
-- Until now `profiles.role` could only be changed by SQL access
-- (via Supabase service_role) because the only RLS policy that
-- allowed UPDATEs on `profiles` required `auth.uid() = id`.
--
-- This migration:
--   1. Lets active admins reassign roles for OTHER users (never
--      themselves — protects against accidental self-demotion
--      that would lock the team out of the panel).
--   2. Refuses to leave the system without any admin (a row
--      trigger blocks the last admin from being downgraded).
--   3. Records every successful role change in `admin_audit_log`
--      via an AFTER UPDATE trigger, so the team has a tamper-
--      resistant record of who promoted/demoted whom and when.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Audit log table
-- ------------------------------------------------------------
-- One row per admin-initiated mutation. Today this only covers
-- role changes; the schema is intentionally generic (`action`,
-- `target_type`, `target_id`, `metadata`) so we can extend it
-- later (e.g. block/unblock, feature-flag toggles) without
-- another migration.
create table if not exists public.admin_audit_log (
  id uuid primary key default uuid_generate_v4(),

  -- Actor: who performed the action. Nullable so the row survives
  -- if the admin account is later deleted (audit must outlive its
  -- subjects). `actor_email_snapshot` keeps a human label.
  actor_id uuid references public.profiles(id) on delete set null,
  actor_email_snapshot text,

  -- Action verb. Free-form text but expected to match a small,
  -- known vocabulary that the UI knows how to render.
  action text not null check (length(action) <= 64),

  -- Target of the action. `target_id` is uuid only because every
  -- domain object we moderate today is uuid-keyed; widen later
  -- if we ever audit, say, slug-keyed feature flags.
  target_type text not null check (length(target_type) <= 32),
  target_id uuid,

  -- Free-form payload describing the diff. For role changes we
  -- store `{ "from_role": "user", "to_role": "admin" }`.
  metadata jsonb not null default '{}',

  created_at timestamptz not null default now()
);

create index if not exists idx_admin_audit_log_created_at
  on public.admin_audit_log (created_at desc);
create index if not exists idx_admin_audit_log_actor
  on public.admin_audit_log (actor_id, created_at desc);
create index if not exists idx_admin_audit_log_target
  on public.admin_audit_log (target_type, target_id, created_at desc);

alter table public.admin_audit_log enable row level security;

-- Read: admins only. The audit log is the most sensitive table
-- in the project — it contains the membership graph of who has
-- privileged access. No "everyone can read" policy.
create policy "Admins can read audit log"
  on public.admin_audit_log for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role = 'admin'
    )
  );

-- Writes: trigger-only. We intentionally do NOT grant insert/update
-- to any role from the API. The trigger below uses SECURITY DEFINER
-- to write rows on the audited mutation's behalf.
revoke insert, update, delete on public.admin_audit_log from anon, authenticated;

-- ------------------------------------------------------------
-- 2. RLS policy: admins can update the role of OTHER users
-- ------------------------------------------------------------
-- Existing policy on `profiles` (from 001_initial_schema.sql) already
-- allows users to update their OWN row. This new policy adds a second
-- path: an active admin can update ANY profile, but only for the
-- purpose of changing privileged columns. We don't try to lock the
-- update down to a column subset — Postgres RLS doesn't have column
-- selectivity for UPDATE — so we rely on the server-side action to
-- only mutate `role`. The trigger below is the actual safety net
-- that prevents abuse of this policy.
create policy "Admins can update any profile"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

-- ------------------------------------------------------------
-- 3. Triggers: protect role changes & log them
-- ------------------------------------------------------------
-- Self-protection. A signed-in admin cannot change their own
-- role row to anything else (covers user-initiated path and the
-- new admin policy). Service-role calls bypass RLS but still
-- pass through this trigger; we explicitly skip the check when
-- there is no `auth.uid()` so SQL Editor / cron jobs can fix
-- broken state if needed.
create or replace function public.guard_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  actor uuid := auth.uid();
  remaining_admins integer;
begin
  -- No-op if role didn't change.
  if new.role is not distinct from old.role then
    return new;
  end if;

  -- Bypass guards entirely when the call has no auth context
  -- (service_role / SQL editor / migrations). This keeps the
  -- emergency "manually fix one row in the dashboard" path open.
  if actor is null then
    return new;
  end if;

  -- Self-demotion guard.
  if new.id = actor then
    raise exception 'Admins cannot change their own role';
  end if;

  -- Last-admin guard. If the operation would leave the system
  -- with zero admins, refuse it. Counted across `profiles` because
  -- `auth.users` itself doesn't carry the role.
  if old.role = 'admin' and new.role <> 'admin' then
    select count(*) into remaining_admins
      from public.profiles
     where role = 'admin'
       and id <> new.id;

    if remaining_admins = 0 then
      raise exception 'Cannot demote the last remaining admin';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_profiles_guard_role_change on public.profiles;
create trigger trg_profiles_guard_role_change
  before update of role on public.profiles
  for each row
  execute function public.guard_profile_role_change();

-- Audit-log writer. Runs after the role change has succeeded so
-- the log only contains real, applied transitions. SECURITY
-- DEFINER lets it write to `admin_audit_log` even though no API
-- role has direct insert permission.
create or replace function public.log_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  actor uuid := auth.uid();
  actor_email text;
begin
  if new.role is not distinct from old.role then
    return new;
  end if;

  -- Snapshot the actor's email at the time of action so the audit
  -- row stays meaningful even if the admin profile is later edited
  -- or deleted.
  if actor is not null then
    select email into actor_email
      from public.profiles
     where id = actor;
  end if;

  insert into public.admin_audit_log (
    actor_id,
    actor_email_snapshot,
    action,
    target_type,
    target_id,
    metadata
  ) values (
    actor,
    actor_email,
    'profile.role_change',
    'profile',
    new.id,
    jsonb_build_object(
      'from_role', old.role,
      'to_role', new.role
    )
  );

  return new;
end;
$$;

drop trigger if exists trg_profiles_audit_role_change on public.profiles;
create trigger trg_profiles_audit_role_change
  after update of role on public.profiles
  for each row
  execute function public.log_profile_role_change();
