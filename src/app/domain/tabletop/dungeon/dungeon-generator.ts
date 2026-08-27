import { seededRandom } from '@axe/core/util/seeded-random';
import { generateCave } from '@axe/domain/tabletop/dungeon/cave-automata';
import {
  atmosphereById,
  DungeonAtmosphere,
  DungeonAtmosphereId,
  DungeonEntranceStyle,
} from '@axe/domain/tabletop/dungeon/dungeon-atmosphere';
import {
  DEFAULT_BLOCK_OPTIONS,
  DungeonBlockOptions,
  layoutToBlocks,
  MAX_MERGE_SPAN,
} from '@axe/domain/tabletop/dungeon/dungeon-blocks';
import { DungeonLayout } from '@axe/domain/tabletop/dungeon/dungeon-layout';
import { assignRoomRoles } from '@axe/domain/tabletop/dungeon/room-roles';
import { generateRoomsAndMazes } from '@axe/domain/tabletop/dungeon/rooms-and-mazes';
import { openTunnelMouth } from '@axe/domain/tabletop/dungeon/tunnel-mouth';
import { GridType } from '@axe/domain/tabletop/game-table';
import { MapBlocks } from '@axe/domain/tabletop/map-blocks';
import { boardSizeOn, MapGrid, mergeSpanFor } from '@axe/domain/tabletop/map-grid';

export const MIN_ROOM_COUNT = 3;
export const MAX_ROOM_COUNT = 20;
/** One scratch mask covers at most fifty cells a side, and the whole board wants covering. */
export const MAX_BOARD_WIDTH = 50;
export const MAX_BOARD_HEIGHT = 38;
/** A cave merges worse than a set of rooms, so it gets a smaller board for the same count. */
const CAVE_BOARD_SCALE = 0.85;

export interface DungeonRequest {
  atmosphere: DungeonAtmosphereId;
  roomCount: number;
  seed: number;
  /** What shape the cells are. Left out, squares, which is what a dungeon is usually laid on. */
  gridType?: GridType;
  /** Left out, the atmosphere decides how the party gets in. */
  entrance?: DungeonEntranceStyle;
}

export interface DungeonBoardSize {
  width: number;
  height: number;
}

export function clampRoomCount(roomCount: number): number {
  if (!Number.isFinite(roomCount)) return MIN_ROOM_COUNT;
  return Math.min(MAX_ROOM_COUNT, Math.max(MIN_ROOM_COUNT, Math.round(roomCount)));
}

/** The maze steps two cells at a time, so a room-and-maze board is always an odd size. */
function toOdd(value: number): number {
  return value % 2 === 0 ? value - 1 : value;
}

export function boardSizeFor(atmosphere: DungeonAtmosphere, roomCount: number): DungeonBoardSize {
  const rooms = clampRoomCount(roomCount);
  if (atmosphere.algorithm === 'cave') {
    return {
      width: Math.min(MAX_BOARD_WIDTH, Math.round((24 + rooms * 2) * CAVE_BOARD_SCALE)),
      height: Math.min(MAX_BOARD_HEIGHT, Math.round((18 + Math.round(rooms * 1.5)) * CAVE_BOARD_SCALE)),
    };
  }
  // A maze fills whatever rock is left, so slack in the board is paid for in corridor.
  return {
    width: toOdd(Math.min(MAX_BOARD_WIDTH, 22 + Math.round(rooms * 1.8))),
    height: toOdd(Math.min(MAX_BOARD_HEIGHT, 16 + Math.round(rooms * 1.4))),
  };
}

export function generateDungeon(request: DungeonRequest): DungeonLayout {
  const atmosphere = atmosphereById(request.atmosphere);
  const rooms = clampRoomCount(request.roomCount);
  const { width, height } = boardSizeOn(boardSizeFor(atmosphere, rooms), {
    type: request.gridType ?? GridType.SQUARE,
    sizePx: 1,
  });
  const rng = seededRandom(request.seed);

  const layout =
    atmosphere.algorithm === 'cave'
      ? generateCave(
          {
            width,
            height,
            chamberCount: rooms,
            wallFill: atmosphere.cave!.wallFill,
            iterations: atmosphere.cave!.iterations,
            birth: atmosphere.cave!.birth,
            survive: atmosphere.cave!.survive,
            tunnelWidth: atmosphere.cave!.tunnelWidth,
            hazardPools: Math.round(atmosphere.cave!.hazardPoolsPerRoom * rooms),
            seed: request.seed,
          },
          rng
        )
      : generateRoomsAndMazes(
          {
            width,
            height,
            roomCount: rooms,
            minRoom: atmosphere.rooms!.minRoom,
            maxRoom: atmosphere.rooms!.maxRoom,
            windingPercent: atmosphere.rooms!.windingPercent,
            extraConnectorChance: atmosphere.rooms!.extraConnectorChance,
            wallBreakChance: atmosphere.rooms!.wallBreakChance,
            shapes: atmosphere.rooms!.shapes,
            seed: request.seed,
          },
          rng
        );

  // Cut before the roles are given out, so depth is counted from the mouth the party walks in by.
  if ((request.entrance ?? atmosphere.entrance) === 'tunnel') openTunnelMouth(layout);
  assignRoomRoles(layout);
  return layout;
}

export interface DungeonPlan {
  layout: DungeonLayout;
  atmosphere: DungeonAtmosphere;
  blocks: MapBlocks;
}

/** The whole thing worked out but not yet built, which is what the preview and the estimate read. */
export function planDungeon(
  request: DungeonRequest,
  options: DungeonBlockOptions = DEFAULT_BLOCK_OPTIONS
): DungeonPlan {
  const atmosphere = atmosphereById(request.atmosphere);
  const layout = generateDungeon(request);
  const grid: MapGrid = { type: request.gridType ?? GridType.SQUARE, sizePx: 1 };
  const span = mergeSpanFor(grid, MAX_MERGE_SPAN);
  return { layout, atmosphere, blocks: layoutToBlocks(layout, atmosphere, { ...options, mergeSpan: span }) };
}
