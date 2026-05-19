/**
 * Shared list of supported cities used across the app (footer, city selector, etc.).
 * - `slug`: English name used in URLs and query params.
 * - `dbName`: Value stored in the database `city` column on events/groups.
 * - `labels`: Localized display names per UI locale.
 */
export const SUPPORTED_CITIES: {
  slug: string;
  dbName: string;
  labels: Record<string, string>;
}[] = [
  { slug: 'Prague', dbName: 'Prague', labels: { en: 'Prague', ru: 'Прага', uk: 'Прага', cs: 'Praha', de: 'Prag', es: 'Praga' } },
  { slug: 'Brno', dbName: 'Brno', labels: { en: 'Brno', ru: 'Брно', uk: 'Брно', cs: 'Brno', de: 'Brünn', es: 'Brno' } },
  { slug: 'Vienna', dbName: 'Vienna', labels: { en: 'Vienna', ru: 'Вена', uk: 'Відень', cs: 'Vídeň', de: 'Wien', es: 'Viena' } },
  { slug: 'Berlin', dbName: 'Berlin', labels: { en: 'Berlin', ru: 'Берлин', uk: 'Берлін', cs: 'Berlín', de: 'Berlin', es: 'Berlín' } },
  { slug: 'Munich', dbName: 'Munich', labels: { en: 'Munich', ru: 'Мюнхен', uk: 'Мюнхен', cs: 'Mnichov', de: 'München', es: 'Múnich' } },
  { slug: 'Warsaw', dbName: 'Warsaw', labels: { en: 'Warsaw', ru: 'Варшава', uk: 'Варшава', cs: 'Varšava', de: 'Warschau', es: 'Varsovia' } },
  { slug: 'Bratislava', dbName: 'Bratislava', labels: { en: 'Bratislava', ru: 'Братислава', uk: 'Братислава', cs: 'Bratislava', de: 'Bratislava', es: 'Bratislava' } },
  { slug: 'Budapest', dbName: 'Budapest', labels: { en: 'Budapest', ru: 'Будапешт', uk: 'Будапешт', cs: 'Budapešť', de: 'Budapest', es: 'Budapest' } },
  { slug: 'Barcelona', dbName: 'Barcelona', labels: { en: 'Barcelona', ru: 'Барселона', uk: 'Барселона', cs: 'Barcelona', de: 'Barcelona', es: 'Barcelona' } },
  { slug: 'Valencia', dbName: 'Valencia', labels: { en: 'Valencia', ru: 'Валенсия', uk: 'Валенсія', cs: 'Valencie', de: 'Valencia', es: 'Valencia' } },
  { slug: 'Tel Aviv', dbName: 'Tel Aviv', labels: { en: 'Tel Aviv', ru: 'Тель-Авив', uk: 'Тель-Авів', cs: 'Tel Aviv', de: 'Tel Aviv', es: 'Tel Aviv' } },
  { slug: 'Ubud', dbName: 'Ubud', labels: { en: 'Ubud', ru: 'Убуд', uk: 'Убуд', cs: 'Ubud', de: 'Ubud', es: 'Ubud' } },
  { slug: 'Montevideo', dbName: 'Montevideo', labels: { en: 'Montevideo', ru: 'Монтевидео', uk: 'Монтевідео', cs: 'Montevideo', de: 'Montevideo', es: 'Montevideo' } },
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
