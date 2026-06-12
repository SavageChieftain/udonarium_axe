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
  grass: '#4a7c3f',
  water: '#2f6f9f',
  stone: '#7d7d82',
  wood: '#8a5a32',
  sand: '#cbb27a',
  dirt: '#6b4f33',
  brick: '#9a463c',
  tile: '#9aa6ad',
  lava: '#b83a1f',
  snow: '#dfe7ee',
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
