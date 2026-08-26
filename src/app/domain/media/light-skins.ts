import { LightPreset } from '@axe/domain/tabletop/vision-types';

export const LIGHT_IMAGE_TAG = '光源';

export const LIGHT_SKIN_IDS = ['light_campfire', 'light_sconce', 'light_brazier', 'light_lantern'] as const;

export type LightSkinId = (typeof LIGHT_SKIN_IDS)[number];

export const LIGHT_SKIN_ASSET_URLS: Record<LightSkinId, string> = {
  light_campfire: 'assets/images/lights/light_campfire.webp',
  light_sconce: 'assets/images/lights/light_sconce.webp',
  light_brazier: 'assets/images/lights/light_brazier.webp',
  light_lantern: 'assets/images/lights/light_lantern.webp',
};

/** The picture a light wears when its preset is chosen and nothing has been picked by hand. */
export const LIGHT_PRESET_SKIN: Partial<Record<LightPreset, LightSkinId>> = {
  [LightPreset.CAMPFIRE]: 'light_campfire',
  [LightPreset.SCONCE]: 'light_sconce',
  [LightPreset.BRAZIER]: 'light_brazier',
  [LightPreset.TORCH]: 'light_sconce',
  [LightPreset.LANTERN]: 'light_lantern',
  [LightPreset.CANDLE]: 'light_lantern',
  [LightPreset.CHANDELIER]: 'light_brazier',
};

export function isLightSkinId(value: string): value is LightSkinId {
  return (LIGHT_SKIN_IDS as readonly string[]).includes(value);
}
