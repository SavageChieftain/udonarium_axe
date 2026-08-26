import { DungeonPropId } from '@axe/domain/media/texture-catalog';

/** What a thing is made of: one of the bundled pictures, or one out of the image storage. */
export type MapMaterial = { kind: 'texture'; id: string } | { kind: 'library'; identifier: string };

export interface MapRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface MapPoint {
  x: number;
  y: number;
}

/** How big a board the table is given, in cells. */
export interface MapSize {
  width: number;
  height: number;
}

/** What a table looks and feels like, apart from what stands on it. */
export interface MapMood {
  /** Zero leaves the table lit. Anything else is how deep the dark goes. */
  darkness: number;
  ambientColor: string;
  weatherKind: string;
  weatherDensity: number;
  gridShow: boolean;
  torches: number;
}

export type MapBlockKind = 'wall' | 'door' | 'stairUp' | 'stairDown' | 'prop';

export interface MapBlock {
  kind: MapBlockKind;
  rect: MapRect;
  blocksSight: boolean;
  locked: boolean;
  rooms: number[];
  /** For a door, the axis it bars. A slab thin along x stands across an east-west passage. */
  across?: 'x' | 'y';
  /** A bundled picture for a piece that wears one of its own: a door, a stair, a tree. */
  prop?: DungeonPropId;
  /** What a prop is built from, when it is not made of the walls of the place. */
  skin?: { side: MapMaterial; top: MapMaterial };
  /** How tall it stands, in cells. Walls take the height the panel asks for. */
  height?: number;
  /** How a door moves when it opens. */
  doorStyle?: string;
  name?: string;
}

/**
 * Ground that is painted rather than built.
 *
 * A floor holds nothing up and stops no one seeing, so a slab of terrain per patch buys
 * only sync traffic. These go into the picture the table wears instead.
 */
export interface MapPaint {
  kind: 'floor' | 'hazard';
  rect: MapRect;
  /** The ground of a field changes from patch to patch, so a patch may name its own. */
  material?: MapMaterial;
}

export type MapLightKind = 'sconce' | 'campfire' | 'brazier' | 'stand' | 'lantern';

export interface MapLight extends MapPoint {
  kind: MapLightKind;
  room: number;
  /** Which way it throws its light, measured away from whatever it is fixed to. */
  facing: number;
}

export interface MapBlocks {
  blocks: MapBlock[];
  paint: MapPaint[];
  torchRooms: number[];
  torchSpots: MapPoint[];
  lights: MapLight[];
}

/**
 * How many pieces one table will carry.
 *
 * A maze fills the rock between the rooms, which buys a dungeon worth walking through at
 * roughly twice the pieces a straight corridor would cost, and a wood is dearer still.
 */
export const MAP_MAX_TERRAINS = 400;
export const MAP_HEAVY_TERRAINS = 200;

/** What one terrain costs to sync: itself, the five it is built from, and its six values. */
export const SYNC_OBJECTS_PER_TERRAIN = 12;

export function syncObjectCount(blocks: readonly MapBlock[]): number {
  return blocks.length * SYNC_OBJECTS_PER_TERRAIN;
}
