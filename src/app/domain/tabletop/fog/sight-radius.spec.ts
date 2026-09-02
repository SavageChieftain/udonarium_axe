import { effectiveSightRadiusPx } from '@axe/domain/tabletop/fog/sight-radius';
import { VisionType } from '@axe/domain/tabletop/vision-types';
import { describe, expect, it } from 'vitest';

function radius(partial: Partial<Parameters<typeof effectiveSightRadiusPx>[0]> = {}): number {
  return effectiveSightRadiusPx({
    darknessEnabled: true,
    visionType: VisionType.NORMAL,
    visionRangePx: 0,
    ownLightDimPx: 0,
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
    expect(radius({ visionType: VisionType.DARKVISION, visionRangePx: 250, ownLightDimPx: 100 })).toBe(250);
    expect(radius({ visionType: VisionType.DARKVISION, visionRangePx: 250, ownLightDimPx: 300 })).toBe(300);
  });

  it('follows the lamp a piece carries past what it can see without one', () => {
    expect(radius({ visionRangePx: 100, ownLightDimPx: 300 })).toBe(300);
  });

  it('leaves a piece that cannot see in the dark with only what its own lamp shows', () => {
    expect(radius({ visionRangePx: 250 })).toBe(0);
  });

  it('is nothing for a piece with neither', () => {
    expect(radius()).toBe(0);
  });

  it('is the range itself on a board with no dark on it, where a lamp shows nothing new', () => {
    expect(radius({ darknessEnabled: false, visionRangePx: 400, ownLightDimPx: 300 })).toBe(400);
  });

  it('draws nothing for a piece that sees as far as the board goes', () => {
    expect(radius({ darknessEnabled: false })).toBe(0);
  });
});
