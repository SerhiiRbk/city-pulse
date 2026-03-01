export const locales = ['en', 'ru', 'uk', 'cs', 'de'] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export const localeNames: Record<Locale, string> = {
  en: 'English',
  ru: 'Русский',
  uk: 'Українська',
  cs: 'Čeština',
  de: 'Deutsch',
};

export const localeFlags: Record<Locale, string> = {
  en: '🇬🇧',
  ru: '🇷🇺',
  uk: '🇺🇦',
  cs: '🇨🇿',
  de: '🇩🇪',
};
