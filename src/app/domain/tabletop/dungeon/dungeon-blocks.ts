import { DungeonAtmosphere } from '@axe/domain/tabletop/dungeon/dungeon-atmosphere';
import {
  cellAt,
  DungeonCell,
  DungeonLayout,
  DungeonRect,
  maskOfKind,
} from '@axe/domain/tabletop/dungeon/dungeon-layout';
import { mergeMaskToRects } from '@axe/domain/tabletop/dungeon/rect-merge';

export const MAX_MERGE_SPAN = 12;
export const DUNGEON_MAX_TERRAINS = 300;
export const DUNGEON_HEAVY_TERRAINS = 150;
/** What one terrain costs to sync: itself, the five it is built from, and its six values. */
export const SYNC_OBJECTS_PER_TERRAIN = 12;

export type DungeonBlockKind = 'wall' | 'floor' | 'hazard' | 'door' | 'stairUp' | 'stairDown';

export interface DungeonBlock {
  kind: DungeonBlockKind;
  rect: DungeonRect;
  blocksSight: boolean;
  /** A wall block carrying a torch. Free to set: it rides on the terrain already being made. */
  torch: boolean;
  locked: boolean;
  rooms: number[];
}

export interface DungeonBlockOptions {
  placeDoors: boolean;
  placeStairs: boolean;
}

export const DEFAULT_BLOCK_OPTIONS: DungeonBlockOptions = { placeDoors: true, placeStairs: true };

function touchesOpenCell(layout: DungeonLayout, rect: DungeonRect): boolean {
  for (let dy = 0; dy < rect.h; dy++) {
    for (let dx = 0; dx < rect.w; dx++) {
      const x = rect.x + dx;
      const y = rect.y + dy;
      const open =
        cellAt(layout, x + 1, y) !== DungeonCell.Rock ||
        cellAt(layout, x - 1, y) !== DungeonCell.Rock ||
        cellAt(layout, x, y + 1) !== DungeonCell.Rock ||
        cellAt(layout, x, y - 1) !== DungeonCell.Rock;
      if (open) return true;
    }
  }
  return false;
}

function roomsBeside(layout: DungeonLayout, rect: DungeonRect): number[] {
  const found = new Set<number>();
  for (const room of layout.rooms) {
    const near =
      rect.x <= room.x + room.w && room.x <= rect.x + rect.w && rect.y <= room.y + room.h && room.y <= rect.y + rect.h;
    if (near) found.add(room.index);
  }
  return [...found].sort((left, right) => left - right);
}

/**
 * Hang torches on walls that face a room, spread over the dungeon rather than bunched.
 *
 * A dark table with no light in it is not atmospheric, it is broken. Each light also costs
 * a shadow pass over every wall edge, so the count stays small.
 */
function lightTheWalls(blocks: DungeonBlock[], layout: DungeonLayout, count: number): number[] {
  if (count < 1) return [];
  const candidates = blocks.filter((block) => block.kind === 'wall' && block.rooms.length > 0);
  if (candidates.length === 0) return [];

  const lit: number[] = [];
  const used = new Set<number>();

  for (const room of layout.rooms) {
    if (lit.length >= count) break;
    const spot = candidates.find((block) => block.rooms.includes(room.index) && !block.torch);
    if (!spot || used.has(room.index)) continue;
    spot.torch = true;
    used.add(room.index);
    lit.push(room.index);
  }

  return lit;
}

export interface DungeonBlocks {
  blocks: DungeonBlock[];
  torchRooms: number[];
}

export function layoutToBlocks(
  layout: DungeonLayout,
  atmosphere: DungeonAtmosphere,
  options: DungeonBlockOptions = DEFAULT_BLOCK_OPTIONS
): DungeonBlocks {
  const blocks: DungeonBlock[] = [];

  const rockMask = maskOfKind(layout, [DungeonCell.Rock]);
  for (const rect of mergeMaskToRects(rockMask, layout.width, layout.height, MAX_MERGE_SPAN)) {
    // Rock buried behind more rock cannot be seen past, so it need not be tested against.
    const boundary = touchesOpenCell(layout, rect);
    blocks.push({
      kind: 'wall',
      rect,
      blocksSight: boundary,
      torch: false,
      locked: false,
      rooms: boundary ? roomsBeside(layout, rect) : [],
    });
  }

  const floorKinds = options.placeDoors
    ? [DungeonCell.Room, DungeonCell.Corridor]
    : [DungeonCell.Room, DungeonCell.Corridor, DungeonCell.Door];
  const floorMask = maskOfKind(layout, floorKinds);
  for (const rect of mergeMaskToRects(floorMask, layout.width, layout.height, MAX_MERGE_SPAN)) {
    blocks.push({ kind: 'floor', rect, blocksSight: false, torch: false, locked: false, rooms: [] });
  }

  const hazardMask = maskOfKind(layout, [DungeonCell.Hazard]);
  for (const rect of mergeMaskToRects(hazardMask, layout.width, layout.height, MAX_MERGE_SPAN)) {
    blocks.push({ kind: 'hazard', rect, blocksSight: false, torch: false, locked: false, rooms: [] });
  }

  if (options.placeDoors) {
    for (const door of layout.doors) {
      blocks.push({
        kind: 'door',
        rect: { x: door.x, y: door.y, w: 1, h: 1 },
        blocksSight: true,
        torch: false,
        locked: door.locked,
        rooms: door.rooms,
      });
    }
  }

  if (options.placeStairs) {
    blocks.push({
      kind: 'stairUp',
      rect: { x: layout.entrance.x, y: layout.entrance.y, w: 1, h: 1 },
      blocksSight: false,
      torch: false,
      locked: false,
      rooms: [0],
    });
    const sameSpot = layout.exit.x === layout.entrance.x && layout.exit.y === layout.entrance.y;
    if (!sameSpot) {
      blocks.push({
        kind: 'stairDown',
        rect: { x: layout.exit.x, y: layout.exit.y, w: 1, h: 1 },
        blocksSight: false,
        torch: false,
        locked: false,
        rooms: [],
      });
    }
  }

  const torchRooms = lightTheWalls(blocks, layout, atmosphere.torches);
  return { blocks, torchRooms };
}

export function syncObjectCount(blocks: readonly DungeonBlock[]): number {
  return blocks.length * SYNC_OBJECTS_PER_TERRAIN;
}
