-- Harden function search_path and replace overly broad system policies

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.search_cities(query text, country_filter text default null)
returns setof public.cities
language sql
stable
set search_path = ''
as $$
  select c.*
  from public.cities c
  where (
    c.name ilike '%' || query || '%'
    or exists (
      select 1
      from jsonb_each_text(c.translations) as t(lang, val)
      where val ilike '%' || query || '%'
    )
  )
    and (country_filter is null or c.country = country_filter)
  order by
    case
      when lower(c.name) = lower(query) then 0
      when lower(c.name) like lower(query) || '%' then 1
      else 2
    end,
    c.name
  limit 10;
$$;

drop policy if exists "System can insert logs" on public.activity_logs;

drop policy if exists "System can insert analytics" on public.analytics_events;
create policy "Users can insert own analytics"
  on public.analytics_events for insert
  with check (
    auth.role() in ('anon', 'authenticated')
    and (user_id is null or auth.uid() = user_id)
  );

drop policy if exists "System can upsert stats" on public.daily_stats;
drop policy if exists "System can update stats" on public.daily_stats;

drop policy if exists "System can create notifications" on public.notifications;

drop policy if exists "System can award badges" on public.user_badges;
create policy "Admins can award badges"
  on public.user_badges for insert
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );
