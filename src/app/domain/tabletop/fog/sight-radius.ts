import { seesInDark } from '@axe/domain/tabletop/vision-scene';
import { VisionType } from '@axe/domain/tabletop/vision-types';

export interface SightRadiusInput {
  darknessEnabled: boolean;
  visionType: VisionType;
  visionRangePx: number;
  ownLightDimPx: number;
  fogSightRangePx: number;
}

/**
 * How far a piece sees on its own, which is not how far it can see.
 *
 * What another lantern shows it is left out on purpose: the drawn shape is the piece's own
 * reach, and the lit ground that runs past it is what somebody else's light is worth.
 */
export function effectiveSightRadiusPx(input: SightRadiusInput): number {
  if (!input.darknessEnabled) return Math.max(0, input.fogSightRangePx);
  const dark = seesInDark(input.visionType) ? Math.max(0, input.visionRangePx) : 0;
  return Math.max(dark, Math.max(0, input.ownLightDimPx));
}
