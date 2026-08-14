import { CLOCK_GHOST_PATTERN, formatClockParts } from '@axe/features/widgets/digital-clock/clock-format';
import { describe, expect, it } from 'vitest';

describe('formatClockParts', () => {
  it('pads the hour, the minute and the second, keeping the seconds apart', () => {
    expect(formatClockParts(new Date(2026, 0, 1, 9, 5, 3))).toEqual({
      hoursMinutes: '09:05',
      seconds: '03',
      date: '2026.01.01',
    });
  });

  it('reads the clock round the day', () => {
    expect(formatClockParts(new Date(2026, 6, 29, 21, 30, 0)).hoursMinutes).toBe('21:30');
  });

  it('gives the time alone across midnight', () => {
    expect(formatClockParts(new Date(2026, 0, 1, 0, 0, 0)).hoursMinutes).toBe('00:00');
    expect(formatClockParts(new Date(2026, 0, 1, 23, 59, 59)).seconds).toBe('59');
  });

  it('pads the year, the month and the day', () => {
    expect(formatClockParts(new Date(2026, 11, 5, 0, 0, 0)).date).toBe('2026.12.05');
  });

  it('backs the digits with as many as it shows', () => {
    expect(CLOCK_GHOST_PATTERN).toHaveLength(formatClockParts(new Date()).hoursMinutes.length);
  });
});
