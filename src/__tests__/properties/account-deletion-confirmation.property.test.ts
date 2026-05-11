/**
 * Feature: account-deletion, Property 1: Confirmation word validation is locale-deterministic
 *
 * For any locale in {en, ru, uk, cs, de} and for any input string,
 * validateConfirmationWord returns true if and only if the input exactly matches
 * (case-sensitive) the expected confirmation word for that locale.
 * All other inputs return false.
 *
 * **Validates: Requirements 1.3, 1.4**
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  CONFIRMATION_WORDS,
  validateConfirmationWord,
} from '@/lib/deletion/confirmation';

const SUPPORTED_LOCALES = ['en', 'ru', 'uk', 'cs', 'de'] as const;

// Arbitrary for supported locales
const localeArb = fc.constantFrom(...SUPPORTED_LOCALES);

// Arbitrary for random unicode strings (including empty, whitespace, special chars)
const randomStringArb = fc.string({ minLength: 0, maxLength: 50 });

describe('Feature: account-deletion, Property 1: Confirmation word validation is locale-deterministic', () => {
  it('returns true when input exactly matches the confirmation word for the locale', () => {
    fc.assert(
      fc.property(localeArb, (locale) => {
        const expected = CONFIRMATION_WORDS[locale];
        const result = validateConfirmationWord(locale, expected);
        expect(result).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('returns false for any random string that is not the exact confirmation word', () => {
    fc.assert(
      fc.property(
        localeArb,
        randomStringArb,
        (locale, input) => {
          const expected = CONFIRMATION_WORDS[locale];
          const result = validateConfirmationWord(locale, input);
          if (input === expected) {
            expect(result).toBe(true);
          } else {
            expect(result).toBe(false);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('is case-sensitive: lowercase/uppercase variants of the confirmation word return false', () => {
    fc.assert(
      fc.property(localeArb, (locale) => {
        const expected = CONFIRMATION_WORDS[locale];
        // Test lowercase variant (if different from expected)
        const lower = expected.toLowerCase();
        if (lower !== expected) {
          expect(validateConfirmationWord(locale, lower)).toBe(false);
        }
        // Test with first char lowercased (if different from expected)
        const mixedCase = expected.charAt(0).toLowerCase() + expected.slice(1);
        if (mixedCase !== expected) {
          expect(validateConfirmationWord(locale, mixedCase)).toBe(false);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('returns false for unsupported locales regardless of input', () => {
    const unsupportedLocaleArb = fc.string({ minLength: 1, maxLength: 10 }).filter(
      (s) => !SUPPORTED_LOCALES.includes(s as (typeof SUPPORTED_LOCALES)[number]),
    );

    fc.assert(
      fc.property(
        unsupportedLocaleArb,
        randomStringArb,
        (locale, input) => {
          const result = validateConfirmationWord(locale, input);
          expect(result).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('validation is deterministic: same locale and input always produce the same result', () => {
    fc.assert(
      fc.property(
        localeArb,
        randomStringArb,
        (locale, input) => {
          const result1 = validateConfirmationWord(locale, input);
          const result2 = validateConfirmationWord(locale, input);
          expect(result1).toBe(result2);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns true if and only if input === CONFIRMATION_WORDS[locale]', () => {
    fc.assert(
      fc.property(
        localeArb,
        randomStringArb,
        (locale, input) => {
          const expected = CONFIRMATION_WORDS[locale];
          const result = validateConfirmationWord(locale, input);
          // The biconditional: result === true ↔ input === expected
          expect(result).toBe(input === expected);
        },
      ),
      { numRuns: 100 },
    );
  });
});
