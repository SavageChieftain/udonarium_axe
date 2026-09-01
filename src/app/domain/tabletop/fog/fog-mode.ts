export const FOG_MODES = ['easy', 'hard'] as const;

export type FogMode = (typeof FOG_MODES)[number];

export const DEFAULT_FOG_MODE: FogMode = 'easy';

export function asFogMode(value: unknown): FogMode {
  return typeof value === 'string' && (FOG_MODES as readonly string[]).includes(value)
    ? (value as FogMode)
    : DEFAULT_FOG_MODE;
}

export const DEFAULT_FOG_COLOR = '#05070c';

export const FOG_VEIL_ALPHA = 0.62;

export const FOG_UNEXPLORED_ALPHA = 1;

export const FOG_GM_ALPHA_FACTOR = 0.22;

export const FOG_EDGE_BLUR_RATIO = 0.35;
