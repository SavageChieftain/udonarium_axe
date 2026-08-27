import { TextureId } from '@axe/domain/media/texture-catalog';

export const LEGACY_TEXTURE_ALIASES: Record<string, TextureId> = {
  grass: 'steppe',
  water: 'sea',
  stone: 'rock',
  wood: 'floor',
  dirt: 'black_soil',
  tile: 'stone_tile',
  snow: 'gravel',
};

export const IMAGE_TEXTURE_PREFIX = 'image:';

export function isImageTextureId(id: string): boolean {
  return typeof id === 'string' && id.startsWith(IMAGE_TEXTURE_PREFIX);
}

export function imageTextureIdentifier(id: string): string {
  return isImageTextureId(id) ? id.slice(IMAGE_TEXTURE_PREFIX.length) : '';
}

export function normalizeTextureId(id: string): string {
  if (typeof id !== 'string') return id;
  const alias = LEGACY_TEXTURE_ALIASES[id];
  if (alias) return alias;
  return id;
}
