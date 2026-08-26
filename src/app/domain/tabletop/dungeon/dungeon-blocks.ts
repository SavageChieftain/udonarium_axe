import { DungeonAtmosphere } from '@axe/domain/tabletop/dungeon/dungeon-atmosphere';
import {
  cellAt,
  DungeonCell,
  DungeonLayout,
  DungeonPoint,
  DungeonRect,
  maskOfKind,
} from '@axe/domain/tabletop/dungeon/dungeon-layout';
import { mergeMaskToRects } from '@axe/domain/tabletop/dungeon/rect-merge';

export const MAX_MERGE_SPAN = 12;
export const DUNGEON_MAX_TERRAINS = 300;
export const DUNGEON_HEAVY_TERRAINS = 150;
/** What one terrain costs to sync: itself, the five it is built from, and its six values. */
export const SYNC_OBJECTS_PER_TERRAIN = 12;

export type DungeonBlockKind = 'wall' | 'floor' | 'hazard' | 'door' | 'stairUp' | 'stairDown' | 'torch';

export interface DungeonBlock {
  kind: DungeonBlockKind;
  rect: DungeonRect;
  blocksSight: boolean;
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
 * Pick a cell inside each room, up against a wall, to stand a torch in.
 *
 * The light rides on a sconce of its own rather than on the wall. A terrain carrying a
 * light stops blocking light, so a torch set on a rock rect twelve cells across would open
 * a hole that size in the dark, lit from the middle of the stone.
 */
function findTorchSpots(layout: DungeonLayout, count: number): { rooms: number[]; spots: DungeonPoint[] } {
  const rooms: number[] = [];
  const spots: DungeonPoint[] = [];
  if (count < 1) return { rooms, spots };

  for (const room of layout.rooms) {
    if (rooms.length >= count) break;
    let found: DungeonPoint | null = null;

    for (let dy = 0; dy < room.h && !found; dy++) {
      for (let dx = 0; dx < room.w && !found; dx++) {
        const x = room.x + dx;
        const y = room.y + dy;
        if (cellAt(layout, x, y) !== DungeonCell.Room) continue;
        const againstWall =
          cellAt(layout, x + 1, y) === DungeonCell.Rock ||
          cellAt(layout, x - 1, y) === DungeonCell.Rock ||
          cellAt(layout, x, y + 1) === DungeonCell.Rock ||
          cellAt(layout, x, y - 1) === DungeonCell.Rock;
        if (againstWall) found = { x, y };
      }
    }

    if (!found) continue;
    rooms.push(room.index);
    spots.push(found);
  }

  return { rooms, spots };
}

export interface DungeonBlocks {
  blocks: DungeonBlock[];
  torchRooms: number[];
  torchSpots: DungeonPoint[];
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
      locked: false,
      rooms: boundary ? roomsBeside(layout, rect) : [],
    });
  }

  const floorKinds = options.placeDoors
    ? [DungeonCell.Room, DungeonCell.Corridor]
    : [DungeonCell.Room, DungeonCell.Corridor, DungeonCell.Door];
  const floorMask = maskOfKind(layout, floorKinds);
  for (const rect of mergeMaskToRects(floorMask, layout.width, layout.height, MAX_MERGE_SPAN)) {
    blocks.push({ kind: 'floor', rect, blocksSight: false, locked: false, rooms: [] });
  }

  const hazardMask = maskOfKind(layout, [DungeonCell.Hazard]);
  for (const rect of mergeMaskToRects(hazardMask, layout.width, layout.height, MAX_MERGE_SPAN)) {
    blocks.push({ kind: 'hazard', rect, blocksSight: false, locked: false, rooms: [] });
  }

  if (options.placeDoors) {
    for (const door of layout.doors) {
      blocks.push({
        kind: 'door',
        rect: { x: door.x, y: door.y, w: 1, h: 1 },
        blocksSight: true,
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
      locked: false,
      rooms: [0],
    });
    const sameSpot = layout.exit.x === layout.entrance.x && layout.exit.y === layout.entrance.y;
    if (!sameSpot) {
      blocks.push({
        kind: 'stairDown',
        rect: { x: layout.exit.x, y: layout.exit.y, w: 1, h: 1 },
        blocksSight: false,
        locked: false,
        rooms: [],
      });
    }
  }

  const { rooms: torchRooms, spots: torchSpots } = findTorchSpots(layout, atmosphere.torches);
  for (const spot of torchSpots) {
    blocks.push({
      kind: 'torch',
      rect: { x: spot.x, y: spot.y, w: 1, h: 1 },
      blocksSight: false,
      locked: false,
      rooms: [],
    });
  }

  return { blocks, torchRooms, torchSpots };
}

export function syncObjectCount(blocks: readonly DungeonBlock[]): number {
  return blocks.length * SYNC_OBJECTS_PER_TERRAIN;
}
