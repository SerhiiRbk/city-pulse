import { describe, it, expect } from 'vitest';
import { isSentinelUser, resolveDisplayName } from '@/lib/deletion/display';
import { SENTINEL_UUID } from '@/lib/deletion/anonymize';

describe('deletion/display', () => {
  describe('isSentinelUser', () => {
    it('returns true for the sentinel UUID', () => {
      expect(isSentinelUser('00000000-0000-0000-0000-000000000000')).toBe(true);
    });

    it('returns false for a regular UUID', () => {
      expect(isSentinelUser('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBe(false);
    });

    it('returns false for an empty string', () => {
      expect(isSentinelUser('')).toBe(false);
    });
  });

  describe('resolveDisplayName', () => {
    it('returns locale-specific label for sentinel UUID in English', () => {
      expect(resolveDisplayName(SENTINEL_UUID, 'Deleted User', 'en')).toBe('Deleted User');
    });

    it('returns locale-specific label for sentinel UUID in Russian', () => {
      expect(resolveDisplayName(SENTINEL_UUID, 'Deleted User', 'ru')).toBe('Удалённый пользователь');
    });

    it('returns locale-specific label for sentinel UUID in Ukrainian', () => {
      expect(resolveDisplayName(SENTINEL_UUID, 'Deleted User', 'uk')).toBe('Видалений користувач');
    });

    it('returns locale-specific label for sentinel UUID in Czech', () => {
      expect(resolveDisplayName(SENTINEL_UUID, 'Deleted User', 'cs')).toBe('Smazaný uživatel');
    });

    it('returns locale-specific label for sentinel UUID in German', () => {
      expect(resolveDisplayName(SENTINEL_UUID, 'Deleted User', 'de')).toBe('Gelöschter Benutzer');
    });

    it('falls back to English for unsupported locale with sentinel UUID', () => {
      expect(resolveDisplayName(SENTINEL_UUID, 'Deleted User', 'fr')).toBe('Deleted User');
    });

    it('returns original display name for non-sentinel user', () => {
      const userId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
      expect(resolveDisplayName(userId, 'John Doe', 'en')).toBe('John Doe');
    });

    it('returns empty string for non-sentinel user with null display name', () => {
      const userId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
      expect(resolveDisplayName(userId, null, 'en')).toBe('');
    });
  });
});
