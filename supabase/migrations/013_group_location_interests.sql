-- Add optional country and city columns to groups
alter table public.groups add column if not exists country text;
alter table public.groups add column if not exists city text;

-- Junction table for group interests (many-to-many)
create table if not exists public.group_interests (
  group_id uuid not null references public.groups(id) on delete cascade,
  interest_id uuid not null references public.interests(id) on delete cascade,
  primary key (group_id, interest_id)
);

alter table public.group_interests enable row level security;

create policy "Group interests visible to all"
  on public.group_interests for select using (true);

create policy "Group editors can manage interests"
  on public.group_interests for insert
  with check (
    exists (
      select 1 from public.groups
      where id = group_id and created_by = auth.uid()
    )
    or exists (
      select 1 from public.group_members
      where group_members.group_id = group_interests.group_id
        and group_members.user_id = auth.uid()
        and group_members.role in ('admin', 'moderator')
    )
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'moderator')
    )
  );

create policy "Group editors can remove interests"
  on public.group_interests for delete
  using (
    exists (
      select 1 from public.groups
      where id = group_id and created_by = auth.uid()
    )
    or exists (
      select 1 from public.group_members
      where group_members.group_id = group_interests.group_id
        and group_members.user_id = auth.uid()
        and group_members.role in ('admin', 'moderator')
    )
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'moderator')
    )
  );

create index if not exists idx_group_interests_group on public.group_interests(group_id);
create index if not exists idx_group_interests_interest on public.group_interests(interest_id);

-- Recreate groups_with_counts view (must drop first since g.* column set changed)
drop view if exists public.groups_with_counts;
create view public.groups_with_counts as
select
  g.*,
  coalesce(m.member_count, 0) as member_count,
  coalesce(e.event_count, 0) as event_count,
  p.display_name as creator_name,
  p.avatar_url as creator_avatar
from public.groups g
left join (
  select group_id, count(*) as member_count
  from public.group_members group by group_id
) m on m.group_id = g.id
left join (
  select group_id, count(*) as event_count
  from public.events where status = 'published' group by group_id
) e on e.group_id = g.id
left join public.profiles p on p.id = g.created_by;
