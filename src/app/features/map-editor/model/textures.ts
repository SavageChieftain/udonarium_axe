/** 模様として使う絵に付ける目印。置き場では絵の一覧に紛れるので、これで選り分ける。 */
export const TEXTURE_IMAGE_TAG = 'テクスチャ';

export const TEXTURE_IDS = [
  'black_soil',
  'brick',
  'desert',
  'floor',
  'forest',
  'gravel',
  'lava',
  'rock',
  'rock_moss',
  'sand',
  'sea',
  'shallows',
  'steppe',
  'stone_paving_big',
  'stone_paving_small',
  'stone_tile',
] as const;

export type TextureId = (typeof TEXTURE_IDS)[number];

export const TEXTURE_ASSET_URLS: Record<TextureId, string> = {
  black_soil: 'assets/images/tiles/black_soil.webp',
  brick: 'assets/images/tiles/brick.webp',
  desert: 'assets/images/tiles/desert.webp',
  floor: 'assets/images/tiles/floor.webp',
  forest: 'assets/images/tiles/forest.webp',
  gravel: 'assets/images/tiles/gravel.webp',
  lava: 'assets/images/tiles/lava.webp',
  rock: 'assets/images/tiles/rock.webp',
  rock_moss: 'assets/images/tiles/rock_moss.webp',
  sand: 'assets/images/tiles/sand.webp',
  sea: 'assets/images/tiles/sea.webp',
  shallows: 'assets/images/tiles/shallows.webp',
  steppe: 'assets/images/tiles/steppe.webp',
  stone_paving_big: 'assets/images/tiles/stone_paving_big.webp',
  stone_paving_small: 'assets/images/tiles/stone_paving_small.webp',
  stone_tile: 'assets/images/tiles/stone_tile.webp',
};

export const TEXTURE_BASE_COLOR: Record<TextureId, string> = {
  black_soil: '#2e251d',
  brick: '#b0573f',
  desert: '#d9b37a',
  floor: '#b98a55',
  forest: '#3f6b34',
  gravel: '#9b958c',
  lava: '#e4561f',
  rock: '#8a8d91',
  rock_moss: '#74815f',
  sand: '#e3cfa0',
  sea: '#2f7fc4',
  shallows: '#5cc0d8',
  steppe: '#9fae54',
  stone_paving_big: '#a8aaad',
  stone_paving_small: '#b3b5b8',
  stone_tile: '#c0c2c1',
};

export const LEGACY_TEXTURE_ALIASES: Record<string, TextureId> = {
  grass: 'steppe',
  water: 'sea',
  stone: 'rock',
  wood: 'floor',
  dirt: 'black_soil',
  tile: 'stone_tile',
  snow: 'gravel',
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

export function normalizeTextureId(id: string): string {
  if (typeof id !== 'string') return id;
  const alias = LEGACY_TEXTURE_ALIASES[id];
  if (alias) return alias;
  return id;
}
