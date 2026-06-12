export const TEXTURE_IDS = [
  'grass',
  'water',
  'stone',
  'wood',
  'sand',
  'dirt',
  'brick',
  'tile',
  'lava',
  'snow',
] as const;

export type TextureId = (typeof TEXTURE_IDS)[number];

export const TEXTURE_BASE_COLOR: Record<TextureId, string> = {
  grass: '#a8db41',
  water: '#3ec9f5',
  stone: '#bbbfc4',
  wood: '#d9a45e',
  sand: '#e5cf94',
  dirt: '#342a22',
  brick: '#b5543c',
  tile: '#bec0bf',
  lava: '#ff9b1a',
  snow: '#eef2f8',
};

export function isTextureId(value: string): value is TextureId {
  return (TEXTURE_IDS as readonly string[]).includes(value);
}

export const IMAGE_TEXTURE_PREFIX = 'image:';

export function isImageTextureId(id: string): boolean {
  return typeof id === 'string' && id.startsWith(IMAGE_TEXTURE_PREFIX);
}

export function imageTextureIdentifier(id: string): string {
  return isImageTextureId(id) ? id.slice(IMAGE_TEXTURE_PREFIX.length) : '';
}
