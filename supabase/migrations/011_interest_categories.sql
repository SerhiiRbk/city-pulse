-- ============================================================
-- City-Pulse: Interest Categories + Interest metadata
-- ============================================================

-- 1. INTEREST CATEGORIES TABLE
create table public.interest_categories (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  sort_order int not null default 0,
  translations jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.interest_categories enable row level security;

create policy "Categories are viewable by everyone"
  on public.interest_categories for select
  using (true);

-- 2. ADD COLUMNS TO INTERESTS
alter table public.interests
  add column if not exists icon text,
  add column if not exists category_id uuid references public.interest_categories(id) on delete set null;

create index idx_interests_category on public.interests(category_id);

-- 3. SEED CATEGORIES
insert into public.interest_categories (slug, sort_order, translations) values
  ('social',    1, '{"en": "Social & Networking", "ru": "Общение и нетворкинг", "uk": "Спілкування та нетворкінг", "cs": "Sociální aktivity", "de": "Soziales & Networking"}'),
  ('sports',    2, '{"en": "Sports & Outdoors", "ru": "Спорт и активный отдых", "uk": "Спорт та активний відпочинок", "cs": "Sport & outdoor", "de": "Sport & Outdoor"}'),
  ('arts',      3, '{"en": "Arts & Culture", "ru": "Искусство и культура", "uk": "Мистецтво та культура", "cs": "Umění a kultura", "de": "Kunst & Kultur"}'),
  ('tech',      4, '{"en": "Technology", "ru": "Технологии", "uk": "Технології", "cs": "Technologie", "de": "Technologie"}'),
  ('food',      5, '{"en": "Food & Drink", "ru": "Еда и напитки", "uk": "Їжа та напої", "cs": "Jídlo a pití", "de": "Essen & Trinken"}'),
  ('games',     6, '{"en": "Games & Entertainment", "ru": "Игры и развлечения", "uk": "Ігри та розваги", "cs": "Hry a zábava", "de": "Spiele & Unterhaltung"}'),
  ('lifestyle', 7, '{"en": "Lifestyle", "ru": "Образ жизни", "uk": "Спосіб життя", "cs": "Životní styl", "de": "Lebensstil"}'),
  ('education', 8, '{"en": "Education & Science", "ru": "Образование и наука", "uk": "Освіта та наука", "cs": "Vzdělávání a věda", "de": "Bildung & Wissenschaft"}'),
  ('other',     9, '{"en": "Other", "ru": "Другое", "uk": "Інше", "cs": "Ostatní", "de": "Sonstiges"}')
on conflict (slug) do nothing;

-- 4. UPDATE INTERESTS WITH ICONS AND CATEGORY LINKS
-- Social & Networking
update public.interests set icon = '🗣️', category_id = (select id from public.interest_categories where slug = 'social') where slug = 'language-exchange';
update public.interests set icon = '🤝', category_id = (select id from public.interest_categories where slug = 'social') where slug = 'networking';
update public.interests set icon = '🌍', category_id = (select id from public.interest_categories where slug = 'social') where slug = 'expat-meetup';
update public.interests set icon = '📚', category_id = (select id from public.interest_categories where slug = 'social') where slug = 'book-club';
update public.interests set icon = '💻', category_id = (select id from public.interest_categories where slug = 'social') where slug = 'coworking';

-- Sports & Outdoors
update public.interests set icon = '🥾', category_id = (select id from public.interest_categories where slug = 'sports') where slug = 'hiking';
update public.interests set icon = '🏃', category_id = (select id from public.interest_categories where slug = 'sports') where slug = 'running';
update public.interests set icon = '🚴', category_id = (select id from public.interest_categories where slug = 'sports') where slug = 'cycling';
update public.interests set icon = '🧘', category_id = (select id from public.interest_categories where slug = 'sports') where slug = 'yoga';
update public.interests set icon = '💪', category_id = (select id from public.interest_categories where slug = 'sports') where slug = 'fitness';
update public.interests set icon = '🏊', category_id = (select id from public.interest_categories where slug = 'sports') where slug = 'swimming';
update public.interests set icon = '🧗', category_id = (select id from public.interest_categories where slug = 'sports') where slug = 'climbing';
update public.interests set icon = '🎾', category_id = (select id from public.interest_categories where slug = 'sports') where slug = 'tennis';
update public.interests set icon = '⚽', category_id = (select id from public.interest_categories where slug = 'sports') where slug = 'football';
update public.interests set icon = '🏀', category_id = (select id from public.interest_categories where slug = 'sports') where slug = 'basketball';
update public.interests set icon = '🏐', category_id = (select id from public.interest_categories where slug = 'sports') where slug = 'volleyball';
update public.interests set icon = '⛷️', category_id = (select id from public.interest_categories where slug = 'sports') where slug = 'skiing';
update public.interests set icon = '🛹', category_id = (select id from public.interest_categories where slug = 'sports') where slug = 'skateboarding';
update public.interests set icon = '🥋', category_id = (select id from public.interest_categories where slug = 'sports') where slug = 'martial-arts';
update public.interests set icon = '💃', category_id = (select id from public.interest_categories where slug = 'sports') where slug = 'dancing';
update public.interests set icon = '⛵', category_id = (select id from public.interest_categories where slug = 'sports') where slug = 'yachting';

-- Arts & Culture
update public.interests set icon = '📷', category_id = (select id from public.interest_categories where slug = 'arts') where slug = 'photography';
update public.interests set icon = '🎨', category_id = (select id from public.interest_categories where slug = 'arts') where slug = 'painting';
update public.interests set icon = '🎵', category_id = (select id from public.interest_categories where slug = 'arts') where slug = 'music';
update public.interests set icon = '🎭', category_id = (select id from public.interest_categories where slug = 'arts') where slug = 'theater';
update public.interests set icon = '🎬', category_id = (select id from public.interest_categories where slug = 'arts') where slug = 'cinema';
update public.interests set icon = '🏛️', category_id = (select id from public.interest_categories where slug = 'arts') where slug = 'museums';
update public.interests set icon = '✍️', category_id = (select id from public.interest_categories where slug = 'arts') where slug = 'writing';
update public.interests set icon = '🧶', category_id = (select id from public.interest_categories where slug = 'arts') where slug = 'crafts';
update public.interests set icon = '🖋️', category_id = (select id from public.interest_categories where slug = 'arts') where slug = 'calligraphy';
update public.interests set icon = '🏯', category_id = (select id from public.interest_categories where slug = 'arts') where slug = 'japanese-culture';
update public.interests set icon = '🎌', category_id = (select id from public.interest_categories where slug = 'arts') where slug = 'anime';

-- Technology
update public.interests set icon = '👨‍💻', category_id = (select id from public.interest_categories where slug = 'tech') where slug = 'programming';
update public.interests set icon = '🚀', category_id = (select id from public.interest_categories where slug = 'tech') where slug = 'startups';
update public.interests set icon = '🤖', category_id = (select id from public.interest_categories where slug = 'tech') where slug = 'ai-ml';
update public.interests set icon = '🌐', category_id = (select id from public.interest_categories where slug = 'tech') where slug = 'web-development';
update public.interests set icon = '🎮', category_id = (select id from public.interest_categories where slug = 'tech') where slug = 'gamedev';
update public.interests set icon = '₿', category_id = (select id from public.interest_categories where slug = 'tech') where slug = 'crypto';

-- Food & Drink
update public.interests set icon = '👨‍🍳', category_id = (select id from public.interest_categories where slug = 'food') where slug = 'cooking';
update public.interests set icon = '🍷', category_id = (select id from public.interest_categories where slug = 'food') where slug = 'wine-tasting';
update public.interests set icon = '🍺', category_id = (select id from public.interest_categories where slug = 'food') where slug = 'craft-beer';
update public.interests set icon = '☕', category_id = (select id from public.interest_categories where slug = 'food') where slug = 'coffee';
update public.interests set icon = '🥗', category_id = (select id from public.interest_categories where slug = 'food') where slug = 'vegan';
update public.interests set icon = '🍽️', category_id = (select id from public.interest_categories where slug = 'food') where slug = 'food-tours';
update public.interests set icon = '🍵', category_id = (select id from public.interest_categories where slug = 'food') where slug = 'tea-ceremony';

-- Games & Entertainment
update public.interests set icon = '🎲', category_id = (select id from public.interest_categories where slug = 'games') where slug = 'board-games';
update public.interests set icon = '🕹️', category_id = (select id from public.interest_categories where slug = 'games') where slug = 'video-games';
update public.interests set icon = '❓', category_id = (select id from public.interest_categories where slug = 'games') where slug = 'trivia';
update public.interests set icon = '🔐', category_id = (select id from public.interest_categories where slug = 'games') where slug = 'escape-rooms';
update public.interests set icon = '🎤', category_id = (select id from public.interest_categories where slug = 'games') where slug = 'karaoke';
update public.interests set icon = '😂', category_id = (select id from public.interest_categories where slug = 'games') where slug = 'standup';

-- Lifestyle
update public.interests set icon = '✈️', category_id = (select id from public.interest_categories where slug = 'lifestyle') where slug = 'travel';
update public.interests set icon = '🧭', category_id = (select id from public.interest_categories where slug = 'lifestyle') where slug = 'travel-adventures';
update public.interests set icon = '🧘‍♂️', category_id = (select id from public.interest_categories where slug = 'lifestyle') where slug = 'meditation';
update public.interests set icon = '🤲', category_id = (select id from public.interest_categories where slug = 'lifestyle') where slug = 'volunteering';
update public.interests set icon = '♻️', category_id = (select id from public.interest_categories where slug = 'lifestyle') where slug = 'sustainability';
update public.interests set icon = '👶', category_id = (select id from public.interest_categories where slug = 'lifestyle') where slug = 'parenting';
update public.interests set icon = '🐾', category_id = (select id from public.interest_categories where slug = 'lifestyle') where slug = 'pets';
update public.interests set icon = '👗', category_id = (select id from public.interest_categories where slug = 'lifestyle') where slug = 'fashion';
update public.interests set icon = '🚗', category_id = (select id from public.interest_categories where slug = 'lifestyle') where slug = 'cars';
update public.interests set icon = '🌱', category_id = (select id from public.interest_categories where slug = 'lifestyle') where slug = 'gardening';

-- Education & Science
update public.interests set icon = '🗺️', category_id = (select id from public.interest_categories where slug = 'education') where slug = 'languages';
update public.interests set icon = '🔬', category_id = (select id from public.interest_categories where slug = 'education') where slug = 'science';
update public.interests set icon = '🏰', category_id = (select id from public.interest_categories where slug = 'education') where slug = 'history';
update public.interests set icon = '📜', category_id = (select id from public.interest_categories where slug = 'education') where slug = 'history-deep';
update public.interests set icon = '💭', category_id = (select id from public.interest_categories where slug = 'education') where slug = 'philosophy';
update public.interests set icon = '🧠', category_id = (select id from public.interest_categories where slug = 'education') where slug = 'psychology';
update public.interests set icon = '🗺️', category_id = (select id from public.interest_categories where slug = 'education') where slug = 'guided-tours';
update public.interests set icon = '⚔️', category_id = (select id from public.interest_categories where slug = 'education') where slug = 'historical-reenactment';

-- Other
update public.interests set icon = '🔭', category_id = (select id from public.interest_categories where slug = 'other') where slug = 'astronomy';
update public.interests set icon = '💡', category_id = (select id from public.interest_categories where slug = 'other') where slug = 'other';
