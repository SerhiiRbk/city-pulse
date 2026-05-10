import { describe, it, expect } from 'vitest';
import { CONFIRMATION_WORDS, validateConfirmationWord } from './confirmation';

describe('CONFIRMATION_WORDS', () => {
  it('contains all 5 supported locales', () => {
    expect(Object.keys(CONFIRMATION_WORDS)).toHaveLength(5);
    expect(CONFIRMATION_WORDS).toHaveProperty('en', 'DELETE');
    expect(CONFIRMATION_WORDS).toHaveProperty('ru', 'УДАЛИТЬ');
    expect(CONFIRMATION_WORDS).toHaveProperty('uk', 'ВИДАЛИТИ');
    expect(CONFIRMATION_WORDS).toHaveProperty('cs', 'SMAZAT');
    expect(CONFIRMATION_WORDS).toHaveProperty('de', 'LÖSCHEN');
  });
});

describe('validateConfirmationWord', () => {
  it('returns true for exact match in each locale', () => {
    expect(validateConfirmationWord('en', 'DELETE')).toBe(true);
    expect(validateConfirmationWord('ru', 'УДАЛИТЬ')).toBe(true);
    expect(validateConfirmationWord('uk', 'ВИДАЛИТИ')).toBe(true);
    expect(validateConfirmationWord('cs', 'SMAZAT')).toBe(true);
    expect(validateConfirmationWord('de', 'LÖSCHEN')).toBe(true);
  });

  it('returns false for wrong case', () => {
    expect(validateConfirmationWord('en', 'delete')).toBe(false);
    expect(validateConfirmationWord('en', 'Delete')).toBe(false);
    expect(validateConfirmationWord('cs', 'smazat')).toBe(false);
    expect(validateConfirmationWord('de', 'löschen')).toBe(false);
  });

  it('returns false for empty input', () => {
    expect(validateConfirmationWord('en', '')).toBe(false);
    expect(validateConfirmationWord('ru', '')).toBe(false);
  });

  it('returns false for unsupported locale', () => {
    expect(validateConfirmationWord('fr', 'DELETE')).toBe(false);
    expect(validateConfirmationWord('es', 'BORRAR')).toBe(false);
    expect(validateConfirmationWord('', 'DELETE')).toBe(false);
  });

  it('returns false for partial match', () => {
    expect(validateConfirmationWord('en', 'DELET')).toBe(false);
    expect(validateConfirmationWord('en', 'DELETEE')).toBe(false);
    expect(validateConfirmationWord('ru', 'УДАЛИ')).toBe(false);
  });

  it('returns false for input with extra whitespace', () => {
    expect(validateConfirmationWord('en', ' DELETE')).toBe(false);
    expect(validateConfirmationWord('en', 'DELETE ')).toBe(false);
    expect(validateConfirmationWord('en', ' DELETE ')).toBe(false);
  });
});
