-- Human-readable slugs for group posts and recaps
create extension if not exists unaccent with schema public;

alter table public.group_posts add column if not exists slug text;

create unique index if not exists idx_group_posts_group_slug
  on public.group_posts(group_id, slug)
  where slug is not null;

update public.group_posts
set slug = left(
  regexp_replace(
    lower(unaccent(coalesce(title, 'post'))),
    '[^a-z0-9]+',
    '-',
    'g'
  ),
  60
) || '-' || left(id::text, 8)
where slug is null;
