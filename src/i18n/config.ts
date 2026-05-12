export const locales = ['en', 'ru', 'uk', 'cs', 'de', 'es'] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export const localeNames: Record<Locale, string> = {
  en: 'English',
  ru: 'Русский',
  uk: 'Українська',
  cs: 'Čeština',
  de: 'Deutsch',
  es: 'Español',
};

export const localeFlags: Record<Locale, string> = {
  en: '🇬🇧',
  ru: '🇷🇺',
  uk: '🇺🇦',
  cs: '🇨🇿',
  de: '🇩🇪',
  es: '🇪🇸',
};
