/**
 * Unit tests for src/lib/deletion/locale.ts
 *
 * Tests email locale determination and anonymized user label resolution.
 *
 * Requirements: 11.2, 11.3, 11.4, 11.5
 */
import { describe, it, expect } from 'vitest';

import {
  determineEmailLocale,
  getAnonymizedUserLabel,
  ANONYMIZED_USER_LABELS,
  SUPPORTED_LOCALES,
} from '@/lib/deletion/locale';

// ===========================================================================
// determineEmailLocale
// Validates: Requirements 11.2, 11.3, 11.5
// ===========================================================================

describe('determineEmailLocale', () => {
  it('returns "en" when languages is null', () => {
    expect(determineEmailLocale(null)).toBe('en');
  });

  it('returns "en" when languages is an empty array', () => {
    expect(determineEmailLocale([])).toBe('en');
  });

  it('returns languages[0] when it is a supported locale', () => {
    expect(determineEmailLocale(['ru', 'en'])).toBe('ru');
    expect(determineEmailLocale(['uk'])).toBe('uk');
    expect(determineEmailLocale(['cs', 'de'])).toBe('cs');
    expect(determineEmailLocale(['de'])).toBe('de');
    expect(determineEmailLocale(['en'])).toBe('en');
  });

  it('returns "en" when languages[0] is not a supported locale', () => {
    expect(determineEmailLocale(['fr', 'en'])).toBe('en');
    expect(determineEmailLocale(['es'])).toBe('en');
    expect(determineEmailLocale(['ja', 'ru'])).toBe('en');
  });

  it('only checks languages[0], ignores subsequent entries', () => {
    expect(determineEmailLocale(['fr', 'ru', 'de'])).toBe('en');
  });
});

// ===========================================================================
// ANONYMIZED_USER_LABELS
// Validates: Requirement 11.4
// ===========================================================================

describe('ANONYMIZED_USER_LABELS', () => {
  it('contains all supported locales', () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(ANONYMIZED_USER_LABELS[locale]).toBeDefined();
    }
  });

  it('has correct label values', () => {
    expect(ANONYMIZED_USER_LABELS.en).toBe('Deleted User');
    expect(ANONYMIZED_USER_LABELS.ru).toBe('Удалённый пользователь');
    expect(ANONYMIZED_USER_LABELS.uk).toBe('Видалений користувач');
    expect(ANONYMIZED_USER_LABELS.cs).toBe('Smazaný uživatel');
    expect(ANONYMIZED_USER_LABELS.de).toBe('Gelöschter Benutzer');
  });
});

// ===========================================================================
// getAnonymizedUserLabel
// Validates: Requirement 11.4
// ===========================================================================

describe('getAnonymizedUserLabel', () => {
  it('returns the correct label for each supported locale', () => {
    expect(getAnonymizedUserLabel('en')).toBe('Deleted User');
    expect(getAnonymizedUserLabel('ru')).toBe('Удалённый пользователь');
    expect(getAnonymizedUserLabel('uk')).toBe('Видалений користувач');
    expect(getAnonymizedUserLabel('cs')).toBe('Smazaný uživatel');
    expect(getAnonymizedUserLabel('de')).toBe('Gelöschter Benutzer');
  });

  it('falls back to "Deleted User" for unsupported locales', () => {
    expect(getAnonymizedUserLabel('fr')).toBe('Deleted User');
    expect(getAnonymizedUserLabel('es')).toBe('Deleted User');
    expect(getAnonymizedUserLabel('ja')).toBe('Deleted User');
    expect(getAnonymizedUserLabel('')).toBe('Deleted User');
  });
});
