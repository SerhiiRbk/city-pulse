-- ============================================================
-- 034: Partial composite index for the events map (/events/map)
--
-- The map issues bbox queries of the form:
--   select ...
--     from events_with_counts
--    where status = 'published'
--      and is_private = false
--      and is_blocked = false
--      and is_online = false
--      and lat between :minLat and :maxLat
--      and lng between :minLng and :maxLng
--      and starts_at between :from and :to
--
-- A partial composite btree over (lat, lng, starts_at) tightly matches
-- this shape and stays small: only active, public, future, offline
-- events with real coordinates land in the index.
--
-- GIST on point(lng, lat) would be more natural for arbitrary spatial
-- queries, but for a per-city bbox with narrow lat range a plain btree
-- performs comparably and does not require PostGIS.
-- ============================================================

create index if not exists idx_events_map_geo
  on public.events (lat, lng, starts_at)
  where status = 'published'
    and is_private = false
    and is_blocked = false
    and is_online = false
    and lat is not null
    and lng is not null;

comment on index public.idx_events_map_geo
  is 'Partial composite index for the /events/map bbox + time-range query.';
