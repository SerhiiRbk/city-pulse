-- ============================================================
-- City-Pulse: Social Dynamics & Reputation
-- ============================================================

-- 1. USER SUBSCRIPTIONS (follow organizers)
create table public.user_subscriptions (
  subscriber_id uuid not null references public.profiles(id) on delete cascade,
  target_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (subscriber_id, target_user_id),
  constraint no_self_follow check (subscriber_id <> target_user_id)
);

alter table public.user_subscriptions enable row level security;

create policy "Anyone can see subscriptions"
  on public.user_subscriptions for select using (true);

create policy "Users can subscribe"
  on public.user_subscriptions for insert
  with check (auth.uid() = subscriber_id);

create policy "Users can unsubscribe"
  on public.user_subscriptions for delete
  using (auth.uid() = subscriber_id);

-- 2. BADGES
create table public.badges (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  icon text not null default '🏆',
  translations jsonb not null default '{}'
);

insert into public.badges (slug, icon, translations) values
  ('newcomer', '🌱', '{"en": "Newcomer", "ru": "Новичок", "uk": "Новачок", "cs": "Nováček", "de": "Neuling"}'),
  ('active-participant', '⭐', '{"en": "Active Participant", "ru": "Активный участник", "uk": "Активний учасник", "cs": "Aktivní účastník", "de": "Aktiver Teilnehmer"}'),
  ('organizer', '🎯', '{"en": "Organizer", "ru": "Организатор", "uk": "Організатор", "cs": "Organizátor", "de": "Veranstalter"}'),
  ('top-organizer', '🏆', '{"en": "Top Organizer", "ru": "Топ-организатор", "uk": "Топ-організатор", "cs": "Top organizátor", "de": "Top-Veranstalter"}'),
  ('social-butterfly', '🦋', '{"en": "Social Butterfly", "ru": "Душа компании", "uk": "Душа компанії", "cs": "Společenský motýl", "de": "Sozialer Schmetterling"}'),
  ('explorer', '🧭', '{"en": "Explorer", "ru": "Исследователь", "uk": "Дослідник", "cs": "Průzkumník", "de": "Entdecker"}'),
  ('reliable', '✅', '{"en": "Reliable", "ru": "Надёжный", "uk": "Надійний", "cs": "Spolehlivý", "de": "Zuverlässig"}'),
  ('community-builder', '🏗️', '{"en": "Community Builder", "ru": "Строитель сообщества", "uk": "Будівник спільноти", "cs": "Budovatel komunity", "de": "Community-Builder"}')
on conflict (slug) do nothing;

-- 3. USER BADGES
create table public.user_badges (
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  awarded_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

alter table public.user_badges enable row level security;

create policy "Badges are public"
  on public.user_badges for select using (true);

create policy "System can award badges"
  on public.user_badges for insert
  with check (true);

-- 4. PROFILE STATS VIEW
create or replace view public.profile_stats as
select
  p.id as user_id,
  coalesce(ec.created_count, 0) as events_created,
  coalesce(ea.attended_count, 0) as events_attended,
  coalesce(er.avg_rating, 0) as avg_organizer_rating,
  coalesce(er.review_count, 0) as review_count,
  coalesce(fs.follower_count, 0) as follower_count,
  coalesce(fg.following_count, 0) as following_count
from public.profiles p
left join (
  select organizer_id, count(*) as created_count
  from public.events where status in ('published', 'completed')
  group by organizer_id
) ec on ec.organizer_id = p.id
left join (
  select user_id, count(*) as attended_count
  from public.event_attendees where status = 'going'
  group by user_id
) ea on ea.user_id = p.id
left join (
  select e.organizer_id, avg(r.rating)::numeric(3,2) as avg_rating, count(*) as review_count
  from public.event_reviews r
  join public.events e on e.id = r.event_id
  group by e.organizer_id
) er on er.organizer_id = p.id
left join (
  select target_user_id, count(*) as follower_count
  from public.user_subscriptions group by target_user_id
) fs on fs.target_user_id = p.id
left join (
  select subscriber_id, count(*) as following_count
  from public.user_subscriptions group by subscriber_id
) fg on fg.subscriber_id = p.id;

-- 5. INDEXES
create index idx_user_subscriptions_target on public.user_subscriptions(target_user_id);
create index idx_user_subscriptions_subscriber on public.user_subscriptions(subscriber_id);
create index idx_user_badges_user on public.user_badges(user_id);
