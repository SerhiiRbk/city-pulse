/**
 * Property-based tests for account deletion locale utilities.
 *
 * Feature: account-deletion, Property 14: Email locale determination uses languages[0] with fallback
 *
 * **Validates: Requirements 11.2, 11.3, 11.5**
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

import {
  determineEmailLocale,
  SUPPORTED_LOCALES,
} from '@/lib/deletion/locale';

// ---------------------------------------------------------------------------
// Arbitrary generators
// ---------------------------------------------------------------------------

/** Generates a random supported locale string */
const supportedLocaleArb: fc.Arbitrary<string> = fc.constantFrom(...SUPPORTED_LOCALES);

/** Generates a random unsupported locale string (never matches a supported locale) */
const unsupportedLocaleArb: fc.Arbitrary<string> = fc
  .string({ minLength: 1, maxLength: 10 })
  .filter((s) => !(SUPPORTED_LOCALES as readonly string[]).includes(s));

/** Generates a random languages array that starts with a supported locale */
const languagesWithSupportedFirstArb: fc.Arbitrary<string[]> = fc
  .tuple(
    supportedLocaleArb,
    fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 0, maxLength: 5 }),
  )
  .map(([first, rest]) => [first, ...rest]);

/** Generates a random languages array that starts with an unsupported locale */
const languagesWithUnsupportedFirstArb: fc.Arbitrary<string[]> = fc
  .tuple(
    unsupportedLocaleArb,
    fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 0, maxLength: 5 }),
  )
  .map(([first, rest]) => [first, ...rest]);

/** Generates null or empty array */
const emptyOrNullLanguagesArb: fc.Arbitrary<string[] | null> = fc.oneof(
  fc.constant(null),
  fc.constant([] as string[]),
);

// ---------------------------------------------------------------------------
// Property 14: Email locale determination uses languages[0] with fallback
// ---------------------------------------------------------------------------

/**
 * Feature: account-deletion, Property 14: Email locale determination uses languages[0] with fallback
 *
 * For any profile, the email locale SHALL be determined as languages[0] if the
 * languages array is non-empty and the first element is a supported locale
 * (en, ru, uk, cs, de). Otherwise, the locale SHALL fall back to "en".
 *
 * **Validates: Requirements 11.2, 11.3, 11.5**
 */
describe('Feature: account-deletion, Property 14: Email locale determination uses languages[0] with fallback', () => {
  it('SHALL return languages[0] when the first element is a supported locale', () => {
    fc.assert(
      fc.property(languagesWithSupportedFirstArb, (languages) => {
        const result = determineEmailLocale(languages);

        // The result must equal languages[0]
        expect(result).toBe(languages[0]);

        // The result must be a supported locale
        expect(SUPPORTED_LOCALES).toContain(result);
      }),
      { numRuns: 100 },
    );
  });

  it('SHALL fall back to "en" when the first element is not a supported locale', () => {
    fc.assert(
      fc.property(languagesWithUnsupportedFirstArb, (languages) => {
        const result = determineEmailLocale(languages);

        expect(result).toBe('en');
      }),
      { numRuns: 100 },
    );
  });

  it('SHALL fall back to "en" when languages is null or empty', () => {
    fc.assert(
      fc.property(emptyOrNullLanguagesArb, (languages) => {
        const result = determineEmailLocale(languages);

        expect(result).toBe('en');
      }),
      { numRuns: 100 },
    );
  });

  it('SHALL only consider languages[0], ignoring subsequent elements', () => {
    fc.assert(
      fc.property(
        unsupportedLocaleArb,
        fc.array(supportedLocaleArb, { minLength: 1, maxLength: 5 }),
        (unsupported, supportedRest) => {
          // Even if subsequent elements are supported locales, only [0] matters
          const languages = [unsupported, ...supportedRest];
          const result = determineEmailLocale(languages);

          expect(result).toBe('en');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('SHALL always return a value from SUPPORTED_LOCALES', () => {
    // For any possible languages input, the result is always a supported locale
    const anyLanguagesArb: fc.Arbitrary<string[] | null> = fc.oneof(
      fc.constant(null),
      fc.constant([] as string[]),
      languagesWithSupportedFirstArb,
      languagesWithUnsupportedFirstArb,
    );

    fc.assert(
      fc.property(anyLanguagesArb, (languages) => {
        const result = determineEmailLocale(languages);

        expect(SUPPORTED_LOCALES).toContain(result);
      }),
      { numRuns: 100 },
    );
  });
});
