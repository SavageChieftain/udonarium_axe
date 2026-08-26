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
/**
 * A maze fills the rock between the rooms, which buys a dungeon worth walking through at
 * roughly twice the pieces a straight corridor would cost. The ceiling was raised to match.
 */
export const DUNGEON_MAX_TERRAINS = 400;
export const DUNGEON_HEAVY_TERRAINS = 200;
/** What one terrain costs to sync: itself, the five it is built from, and its six values. */
export const SYNC_OBJECTS_PER_TERRAIN = 12;

export type DungeonBlockKind = 'wall' | 'floor' | 'hazard' | 'door' | 'stairUp' | 'stairDown' | 'torch';

export interface DungeonBlock {
  kind: DungeonBlockKind;
  rect: DungeonRect;
  blocksSight: boolean;
  locked: boolean;
  rooms: number[];
  /** For a door, the axis it bars. A slab thin along x stands across an east-west passage. */
  across?: 'x' | 'y';
}

export interface DungeonBlockOptions {
  placeDoors: boolean;
  placeStairs: boolean;
}

export const DEFAULT_BLOCK_OPTIONS: DungeonBlockOptions = { placeDoors: true, placeStairs: true };

/** Which way the passage runs where a door stands, so the slab can be set across it. */
const OPEN_LIGHTS: readonly DungeonLightKind[] = ['campfire', 'brazier', 'stand'];
const WALL_LIGHTS: readonly DungeonLightKind[] = ['sconce', 'sconce', 'lantern'];

/** The four ways a light can look, with the heading that points away from that neighbour. */
const FACINGS: readonly [number, number, number][] = [
  [0, -1, 180],
  [0, 1, 0],
  [-1, 0, 90],
  [1, 0, 270],
];

function doorAxis(layout: DungeonLayout, x: number, y: number): 'x' | 'y' {
  const open = (cx: number, cy: number) => cellAt(layout, cx, cy) !== DungeonCell.Rock;
  const eastWest = open(x + 1, y) && open(x - 1, y);
  const northSouth = open(x, y + 1) && open(x, y - 1);
  if (eastWest && !northSouth) return 'x';
  if (northSouth && !eastWest) return 'y';
  // A corner or a wide opening: bar the way the neighbouring stone leaves free.
  return open(x + 1, y) || open(x - 1, y) ? 'x' : 'y';
}

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
/**
 * Where to stand a light in each room, and what kind of light it should be.
 *
 * A sconce goes up against the stone and throws its light away from the wall; a fire stands
 * out in the open where there is room around it. Rooms lit all the same way look staged.
 */
function findLights(layout: DungeonLayout, count: number): DungeonLight[] {
  const lights: DungeonLight[] = [];
  const taken = new Set<number>();
  if (count < 1) return lights;

  for (const room of layout.rooms) {
    if (lights.length >= count) break;

    let wall: DungeonLight | null = null;
    let open: DungeonPoint | null = null;

    for (let dy = 0; dy < room.h && (!wall || !open); dy++) {
      for (let dx = 0; dx < room.w && (!wall || !open); dx++) {
        const x = room.x + dx;
        const y = room.y + dy;
        if (cellAt(layout, x, y) !== DungeonCell.Room) continue;
        // Two rooms sharing ground would otherwise stand two lights on the one cell.
        if (taken.has(y * layout.width + x)) continue;

        const stone = FACINGS.find(([ox, oy]) => cellAt(layout, x + ox, y + oy) === DungeonCell.Rock);
        if (stone && !wall) {
          // Facing is measured away from the stone the bracket is fixed to.
          wall = { x, y, kind: 'sconce', facing: stone[2], room: room.index };
        }
        const clear = FACINGS.every(([ox, oy]) => cellAt(layout, x + ox, y + oy) !== DungeonCell.Rock);
        if (clear && !open) open = { x, y };
      }
    }

    // A room with space to stand round a fire gets one; the cramped ones get something by the wall.
    const roomy = room.w * room.h >= 30 && open !== null;
    const chosen: DungeonLight | null =
      roomy && open
        ? { ...open, kind: OPEN_LIGHTS[lights.length % OPEN_LIGHTS.length], facing: 0, room: room.index }
        : wall && { ...wall, kind: WALL_LIGHTS[lights.length % WALL_LIGHTS.length] };
    if (!chosen) continue;
    lights.push(chosen);
    taken.add(chosen.y * layout.width + chosen.x);
  }

  return lights;
}

export type DungeonLightKind = 'sconce' | 'campfire' | 'brazier' | 'stand' | 'lantern';

export interface DungeonLight extends DungeonPoint {
  kind: DungeonLightKind;
  /** Which way a wall light faces, in degrees, away from the stone behind it. */
  facing: number;
  room: number;
}

export interface DungeonBlocks {
  blocks: DungeonBlock[];
  torchRooms: number[];
  torchSpots: DungeonPoint[];
  lights: DungeonLight[];
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
        across: doorAxis(layout, door.x, door.y),
      });
    }
  }

  if (options.placeStairs) {
    // Walked in through a break in the outer wall, the break itself is the way in; a stair
    // drawn on top of it would say the party climbed down into their own doorway.
    if (!layout.mouth) {
      blocks.push({
        kind: 'stairUp',
        rect: { x: layout.entrance.x, y: layout.entrance.y, w: 1, h: 1 },
        blocksSight: false,
        locked: false,
        rooms: [0],
      });
    }
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

  const lights = findLights(layout, atmosphere.torches);
  for (const light of lights) {
    blocks.push({
      kind: 'torch',
      rect: { x: light.x, y: light.y, w: 1, h: 1 },
      blocksSight: false,
      locked: false,
      rooms: [light.room],
    });
  }

  return {
    blocks,
    torchRooms: lights.map((light) => light.room),
    torchSpots: lights.map((light) => ({ x: light.x, y: light.y })),
    lights,
  };
}

export function syncObjectCount(blocks: readonly DungeonBlock[]): number {
  return blocks.length * SYNC_OBJECTS_PER_TERRAIN;
}
