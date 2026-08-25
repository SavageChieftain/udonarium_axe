import { seededRandom } from '@axe/core/util/seeded-random';
import { generateCave } from '@axe/domain/tabletop/dungeon/cave-automata';
import {
  atmosphereById,
  DungeonAtmosphere,
  DungeonAtmosphereId,
} from '@axe/domain/tabletop/dungeon/dungeon-atmosphere';
import {
  DEFAULT_BLOCK_OPTIONS,
  DungeonBlockOptions,
  DungeonBlocks,
  layoutToBlocks,
} from '@axe/domain/tabletop/dungeon/dungeon-blocks';
import { DungeonLayout } from '@axe/domain/tabletop/dungeon/dungeon-layout';
import { assignRoomRoles } from '@axe/domain/tabletop/dungeon/room-roles';
import { generateRoomsAndCorridors } from '@axe/domain/tabletop/dungeon/rooms-and-corridors';

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
}

export interface DungeonBoardSize {
  width: number;
  height: number;
}

export function clampRoomCount(roomCount: number): number {
  if (!Number.isFinite(roomCount)) return MIN_ROOM_COUNT;
  return Math.min(MAX_ROOM_COUNT, Math.max(MIN_ROOM_COUNT, Math.round(roomCount)));
}

export function boardSizeFor(atmosphere: DungeonAtmosphere, roomCount: number): DungeonBoardSize {
  const rooms = clampRoomCount(roomCount);
  const width = Math.min(MAX_BOARD_WIDTH, 24 + rooms * 2);
  const height = Math.min(MAX_BOARD_HEIGHT, 18 + Math.round(rooms * 1.5));
  if (atmosphere.algorithm !== 'cave') return { width, height };
  return {
    width: Math.round(width * CAVE_BOARD_SCALE),
    height: Math.round(height * CAVE_BOARD_SCALE),
  };
}

export function generateDungeon(request: DungeonRequest): DungeonLayout {
  const atmosphere = atmosphereById(request.atmosphere);
  const rooms = clampRoomCount(request.roomCount);
  const { width, height } = boardSizeFor(atmosphere, rooms);
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
      : generateRoomsAndCorridors(
          {
            width,
            height,
            roomCount: rooms,
            minRoom: atmosphere.rooms!.minRoom,
            maxRoom: atmosphere.rooms!.maxRoom,
            corridorWidth: atmosphere.rooms!.corridorWidth,
            extraLoopRatio: atmosphere.rooms!.extraLoopRatio,
            wallBreakChance: atmosphere.rooms!.wallBreakChance,
            seed: request.seed,
          },
          rng
        );

  assignRoomRoles(layout);
  return layout;
}

export interface DungeonPlan {
  layout: DungeonLayout;
  atmosphere: DungeonAtmosphere;
  blocks: DungeonBlocks;
}

/** The whole thing worked out but not yet built, which is what the preview and the estimate read. */
export function planDungeon(
  request: DungeonRequest,
  options: DungeonBlockOptions = DEFAULT_BLOCK_OPTIONS
): DungeonPlan {
  const atmosphere = atmosphereById(request.atmosphere);
  const layout = generateDungeon(request);
  return { layout, atmosphere, blocks: layoutToBlocks(layout, atmosphere, options) };
}
