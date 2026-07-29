import { CLOCK_GHOST_PATTERN, formatClockParts } from '@axe/features/widgets/digital-clock/clock-format';
import { describe, expect, it } from 'vitest';

describe('formatClockParts', () => {
  it('時分と秒を分けてゼロ埋めで返す', () => {
    expect(formatClockParts(new Date(2026, 0, 1, 9, 5, 3))).toEqual({
      hoursMinutes: '09:05',
      seconds: '03',
      date: '2026.01.01',
    });
  });

  it('24時間表記で返す', () => {
    expect(formatClockParts(new Date(2026, 6, 29, 21, 30, 0)).hoursMinutes).toBe('21:30');
  });

  it('日付の境界を跨いでも時刻だけを返す', () => {
    expect(formatClockParts(new Date(2026, 0, 1, 0, 0, 0)).hoursMinutes).toBe('00:00');
    expect(formatClockParts(new Date(2026, 0, 1, 23, 59, 59)).seconds).toBe('59');
  });

  it('日付は年月日をゼロ埋めして返す', () => {
    expect(formatClockParts(new Date(2026, 11, 5, 0, 0, 0)).date).toBe('2026.12.05');
  });

  it('背面に敷く字形は時分と同じ桁数', () => {
    expect(CLOCK_GHOST_PATTERN).toHaveLength(formatClockParts(new Date()).hoursMinutes.length);
  });
});
