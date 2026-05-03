import { SITE_NAME, SITE_URL } from './constants';

export function generateEventJsonLd(event: {
  id: string;
  title: string;
  description: string;
  starts_at: string;
  duration_minutes: number;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  lat?: number | null;
  lng?: number | null;
  is_online: boolean;
  is_free: boolean;
  price?: number | null;
  currency?: string | null;
  photos?: string[];
  organizer_name?: string | null;
  max_attendees?: number | null;
}) {
  const startDate = new Date(event.starts_at);
  const endDate = new Date(startDate.getTime() + event.duration_minutes * 60 * 1000);

  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: event.description?.slice(0, 500),
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: event.is_online
      ? 'https://schema.org/OnlineEventAttendanceMode'
      : 'https://schema.org/OfflineEventAttendanceMode',
    location: event.is_online
      ? { '@type': 'VirtualLocation', url: `${SITE_URL}/events/${event.id}` }
      : {
          '@type': 'Place',
          name: event.address || event.city || 'TBD',
          address: {
            '@type': 'PostalAddress',
            addressLocality: event.city,
            addressCountry: event.country,
            streetAddress: event.address,
          },
          ...(event.lat && event.lng
            ? { geo: { '@type': 'GeoCoordinates', latitude: event.lat, longitude: event.lng } }
            : {}),
        },
    image: event.photos?.[0] || undefined,
    organizer: {
      '@type': 'Person',
      name: event.organizer_name || 'Unknown',
    },
    offers: event.is_free
      ? { '@type': 'Offer', price: '0', priceCurrency: 'EUR', availability: 'https://schema.org/InStock' }
      : event.price
        ? { '@type': 'Offer', price: String(event.price), priceCurrency: event.currency || 'EUR', availability: 'https://schema.org/InStock' }
        : undefined,
    // schema.org `maximumAttendeeCapacity` is the venue/event capacity, not
    // the current RSVP count. We emit it only when the organizer set a real
    // ceiling (`max_attendees`). Otherwise we omit the field to keep the
    // structured data semantically valid for Google rich results.
    ...(event.max_attendees ? { maximumAttendeeCapacity: event.max_attendees } : {}),
  };
}

export function generateOrganizationJsonLd(input?: { description?: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    description:
      input?.description ?? 'Social platform for offline communities of expats and locals',
    sameAs: [],
  };
}

/**
 * `WebSite` + `SearchAction` powers the Google sitelinks search box. The
 * target URL must be a working `q=` endpoint — `/events?q=` is wired into
 * Postgres FTS via `getEvents` / `events.search_tsv`.
 */
export function generateWebSiteJsonLd(input: { locale: string; description?: string }) {
  const baseUrl = `${SITE_URL}/${input.locale}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: baseUrl,
    description:
      input.description ?? 'Social platform for offline communities of expats and locals',
    inLanguage: input.locale,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/events?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export type BreadcrumbItem = {
  name: string;
  /** Absolute or path-relative URL. Path-relative gets prefixed with SITE_URL. */
  url: string;
};

export function generateBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${SITE_URL}${item.url}`,
    })),
  };
}

/**
 * Treat user-managed groups as `Organization` with optional address. Avoids
 * `Group` (which schema.org defines for AudienceType, not communities).
 */
export function generateGroupJsonLd(group: {
  id: string;
  name: string;
  description?: string | null;
  cover_url?: string | null;
  city?: string | null;
  country?: string | null;
  member_count?: number | null;
  localePath: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: group.name,
    description: group.description?.slice(0, 500) || undefined,
    image: group.cover_url || undefined,
    url: `${SITE_URL}${group.localePath}`,
    ...(group.city
      ? {
          address: {
            '@type': 'PostalAddress',
            addressLocality: group.city,
            addressCountry: group.country || undefined,
          },
        }
      : {}),
    ...(group.member_count
      ? {
          numberOfEmployees: undefined,
          member: { '@type': 'OrganizationRole', numberOfItems: group.member_count },
        }
      : {}),
  };
}

export function generateProfileJsonLd(profile: {
  display_name: string;
  bio?: string | null;
  city?: string | null;
  country?: string | null;
  avatar_url?: string | null;
  id: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profile.display_name,
    description: profile.bio?.slice(0, 200) || undefined,
    image: profile.avatar_url || undefined,
    url: `${SITE_URL}/profile/${profile.id}`,
    ...(profile.city
      ? { address: { '@type': 'PostalAddress', addressLocality: profile.city, addressCountry: profile.country } }
      : {}),
  };
}

export function generateArticleJsonLd(article: {
  id: string;
  title: string;
  content: string;
  published_at: string;
  updated_at?: string;
  image?: string | null;
  author_name?: string | null;
  localePath: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.content?.slice(0, 200),
    image: article.image || undefined,
    datePublished: article.published_at,
    dateModified: article.updated_at || article.published_at,
    author: {
      '@type': 'Person',
      name: article.author_name || 'Unknown',
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
    mainEntityOfPage: `${SITE_URL}${article.localePath}`,
  };
}
