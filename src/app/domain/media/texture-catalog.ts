/** The tag on an image used as a pattern, which is how it is picked out of the pictures in storage. */
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
  'blood_stone',
  'bone_floor',
  'ice',
  'marble',
  'metal_grate',
  'moss_stone_floor',
  'obsidian',
  'packed_earth',
  'rubble_floor',
  'sandstone_floor',
  'stone_mosaic',
  'stone_paving_wet',
  'swamp_mud',
  'wood_plank',
  'poison_pool',
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
  blood_stone: 'assets/images/tiles/blood_stone.webp',
  bone_floor: 'assets/images/tiles/bone_floor.webp',
  ice: 'assets/images/tiles/ice.webp',
  marble: 'assets/images/tiles/marble.webp',
  metal_grate: 'assets/images/tiles/metal_grate.webp',
  moss_stone_floor: 'assets/images/tiles/moss_stone_floor.webp',
  obsidian: 'assets/images/tiles/obsidian.webp',
  packed_earth: 'assets/images/tiles/packed_earth.webp',
  rubble_floor: 'assets/images/tiles/rubble_floor.webp',
  sandstone_floor: 'assets/images/tiles/sandstone_floor.webp',
  stone_mosaic: 'assets/images/tiles/stone_mosaic.webp',
  stone_paving_wet: 'assets/images/tiles/stone_paving_wet.webp',
  swamp_mud: 'assets/images/tiles/swamp_mud.webp',
  wood_plank: 'assets/images/tiles/wood_plank.webp',
  poison_pool: 'assets/images/tiles/poison_pool.webp',
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
  blood_stone: '#262220',
  bone_floor: '#645b54',
  ice: '#48fcfb',
  marble: '#f7f7ef',
  metal_grate: '#343538',
  moss_stone_floor: '#869a79',
  obsidian: '#290406',
  packed_earth: '#925110',
  rubble_floor: '#d8caa9',
  sandstone_floor: '#ca740a',
  stone_mosaic: '#a48e62',
  stone_paving_wet: '#718a9b',
  swamp_mud: '#444a13',
  wood_plank: '#bd8f46',
  poison_pool: '#012304',
};

export function isTextureId(value: string): value is TextureId {
  return (TEXTURE_IDS as readonly string[]).includes(value);
}

export const WALL_TEXTURE_IDS = [
  'wall_ashlar',
  'wall_bone',
  'wall_brick',
  'wall_cave_rock',
  'wall_earth',
  'wall_ice',
  'wall_metal',
  'wall_mossy_stone',
  'wall_obsidian',
  'wall_rubble',
  'wall_sandstone',
  'wall_timber',
  'cactus_skin',
] as const;

export type WallTextureId = (typeof WALL_TEXTURE_IDS)[number];

export const WALL_TEXTURE_ASSET_URLS: Record<WallTextureId, string> = {
  wall_ashlar: 'assets/images/walls/wall_ashlar.webp',
  wall_bone: 'assets/images/walls/wall_bone.webp',
  wall_brick: 'assets/images/walls/wall_brick.webp',
  wall_cave_rock: 'assets/images/walls/wall_cave_rock.webp',
  wall_earth: 'assets/images/walls/wall_earth.webp',
  wall_ice: 'assets/images/walls/wall_ice.webp',
  wall_metal: 'assets/images/walls/wall_metal.webp',
  wall_mossy_stone: 'assets/images/walls/wall_mossy_stone.webp',
  wall_obsidian: 'assets/images/walls/wall_obsidian.webp',
  wall_rubble: 'assets/images/walls/wall_rubble.webp',
  wall_sandstone: 'assets/images/walls/wall_sandstone.webp',
  wall_timber: 'assets/images/walls/wall_timber.webp',
  cactus_skin: 'assets/images/walls/cactus_skin.webp',
};

/** The floor tile a wall shows on its top and bottom, seen from above. */
export const WALL_TOP_TEXTURE: Record<WallTextureId, TextureId> = {
  wall_ashlar: 'stone_paving_big',
  wall_bone: 'bone_floor',
  wall_brick: 'brick',
  wall_cave_rock: 'rock',
  wall_earth: 'black_soil',
  wall_ice: 'ice',
  wall_metal: 'metal_grate',
  wall_mossy_stone: 'moss_stone_floor',
  wall_obsidian: 'obsidian',
  wall_rubble: 'gravel',
  wall_sandstone: 'sandstone_floor',
  wall_timber: 'floor',
  cactus_skin: 'steppe',
};

export const WALL_TEXTURE_BASE_COLOR: Record<WallTextureId, string> = {
  wall_ashlar: '#8b8a8e',
  wall_bone: '#8c724d',
  wall_brick: '#d04e1e',
  wall_cave_rock: '#b4a68d',
  wall_earth: '#9f5e1e',
  wall_ice: '#a4fdfc',
  wall_metal: '#4d392c',
  wall_mossy_stone: '#7b836e',
  wall_obsidian: '#170e11',
  wall_rubble: '#bbab7b',
  wall_sandstone: '#d7942b',
  wall_timber: '#976324',
  cactus_skin: '#20520d',
};

export function isWallTextureId(value: string): value is WallTextureId {
  return (WALL_TEXTURE_IDS as readonly string[]).includes(value);
}

export const DUNGEON_PROP_IDS = [
  'door_iron_grate',
  'door_stone',
  'door_wood',
  'stair_down',
  'stair_spiral',
  'stair_up',
] as const;

export type DungeonPropId = (typeof DUNGEON_PROP_IDS)[number];

export const DUNGEON_PROP_ASSET_URLS: Record<DungeonPropId, string> = {
  door_iron_grate: 'assets/images/dungeon/door_iron_grate.webp',
  door_stone: 'assets/images/dungeon/door_stone.webp',
  door_wood: 'assets/images/dungeon/door_wood.webp',
  stair_down: 'assets/images/dungeon/stair_down.webp',
  stair_spiral: 'assets/images/dungeon/stair_spiral.webp',
  stair_up: 'assets/images/dungeon/stair_up.webp',
};

export const DUNGEON_PROP_BASE_COLOR: Record<DungeonPropId, string> = {
  door_iron_grate: '#323336',
  door_stone: '#4f4e4c',
  door_wood: '#594532',
  stair_down: '#4c4b49',
  stair_spiral: '#5a5856',
  stair_up: '#4c4b49',
};
