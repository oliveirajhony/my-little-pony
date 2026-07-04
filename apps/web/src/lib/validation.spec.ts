import { describe, expect, it } from 'vitest';
import { isValidEmail } from './validation';

describe('isValidEmail', () => {
  it('accepts a well-formed address', () => {
    expect(isValidEmail('demo@cv.app')).toBe(true);
  });

  it('trims surrounding whitespace', () => {
    expect(isValidEmail('  demo@cv.app  ')).toBe(true);
  });

  it('rejects a missing domain', () => {
    expect(isValidEmail('demo@')).toBe(false);
  });

  it('rejects a missing @', () => {
    expect(isValidEmail('demo.cv.app')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isValidEmail('')).toBe(false);
  });
});
