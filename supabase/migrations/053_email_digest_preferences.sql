-- ============================================================
-- City-Pulse: Email digest opt-in/out + unsubscribe tokens
-- ============================================================
-- Adds the per-profile preference flags driving the weekly digest
-- and a small `email_unsubscribe_tokens` table powering the one-
-- click unsubscribe links we put in every email footer (RFC 8058
-- friendly).
--
-- Why one-click tokens instead of just `?user_id=...`:
--   * tokens are unguessable (32 bytes urlsafe), so leaked emails
--     don't let third parties unsubscribe other people;
--   * tokens are scoped to a `category` so the same record covers
--     digest, reminders, etc., without coupling them — flipping
--     one preference doesn't silence the others;
--   * tokens are reusable: we never rotate them automatically,
--     so older newsletters keep working forever.
-- ============================================================

-- pgcrypto provides gen_random_bytes; Supabase enables it by
-- default but be defensive in case a fresh project is bootstrapped.
create extension if not exists pgcrypto;

-- 1. Profile-level preferences.
alter table public.profiles
  add column if not exists email_digest_enabled boolean not null default true,
  add column if not exists email_digest_last_sent_at timestamptz;

-- 2. One-click unsubscribe tokens.
create table if not exists public.email_unsubscribe_tokens (
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check (category in ('digest', 'reminders', 'marketing')),
  token text not null unique,
  created_at timestamptz not null default now(),
  primary key (user_id, category)
);

create index if not exists idx_unsubscribe_tokens_token
  on public.email_unsubscribe_tokens (token);

alter table public.email_unsubscribe_tokens enable row level security;

-- Users can read their own row (e.g. settings page showing the
-- "manage email preferences" link). No one else has read access —
-- not even admins, since the tokens are effectively passwords.
drop policy if exists "Users can read own unsubscribe tokens"
  on public.email_unsubscribe_tokens;
create policy "Users can read own unsubscribe tokens"
  on public.email_unsubscribe_tokens for select
  using (auth.uid() = user_id);

-- All writes happen via service-role-only paths (cron, server
-- actions running as the user). The lack of insert/update/delete
-- policies for end-users is intentional — it forces those paths
-- to use the service-role client.

-- 3. RPC helper used by the cron and the unsubscribe page.
-- Reusing the same row across emails means newsletters from
-- months ago still unsubscribe correctly.
create or replace function public.ensure_unsubscribe_token(
  p_user_id uuid,
  p_category text
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
begin
  if p_user_id is null then
    raise exception 'user_id required';
  end if;

  select token into v_token
  from public.email_unsubscribe_tokens
  where user_id = p_user_id and category = p_category;

  if v_token is null then
    -- 32 random bytes → 64 hex chars; collision-resistant.
    v_token := encode(gen_random_bytes(32), 'hex');
    insert into public.email_unsubscribe_tokens (user_id, category, token)
    values (p_user_id, p_category, v_token)
    on conflict (user_id, category) do update set token = excluded.token
    returning token into v_token;
  end if;

  return v_token;
end;
$$;

grant execute on function public.ensure_unsubscribe_token(uuid, text) to authenticated;
