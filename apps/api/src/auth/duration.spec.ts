import { durationToSeconds } from './duration';

describe('durationToSeconds', () => {
  it('parses common units', () => {
    expect(durationToSeconds('30s')).toBe(30);
    expect(durationToSeconds('15m')).toBe(900);
    expect(durationToSeconds('2h')).toBe(7200);
    expect(durationToSeconds('7d')).toBe(604800);
  });

  it('throws on an invalid duration', () => {
    expect(() => durationToSeconds('nope')).toThrow(/Invalid duration/);
  });
});
