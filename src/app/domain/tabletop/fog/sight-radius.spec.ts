import { effectiveSightRadiusPx } from '@axe/domain/tabletop/fog/sight-radius';
import { VisionType } from '@axe/domain/tabletop/vision-types';
import { describe, expect, it } from 'vitest';

function radius(partial: Partial<Parameters<typeof effectiveSightRadiusPx>[0]> = {}): number {
  return effectiveSightRadiusPx({
    darknessEnabled: true,
    visionType: VisionType.NORMAL,
    visionRangePx: 0,
    ownLightDimPx: 0,
    fogSightRangePx: 0,
    ...partial,
  });
}

describe('effectiveSightRadiusPx', () => {
  it('is as far as the lamp a piece carries throws', () => {
    expect(radius({ ownLightDimPx: 300 })).toBe(300);
  });

  it('is as far as a piece can see in the dark', () => {
    expect(radius({ visionType: VisionType.DARKVISION, visionRangePx: 250 })).toBe(250);
  });

  it('takes the longer of the two', () => {
    expect(radius({ visionType: VisionType.DARKVISION, visionRangePx: 250, ownLightDimPx: 300 })).toBe(300);
  });

  it('ignores a range set on a piece that cannot see in the dark anyway', () => {
    expect(radius({ visionRangePx: 250 })).toBe(0);
  });

  it('is nothing for a piece with neither', () => {
    expect(radius()).toBe(0);
  });

  it('falls back to the table on a board with no dark on it', () => {
    expect(radius({ darknessEnabled: false, ownLightDimPx: 300, fogSightRangePx: 400 })).toBe(400);
  });
});
