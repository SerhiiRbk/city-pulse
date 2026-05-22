/**
 * Shared list of supported cities used across the app (footer, city selector, etc.).
 * - `slug`: URL-friendly name used in routes and query params.
 * - `dbName`: Value stored in the database `city` column on events/groups.
 * - `labels`: Localized display names per UI locale.
 * - `image`: City cover photo URL for OG previews and city cards.
 */
export const SUPPORTED_CITIES: {
  slug: string;
  dbName: string;
  labels: Record<string, string>;
  image: string;
}[] = [
  { slug: 'Prague', dbName: 'Prague', labels: { en: 'Prague', ru: 'Прага', uk: 'Прага', cs: 'Praha', de: 'Prag', es: 'Praga' }, image: 'https://images.unsplash.com/photo-1541849546-216549ae216d?w=1200&q=80' },
  { slug: 'Brno', dbName: 'Brno', labels: { en: 'Brno', ru: 'Брно', uk: 'Брно', cs: 'Brno', de: 'Brünn', es: 'Brno' }, image: 'https://images.unsplash.com/photo-1678305671635-9cef0f009917?w=1200&q=80' },
  { slug: 'Vienna', dbName: 'Vienna', labels: { en: 'Vienna', ru: 'Вена', uk: 'Відень', cs: 'Vídeň', de: 'Wien', es: 'Viena' }, image: 'https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=1200&q=80' },
  { slug: 'Berlin', dbName: 'Berlin', labels: { en: 'Berlin', ru: 'Берлин', uk: 'Берлін', cs: 'Berlín', de: 'Berlin', es: 'Berlín' }, image: 'https://images.unsplash.com/photo-1560969184-10fe8719e047?w=1200&q=80' },
  { slug: 'Munich', dbName: 'Munich', labels: { en: 'Munich', ru: 'Мюнхен', uk: 'Мюнхен', cs: 'Mnichov', de: 'München', es: 'Múnich' }, image: 'https://images.unsplash.com/photo-1595867818082-083862f3d630?w=1200&q=80' },
  { slug: 'Warsaw', dbName: 'Warsaw', labels: { en: 'Warsaw', ru: 'Варшава', uk: 'Варшава', cs: 'Varšava', de: 'Warschau', es: 'Varsovia' }, image: 'https://images.unsplash.com/photo-1519197924294-4ba991a11128?w=1200&q=80' },
  { slug: 'Bratislava', dbName: 'Bratislava', labels: { en: 'Bratislava', ru: 'Братислава', uk: 'Братислава', cs: 'Bratislava', de: 'Bratislava', es: 'Bratislava' }, image: 'https://images.unsplash.com/photo-1602356862498-43139e75df4f?w=1200&q=80' },
  { slug: 'Budapest', dbName: 'Budapest', labels: { en: 'Budapest', ru: 'Будапешт', uk: 'Будапешт', cs: 'Budapešť', de: 'Budapest', es: 'Budapest' }, image: 'https://images.unsplash.com/photo-1551867633-194f125bddfa?w=1200&q=80' },
  { slug: 'Barcelona', dbName: 'Barcelona', labels: { en: 'Barcelona', ru: 'Барселона', uk: 'Барселона', cs: 'Barcelona', de: 'Barcelona', es: 'Barcelona' }, image: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=1200&q=80' },
  { slug: 'Valencia', dbName: 'Valencia', labels: { en: 'Valencia', ru: 'Валенсия', uk: 'Валенсія', cs: 'Valencie', de: 'Valencia', es: 'Valencia' }, image: 'https://images.unsplash.com/photo-1529551739587-e242c564f727?w=1200&q=80' },
  { slug: 'tel-aviv', dbName: 'Tel Aviv', labels: { en: 'Tel Aviv', ru: 'Тель-Авив', uk: 'Тель-Авів', cs: 'Tel Aviv', de: 'Tel Aviv', es: 'Tel Aviv' }, image: 'https://images.unsplash.com/photo-1544967082-d9d25d867d66?w=1200&q=80' },
  { slug: 'Ubud', dbName: 'Ubud', labels: { en: 'Ubud', ru: 'Убуд', uk: 'Убуд', cs: 'Ubud', de: 'Ubud', es: 'Ubud' }, image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1200&q=80' },
  { slug: 'Montevideo', dbName: 'Montevideo', labels: { en: 'Montevideo', ru: 'Монтевидео', uk: 'Монтевідео', cs: 'Montevideo', de: 'Montevideo', es: 'Montevideo' }, image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80' },
  { slug: 'Belgrade', dbName: 'Belgrade', labels: { en: 'Belgrade', ru: 'Белград', uk: 'Белград', cs: 'Bělehrad', de: 'Belgrad', es: 'Belgrado' }, image: 'https://images.unsplash.com/photo-1580137189272-c9379f8864fd?w=1200&q=80' },
];

/** Find a supported city by its slug (English name). */
export function findSupportedCity(slug: string | undefined | null) {
  if (!slug) return undefined;
  return SUPPORTED_CITIES.find(
    (c) => c.slug.toLowerCase() === slug.toLowerCase(),
  );
}

/** Check if a city name (from geo headers) matches any supported city. */
export function matchGeoCity(cityName: string | null | undefined) {
  if (!cityName) return undefined;
  const lower = cityName.toLowerCase();
  return SUPPORTED_CITIES.find(
    (c) =>
      c.slug.toLowerCase() === lower ||
      c.dbName.toLowerCase() === lower ||
      Object.values(c.labels).some((l) => l.toLowerCase() === lower),
  );
}
