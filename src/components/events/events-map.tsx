'use client';

import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import { useLocale, useTranslations } from 'next-intl';
import { fetchEventsInBbox } from '@/lib/actions/events-map-server';
import type { EventsMapMarker } from '@/lib/actions/events-map';
import {
  MAP_TIME_RANGES,
  resolveMapTimeRange,
  type MapTimeRange,
} from '@/lib/events/time-ranges';
import {
  categoryColor,
  categoryHalo,
  dominantCategoryId,
} from '@/lib/events/category-colors';
import { EventsMapSidebar } from './events-map-sidebar';
import { CategoryPickerPopover } from './category-picker-popover';
import { STADIA_ATTRIBUTION, buildStadiaTileUrl } from '@/lib/maps/stadia';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import type { InterestCategory } from '@/types/database';
import { Layers, Loader2, LocateFixed, MapPin, Share2 } from 'lucide-react';
import { toast } from 'sonner';

type Viewport = { lat: number; lng: number; zoom: number };

type EventsMapProps = {
  initialMarkers: EventsMapMarker[];
  initialViewport: Viewport;
  initialRange: MapTimeRange;
  initialCategoryIds?: string[];
  initialIsFreeOnly?: boolean;
  categories: InterestCategory[];
  className?: string;
};


function buildMarkerIcon(color: string, hovered: boolean): L.DivIcon {
  const size = hovered ? 34 : 28;
  const html = `
    <div class="cp-marker" style="--cp-color:${color}">
      <div class="cp-marker-pulse"></div>
      <div class="cp-marker-dot"></div>
    </div>
  `;
  return L.divIcon({
    className: `cp-marker-icon${hovered ? ' cp-marker-icon-hovered' : ''}`,
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function buildClusterIcon(cluster: L.MarkerCluster): L.DivIcon {
  // MarkerClusterGroup does not pass our payload to the factory; we stash
  // the events[] array on each marker's options and read it back here.
  const children = cluster.getAllChildMarkers() as Array<
    L.Marker & { options: { cpEvent?: EventsMapMarker } }
  >;
  const events = children
    .map((m) => m.options.cpEvent)
    .filter((e): e is EventsMapMarker => !!e);
  const dom = dominantCategoryId(events);
  const color = categoryColor(dom);
  const halo = categoryHalo(dom);
  const count = cluster.getChildCount();
  const size = count < 10 ? 40 : count < 50 ? 48 : 56;
  const html = `
    <div class="cp-cluster" style="--cp-color:${color}; --cp-halo:${halo}">
      <div class="cp-cluster-halo"></div>
      <div class="cp-cluster-core">${count}</div>
    </div>
  `;
  return L.divIcon({
    html,
    className: 'cp-cluster-icon',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function syncUrl(
  viewport: Viewport,
  range: MapTimeRange,
  filters: { categoryIds: string[]; isFreeOnly: boolean },
) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.set('lat', viewport.lat.toFixed(5));
  url.searchParams.set('lng', viewport.lng.toFixed(5));
  url.searchParams.set('zoom', String(viewport.zoom));
  url.searchParams.set('range', range);

  if (filters.categoryIds.length > 0) {
    url.searchParams.set('category', filters.categoryIds.join(','));
  } else {
    url.searchParams.delete('category');
  }
  if (filters.isFreeOnly) url.searchParams.set('is_free', 'true');
  else url.searchParams.delete('is_free');

  window.history.replaceState(null, '', url.toString());
}

export function EventsMap({
  initialMarkers,
  initialViewport,
  initialRange,
  initialCategoryIds = [],
  initialIsFreeOnly = false,
  categories,
  className,
}: EventsMapProps) {
  const t = useTranslations('events.map');
  const tFilters = useTranslations('events.filters');
  const locale = useLocale();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const userLayerRef = useRef<L.LayerGroup | null>(null);
  const markerByIdRef = useRef<Map<string, L.Marker>>(new Map());
  const rangeRef = useRef<MapTimeRange>(initialRange);
  const categoryIdsRef = useRef<string[]>(initialCategoryIds);
  const isFreeOnlyRef = useRef<boolean>(initialIsFreeOnly);
  const hoveredIdRef = useRef<string | null>(null);

  const [range, setRange] = useState<MapTimeRange>(initialRange);
  const [categoryIds, setCategoryIds] = useState<string[]>(initialCategoryIds);
  const [isFreeOnly, setIsFreeOnly] = useState<boolean>(initialIsFreeOnly);
  const [markers, setMarkers] = useState<EventsMapMarker[]>(initialMarkers);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [geoError, setGeoError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    [locale],
  );

  const refetch = useCallback((map: L.Map) => {
    const bounds = map.getBounds();
    const { from, to } = resolveMapTimeRange(rangeRef.current);
    const params = {
      minLat: bounds.getSouth(),
      maxLat: bounds.getNorth(),
      minLng: bounds.getWest(),
      maxLng: bounds.getEast(),
      from: from.toISOString(),
      to: to.toISOString(),
      categoryIds: categoryIdsRef.current.length > 0 ? categoryIdsRef.current : undefined,
      isFreeOnly: isFreeOnlyRef.current || undefined,
    };
    startTransition(async () => {
      const next = await fetchEventsInBbox(params);
      setMarkers(next);
    });
  }, []);

  // Init map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true,
      worldCopyJump: true,
    }).setView([initialViewport.lat, initialViewport.lng], initialViewport.zoom);

    L.tileLayer(buildStadiaTileUrl(), {
      attribution: STADIA_ATTRIBUTION,
      maxZoom: 20,
    }).addTo(map);

    const clusters = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 55,
      spiderfyOnMaxZoom: true,
      disableClusteringAtZoom: 17,
      iconCreateFunction: buildClusterIcon,
    });
    clusters.addTo(map);
    clusterGroupRef.current = clusters;

    userLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    let moveTimer: ReturnType<typeof setTimeout> | null = null;
    const onMoveEnd = () => {
      const center = map.getCenter();
      const nextViewport: Viewport = {
        lat: center.lat,
        lng: center.lng,
        zoom: map.getZoom(),
      };
      syncUrl(nextViewport, rangeRef.current, {
        categoryIds: categoryIdsRef.current,
        isFreeOnly: isFreeOnlyRef.current,
      });
      if (moveTimer) clearTimeout(moveTimer);
      moveTimer = setTimeout(() => refetch(map), 250);
    };
    map.on('moveend', onMoveEnd);
    map.on('zoomend', onMoveEnd);

    return () => {
      if (moveTimer) clearTimeout(moveTimer);
      map.off('moveend', onMoveEnd);
      map.off('zoomend', onMoveEnd);
      map.remove();
      mapRef.current = null;
      clusterGroupRef.current = null;
      userLayerRef.current = null;
      markerByIdRef.current.clear();
    };
  }, [initialViewport.lat, initialViewport.lng, initialViewport.zoom, refetch]);

  // Redraw markers whenever the list changes — uses MarkerClusterGroup
  // which handles real clustering and declustering on zoom for us.
  useEffect(() => {
    const group = clusterGroupRef.current;
    if (!group) return;

    group.clearLayers();
    markerByIdRef.current.clear();

    const layers: L.Marker[] = [];
    for (const event of markers) {
      const color = categoryColor(event.category_id);
      const leafletMarker = L.marker([event.lat, event.lng], {
        icon: buildMarkerIcon(color, false),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        cpEvent: event,
      } as L.MarkerOptions & { cpEvent: EventsMapMarker });

      const popupHtml = buildPopupHtml({
        event,
        locale,
        dateFormatter,
      });
      leafletMarker.bindPopup(popupHtml, {
        maxWidth: 280,
        minWidth: 220,
        className: 'cp-popup',
      });

      leafletMarker.on('mouseover', () => {
        hoveredIdRef.current = event.id;
        setHoveredId(event.id);
      });
      leafletMarker.on('mouseout', () => {
        if (hoveredIdRef.current === event.id) {
          hoveredIdRef.current = null;
          setHoveredId(null);
        }
      });

      layers.push(leafletMarker);
      markerByIdRef.current.set(event.id, leafletMarker);
    }

    group.addLayers(layers);
  }, [markers, locale, dateFormatter]);

  // Visual hover highlighting — swap icon for the currently hovered marker.
  useEffect(() => {
    const map = markerByIdRef.current;
    map.forEach((marker, id) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const evt = (marker.options as any).cpEvent as EventsMapMarker | undefined;
      const color = categoryColor(evt?.category_id);
      marker.setIcon(buildMarkerIcon(color, id === hoveredId));
    });
  }, [hoveredId]);

  function handleSelectRange(next: MapTimeRange) {
    if (next === range) return;
    setRange(next);
    rangeRef.current = next;
    pushUrlAndRefetch();
  }

  function handleToggleFreeOnly() {
    const next = !isFreeOnly;
    setIsFreeOnly(next);
    isFreeOnlyRef.current = next;
    pushUrlAndRefetch();
  }

  function handleSetCategoryIds(next: string[]) {
    setCategoryIds(next);
    categoryIdsRef.current = next;
    pushUrlAndRefetch();
  }

  function handleToggleCategory(id: string) {
    const current = new Set(categoryIdsRef.current);
    if (current.has(id)) current.delete(id);
    else current.add(id);
    handleSetCategoryIds([...current]);
  }

  function pushUrlAndRefetch() {
    const map = mapRef.current;
    if (!map) return;
    const center = map.getCenter();
    syncUrl(
      { lat: center.lat, lng: center.lng, zoom: map.getZoom() },
      rangeRef.current,
      {
        categoryIds: categoryIdsRef.current,
        isFreeOnly: isFreeOnlyRef.current,
      },
    );
    refetch(map);
  }

  function handleLocate() {
    const map = mapRef.current;
    if (!map) return;
    if (!('geolocation' in navigator)) {
      setGeoError(t('geoUnsupported'));
      return;
    }
    setGeoError(null);
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        map.setView([latitude, longitude], Math.max(map.getZoom(), 14));

        const layer = userLayerRef.current;
        if (layer) {
          layer.clearLayers();
          L.circleMarker([latitude, longitude], {
            radius: 8,
            color: '#0f172a',
            weight: 2,
            fillColor: '#38bdf8',
            fillOpacity: 0.85,
          })
            .bindTooltip(t('youAreHere'), { direction: 'top', offset: [0, -10] })
            .addTo(layer);
        }
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? t('geoDenied')
            : t('geoFailed'),
        );
      },
      { enableHighAccuracy: false, timeout: 7000, maximumAge: 60_000 },
    );
  }

  async function handleShare() {
    if (typeof window === 'undefined') return;
    const url = window.location.href;
    // Prefer the native share-sheet on touch devices, fall back to clipboard.
    const canWebShare =
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function' &&
      /mobi|tablet|ipad|iphone/i.test(navigator.userAgent);
    try {
      if (canWebShare) {
        await navigator.share({ title: document.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success(t('linkCopied'));
    } catch {
      // User cancelled the share sheet or clipboard write is unavailable.
      // Surface only the clipboard failure — ignoring share aborts is fine.
      if (!canWebShare) toast.error(t('linkCopyFailed'));
    }
  }

  // Handle hover coming from the sidebar — center-pan to the marker and open popup.
  function handleSidebarHover(id: string | null) {
    hoveredIdRef.current = id;
    setHoveredId(id);
  }

  function handleSidebarSelect(id: string) {
    const map = mapRef.current;
    const marker = markerByIdRef.current.get(id);
    if (map && marker) {
      const group = clusterGroupRef.current;
      if (group) group.zoomToShowLayer(marker, () => marker.openPopup());
      else marker.openPopup();
    }
    setMobileSheetOpen(false);
  }

  return (
    <div
      className={
        className ??
        'grid h-[min(80vh,780px)] w-full grid-cols-1 overflow-hidden rounded-2xl border shadow-sm lg:grid-cols-[380px_1fr]'
      }
    >
      <EventsMapSidebar
        markers={markers}
        hoveredId={hoveredId}
        selectedCategoryIds={categoryIds}
        onHover={handleSidebarHover}
        onSelect={handleSidebarSelect}
        onToggleCategory={handleToggleCategory}
        className="hidden flex-col border-r bg-card lg:flex"
      />

      <div className="relative h-full w-full">
        <div ref={containerRef} className="h-full w-full" />

        {/* Controls overlay — time range + filter chips */}
        <div className="pointer-events-none absolute inset-x-0 top-3 z-[500] flex flex-col items-center gap-2 px-3 sm:top-4">
          <div
            className="pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-border/60 bg-background/95 p-1 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/85"
            role="tablist"
            aria-label={t('rangeLabel')}
          >
            {MAP_TIME_RANGES.map((key) => {
              const active = range === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => handleSelectRange(key)}
                  className={
                    'shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm ' +
                    (active
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-foreground/70 hover:bg-muted hover:text-foreground')
                  }
                >
                  {t(`range.${key}`)}
                </button>
              );
            })}
          </div>

          <div className="pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-1.5">
            <CategoryPickerPopover
              categories={categories}
              selectedIds={categoryIds}
              onChange={handleSetCategoryIds}
            />
            <button
              type="button"
              onClick={handleToggleFreeOnly}
              className={
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur transition-colors sm:text-sm ' +
                (isFreeOnly
                  ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-900 dark:text-emerald-100'
                  : 'border-border/60 bg-background/95 hover:bg-muted')
              }
              aria-pressed={isFreeOnly}
            >
              {isFreeOnly ? tFilters('free') : t('showFreeOnly')}
              {isFreeOnly && (
                <span aria-hidden className="text-base leading-none">&times;</span>
              )}
            </button>
          </div>
        </div>

        {/* Locate control — bottom right */}
        <div className="pointer-events-none absolute bottom-4 right-4 z-[500] flex flex-col items-end gap-2">
          {geoError && (
            <div className="pointer-events-auto max-w-xs rounded-xl border bg-background/95 px-3 py-2 text-xs text-muted-foreground shadow-lg backdrop-blur">
              {geoError}
            </div>
          )}
          <div className="pointer-events-auto flex flex-col items-end gap-2 rounded-full border border-border/60 bg-background/95 p-1 shadow-lg backdrop-blur">
            <button
              type="button"
              onClick={handleShare}
              className="flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted"
              aria-label={t('shareLink')}
              title={t('shareLink')}
            >
              <Share2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleLocate}
              disabled={isLocating}
              className="flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted disabled:opacity-60"
              aria-label={t('locate')}
              title={t('locate')}
            >
              {isLocating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LocateFixed className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile bottom-sheet trigger — shows on < lg */}
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-[500] flex justify-center px-4 lg:hidden">
          <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/95 px-4 py-2.5 text-sm font-medium shadow-lg backdrop-blur hover:bg-muted"
              >
                <Layers className="h-4 w-4" />
                {markers.length === 0
                  ? t('sidebarEmpty')
                  : t('sidebarCount', { count: markers.length })}
              </button>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="flex h-[80vh] flex-col p-0 sm:max-w-none"
            >
              <SheetHeader className="sr-only">
                <SheetTitle>{t('sidebarTitle')}</SheetTitle>
              </SheetHeader>
              <EventsMapSidebar
                markers={markers}
                hoveredId={hoveredId}
                selectedCategoryIds={categoryIds}
                onHover={handleSidebarHover}
                onSelect={handleSidebarSelect}
                onToggleCategory={handleToggleCategory}
                className="flex h-full flex-col bg-background"
              />
            </SheetContent>
          </Sheet>
        </div>

        {markers.length === 0 && !isPending && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="pointer-events-auto flex max-w-sm flex-col items-center gap-2 rounded-2xl border bg-background/95 px-6 py-5 text-center shadow-xl backdrop-blur">
              <MapPin className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm font-medium">{t('empty')}</p>
              <p className="text-xs text-muted-foreground">{t('emptyHint')}</p>
            </div>
          </div>
        )}

        {isPending && (
          <div className="pointer-events-none absolute left-1/2 top-20 z-[400] -translate-x-1/2 rounded-full bg-background/95 px-4 py-2 text-xs font-medium shadow-lg backdrop-blur">
            <span className="flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t('loading')}
            </span>
          </div>
        )}
      </div>

      <style jsx global>{`
        .cp-marker-icon {
          background: transparent;
          border: none;
        }
        .cp-marker {
          position: relative;
          width: 100%;
          height: 100%;
        }
        .cp-marker-dot {
          position: absolute;
          inset: 20%;
          background: var(--cp-color, rgb(59 130 246));
          border-radius: 999px;
          box-shadow:
            0 0 0 2px #fff,
            0 4px 10px rgba(15, 23, 42, 0.28);
          transition: inset 0.15s ease;
        }
        .cp-marker-icon-hovered .cp-marker-dot {
          inset: 12%;
          box-shadow:
            0 0 0 3px #fff,
            0 6px 14px rgba(15, 23, 42, 0.4);
        }
        .cp-marker-pulse {
          position: absolute;
          inset: 10%;
          border-radius: 999px;
          background: var(--cp-color, rgb(59 130 246));
          opacity: 0.35;
          animation: cp-pulse 2.2s ease-out infinite;
        }
        @keyframes cp-pulse {
          0% { transform: scale(0.9); opacity: 0.45; }
          70% { transform: scale(1.7); opacity: 0; }
          100% { transform: scale(1.7); opacity: 0; }
        }

        /* Cluster badge */
        .cp-cluster-icon {
          background: transparent;
          border: none;
        }
        .cp-cluster {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .cp-cluster-halo {
          position: absolute;
          inset: 0;
          background: var(--cp-halo, rgba(59, 130, 246, 0.3));
          border-radius: 999px;
          opacity: 0.7;
        }
        .cp-cluster-core {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 58%;
          min-height: 58%;
          padding: 0 6px;
          background: var(--cp-color, rgb(59 130 246));
          color: #fff;
          font-size: 13px;
          font-weight: 700;
          border-radius: 999px;
          box-shadow:
            0 0 0 3px #fff,
            0 8px 18px rgba(15, 23, 42, 0.25);
        }

        /* Override default MarkerCluster styles so our custom ones win */
        .leaflet-cluster-anim .leaflet-marker-icon,
        .leaflet-cluster-anim .leaflet-marker-shadow {
          transition: transform 0.25s ease-out, opacity 0.25s ease-in;
        }

        /* Popup */
        .cp-popup .leaflet-popup-content-wrapper {
          border-radius: 14px;
          padding: 0;
          overflow: hidden;
        }
        .cp-popup .leaflet-popup-content {
          margin: 0;
          width: auto !important;
        }
        .cp-popup-body {
          padding: 14px 14px 12px;
          font-family: inherit;
        }
        .cp-popup-title {
          font-size: 14px;
          font-weight: 600;
          line-height: 1.25;
          color: rgb(15 23 42);
          text-decoration: none;
          display: block;
        }
        .cp-popup-title:hover {
          color: rgb(59 130 246);
        }
        .cp-popup-meta {
          margin-top: 4px;
          font-size: 12px;
          color: rgb(100 116 139);
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
      `}</style>
    </div>
  );
}

function buildPopupHtml(args: {
  event: EventsMapMarker;
  locale: string;
  dateFormatter: Intl.DateTimeFormat;
}): string {
  const { event } = args;
  const href = `/${args.locale}/events/${event.id}`;
  const title = escapeHtml(event.title);
  const when = args.dateFormatter.format(new Date(event.starts_at));
  const city = event.city ? escapeHtml(event.city) : '';
  const attendees = event.going_count
    ? `· ${escapeHtml(String(event.going_count))}`
    : '';
  return `
    <div class="cp-popup-body">
      <a class="cp-popup-title" href="${href}">${title}</a>
      <div class="cp-popup-meta">
        <span>${escapeHtml(when)}</span>
        ${city ? `<span>· ${city}</span>` : ''}
        ${attendees}
      </div>
    </div>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
