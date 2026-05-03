import { Suspense } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getEventsInBbox } from '@/lib/actions/events-map';
import { getInterestCategories } from '@/lib/actions/profile';
import { getUserProfile } from '@/lib/actions/auth';
import { getCityById } from '@/lib/actions/cities';
import { EventsMapLoader } from '@/components/events/events-map-loader';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { CalendarPlus, List, Map as MapIcon, Sparkles } from 'lucide-react';
import { buildPageMetadata } from '@/lib/seo';
import {
  DEFAULT_MAP_TIME_RANGE,
  isMapTimeRange,
  resolveMapTimeRange,
  type MapTimeRange,
} from '@/lib/events/time-ranges';
import type { Metadata } from 'next';
import type { Profile } from '@/types/database';

const DEFAULT_VIEWPORT = { lat: 50.0755, lng: 14.4378, zoom: 12 };

// Narrow latitude band around the viewport center for initial fetch so the
// first render shows only markers actually visible. Width roughly matches a
// typical desktop viewport at zoom 12.
const INITIAL_BBOX_DEG = 0.18;

function parseFloatParam(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

function parseIntParam(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * Build a URL that switches the view to /events with the current map filters
 * preserved: time range → date_from/date_to (YYYY-MM-DD), categories, free-only.
 */
function buildListHref(
  range: MapTimeRange,
  categoryIds: string[],
  isFreeOnly: boolean,
): string {
  const { from, to } = resolveMapTimeRange(range);
  const qs = new URLSearchParams();
  qs.set('date_from', from.toISOString().slice(0, 10));
  qs.set('date_to', to.toISOString().slice(0, 10));
  if (categoryIds.length > 0) qs.set('category', categoryIds.join(','));
  if (isFreeOnly) qs.set('is_free', 'true');
  const query = qs.toString();
  return query ? `/events?${query}` : '/events';
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: 'en' | 'ru' | 'uk' | 'cs' | 'de' }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const tMap = await getTranslations({ locale, namespace: 'events.map' });
  return buildPageMetadata({
    locale,
    path: '/events/map',
    title: tMap('pageTitle'),
    description: tMap('pageSubtitle'),
  });
}

export default async function EventsMapPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const filters = await searchParams;

  // Fallback viewport resolution:
  //   1. explicit lat/lng/zoom in URL (always wins)
  //   2. user profile city → cities.lat/lng
  //   3. Prague default
  // We load the profile once and hand it to MapHero so it doesn't re-fetch.
  const profile = await getUserProfile();
  const hasExplicitCenter =
    filters.lat !== undefined && filters.lng !== undefined;
  let fallbackCenter = DEFAULT_VIEWPORT;
  if (!hasExplicitCenter && profile?.city_id) {
    const city = await getCityById(profile.city_id);
    if (city?.lat && city?.lng) {
      fallbackCenter = { lat: city.lat, lng: city.lng, zoom: 12 };
    }
  }

  const viewport = {
    lat: parseFloatParam(filters.lat) ?? fallbackCenter.lat,
    lng: parseFloatParam(filters.lng) ?? fallbackCenter.lng,
    zoom: parseIntParam(filters.zoom) ?? fallbackCenter.zoom,
  };
  const range = isMapTimeRange(filters.range) ? filters.range : DEFAULT_MAP_TIME_RANGE;
  const categoryIds = filters.category
    ? filters.category.split(',').filter(Boolean)
    : [];
  const isFreeOnly = filters.is_free === 'true';

  return (
    <div>
      <MapHero
        profile={profile}
        range={range}
        categoryIds={categoryIds}
        isFreeOnly={isFreeOnly}
      />
      <section className="container mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <Suspense
          fallback={
            <div className="flex h-[600px] w-full items-center justify-center overflow-hidden rounded-2xl border bg-muted">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          }
        >
          <MapWithInitialData
            viewport={viewport}
            range={range}
            categoryIds={categoryIds}
            isFreeOnly={isFreeOnly}
          />
        </Suspense>
      </section>
    </div>
  );
}

async function MapHero({
  profile,
  range,
  categoryIds,
  isFreeOnly,
}: {
  profile: Profile | null;
  range: MapTimeRange;
  categoryIds: string[];
  isFreeOnly: boolean;
}) {
  const [t, tPage, tMap] = await Promise.all([
    getTranslations('events'),
    getTranslations('events.page'),
    getTranslations('events.map'),
  ]);

  const listHref = buildListHref(range, categoryIds, isFreeOnly);

  return (
    <section className="relative overflow-hidden bg-slate-950">
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1800&q=80')",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.14),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.22),transparent_30%)]"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-slate-950/75 via-slate-950/60 to-slate-950/92"
      />

      <div className="relative z-10 container mx-auto max-w-6xl px-4 pt-14 pb-10 sm:pt-20 sm:pb-14 md:pt-24">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur sm:text-sm">
              <Sparkles className="h-4 w-4" />
              {tMap('heroBadge')}
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white drop-shadow-lg sm:text-5xl md:text-6xl">
              {t('title')}
            </h1>
            <p className="mt-3 max-w-2xl text-base text-white/80 drop-shadow sm:text-lg">
              {tMap('pageSubtitle')}
            </p>
          </div>

          {profile && (
            <Button
              asChild
              size="lg"
              className="shrink-0 self-start rounded-full px-6 shadow-xl"
            >
              <Link href="/events/create" className="flex items-center gap-2">
                <CalendarPlus className="h-5 w-5" />
                {tPage('createCta')}
              </Link>
            </Button>
          )}
        </div>

        <div className="mt-6 inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 p-1 backdrop-blur">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="rounded-full text-white/90 hover:bg-white/10 hover:text-white"
          >
            <Link href={listHref} className="flex items-center gap-2">
              <List className="h-4 w-4" />
              {tMap('viewList')}
            </Link>
          </Button>
          <span className="rounded-full bg-white px-4 py-1.5 text-sm font-medium text-slate-900 shadow-sm">
            <span className="flex items-center gap-2">
              <MapIcon className="h-4 w-4" />
              {tMap('viewMap')}
            </span>
          </span>
        </div>
      </div>
    </section>
  );
}

async function MapWithInitialData({
  viewport,
  range,
  categoryIds,
  isFreeOnly,
}: {
  viewport: { lat: number; lng: number; zoom: number };
  range: MapTimeRange;
  categoryIds: string[];
  isFreeOnly: boolean;
}) {
  const halfLat = INITIAL_BBOX_DEG;
  const halfLng = INITIAL_BBOX_DEG * 1.6;
  const { from, to } = resolveMapTimeRange(range);

  const [initialMarkers, categories] = await Promise.all([
    getEventsInBbox({
      minLat: viewport.lat - halfLat,
      maxLat: viewport.lat + halfLat,
      minLng: viewport.lng - halfLng,
      maxLng: viewport.lng + halfLng,
      from: from.toISOString(),
      to: to.toISOString(),
      categoryIds: categoryIds.length > 0 ? categoryIds : undefined,
      isFreeOnly: isFreeOnly || undefined,
    }),
    getInterestCategories(),
  ]);

  return (
    <EventsMapLoader
      initialMarkers={initialMarkers}
      initialViewport={viewport}
      initialRange={range}
      initialCategoryIds={categoryIds}
      initialIsFreeOnly={isFreeOnly}
      categories={categories}
      className="grid h-[min(80vh,780px)] w-full grid-cols-1 overflow-hidden rounded-2xl border shadow-sm lg:grid-cols-[380px_1fr]"
    />
  );
}
