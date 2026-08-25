import { extraLinks, spanningTree } from '@axe/domain/tabletop/dungeon/dungeon-graph';
import {
  cellAt,
  DungeonCell,
  DungeonDoor,
  DungeonLayout,
  DungeonRoom,
  DungeonRoomRole,
  roomCenter,
  setCell,
} from '@axe/domain/tabletop/dungeon/dungeon-layout';

export interface RoomsAndCorridorsParams {
  width: number;
  height: number;
  roomCount: number;
  minRoom: number;
  maxRoom: number;
  corridorWidth: number;
  extraLoopRatio: number;
  wallBreakChance: number;
  seed: number;
}

const PLACEMENT_TRIES_PER_ROOM = 80;

function intRange(rng: () => number, low: number, high: number): number {
  if (high <= low) return low;
  return low + Math.floor(rng() * (high - low + 1));
}

function overlapsAny(rooms: readonly DungeonRoom[], x: number, y: number, w: number, h: number): boolean {
  // Grown by one so two rooms always keep a wall between them.
  return rooms.some((room) => x <= room.x + room.w && room.x <= x + w && y <= room.y + room.h && room.y <= y + h);
}

function placeRooms(params: RoomsAndCorridorsParams, rng: () => number): DungeonRoom[] {
  const rooms: DungeonRoom[] = [];
  const tries = Math.max(1, params.roomCount) * PLACEMENT_TRIES_PER_ROOM;

  for (let attempt = 0; attempt < tries && rooms.length < params.roomCount; attempt++) {
    const w = intRange(rng, params.minRoom, params.maxRoom);
    const h = intRange(rng, params.minRoom, params.maxRoom);
    if (w + 2 >= params.width || h + 2 >= params.height) continue;
    const x = intRange(rng, 1, params.width - w - 2);
    const y = intRange(rng, 1, params.height - h - 2);
    if (overlapsAny(rooms, x, y, w, h)) continue;
    rooms.push({ x, y, w, h, index: rooms.length, role: DungeonRoomRole.Chamber });
  }

  return rooms;
}

function carveRooms(layout: DungeonLayout, rooms: readonly DungeonRoom[]): void {
  for (const room of rooms) {
    for (let dy = 0; dy < room.h; dy++) {
      for (let dx = 0; dx < room.w; dx++) setCell(layout, room.x + dx, room.y + dy, DungeonCell.Room);
    }
  }
}

function paintCorridor(layout: DungeonLayout, x: number, y: number, thickness: number): void {
  const reach = Math.max(1, thickness);
  for (let dy = 0; dy < reach; dy++) {
    for (let dx = 0; dx < reach; dx++) {
      const cx = Math.min(Math.max(x + dx, 1), layout.width - 2);
      const cy = Math.min(Math.max(y + dy, 1), layout.height - 2);
      if (cellAt(layout, cx, cy) === DungeonCell.Rock) setCell(layout, cx, cy, DungeonCell.Corridor);
    }
  }
}

function carveElbow(
  layout: DungeonLayout,
  from: { x: number; y: number },
  to: { x: number; y: number },
  thickness: number,
  horizontalFirst: boolean
): void {
  const step = (value: number, target: number) => (value === target ? 0 : value < target ? 1 : -1);
  let { x, y } = from;

  if (horizontalFirst) {
    while (x !== to.x) {
      x += step(x, to.x);
      paintCorridor(layout, x, y, thickness);
    }
    while (y !== to.y) {
      y += step(y, to.y);
      paintCorridor(layout, x, y, thickness);
    }
  } else {
    while (y !== to.y) {
      y += step(y, to.y);
      paintCorridor(layout, x, y, thickness);
    }
    while (x !== to.x) {
      x += step(x, to.x);
      paintCorridor(layout, x, y, thickness);
    }
  }
}

function roomBorderCells(layout: DungeonLayout, room: DungeonRoom): { x: number; y: number }[] {
  // The ring one cell outside the room, corners left out: a corridor only ever arrives square on.
  const cells: { x: number; y: number }[] = [];
  for (let dx = 0; dx < room.w; dx++) {
    cells.push({ x: room.x + dx, y: room.y - 1 }, { x: room.x + dx, y: room.y + room.h });
  }
  for (let dy = 0; dy < room.h; dy++) {
    cells.push({ x: room.x - 1, y: room.y + dy }, { x: room.x + room.w, y: room.y + dy });
  }
  return cells.filter((cell) => cellAt(layout, cell.x, cell.y) === DungeonCell.Corridor);
}

function markDoors(layout: DungeonLayout, rooms: readonly DungeonRoom[]): DungeonDoor[] {
  const roomsAt = new Map<number, Set<number>>();
  for (const room of rooms) {
    for (const cell of roomBorderCells(layout, room)) {
      const index = cell.y * layout.width + cell.x;
      const owners = roomsAt.get(index) ?? new Set<number>();
      owners.add(room.index);
      roomsAt.set(index, owners);
    }
  }

  const chosen = new Set<number>();
  for (const room of rooms) {
    const openings = roomBorderCells(layout, room).map((cell) => cell.y * layout.width + cell.x);
    const claimed = new Set<number>();

    for (const index of openings) {
      if (chosen.has(index)) {
        claimed.add(index);
        continue;
      }
      const x = index % layout.width;
      const y = Math.floor(index / layout.width);
      // One opening gets one door, so a corridor running two wide does not grow a second leaf.
      const nextToClaimed = [index - 1, index + 1, index - layout.width, index + layout.width].some((side) =>
        claimed.has(side)
      );
      if (nextToClaimed) continue;
      chosen.add(index);
      claimed.add(index);
      setCell(layout, x, y, DungeonCell.Door);
    }
  }

  return [...chosen]
    .sort((left, right) => left - right)
    .map((index) => ({
      x: index % layout.width,
      y: Math.floor(index / layout.width),
      rooms: [...(roomsAt.get(index) ?? new Set<number>())].sort((left, right) => left - right),
      locked: false,
    }));
}

function breakWalls(layout: DungeonLayout, chance: number, rng: () => number): void {
  if (chance <= 0) return;
  const doomed: number[] = [];

  for (let y = 1; y < layout.height - 1; y++) {
    for (let x = 1; x < layout.width - 1; x++) {
      if (cellAt(layout, x, y) !== DungeonCell.Rock) continue;
      const open =
        cellAt(layout, x + 1, y) !== DungeonCell.Rock ||
        cellAt(layout, x - 1, y) !== DungeonCell.Rock ||
        cellAt(layout, x, y + 1) !== DungeonCell.Rock ||
        cellAt(layout, x, y - 1) !== DungeonCell.Rock;
      if (open && rng() < chance) doomed.push(y * layout.width + x);
    }
  }

  for (const index of doomed) layout.cells[index] = DungeonCell.Corridor;
}

export function generateRoomsAndCorridors(params: RoomsAndCorridorsParams, rng: () => number): DungeonLayout {
  const layout: DungeonLayout = {
    width: params.width,
    height: params.height,
    cells: new Uint8Array(params.width * params.height).fill(DungeonCell.Rock),
    rooms: [],
    doors: [],
    links: [],
    entrance: { x: 0, y: 0 },
    exit: { x: 0, y: 0 },
    keyRoomIndex: -1,
    seed: params.seed,
  };

  const rooms = placeRooms(params, rng);
  layout.rooms = rooms;
  carveRooms(layout, rooms);

  const centers = rooms.map(roomCenter);
  const tree = spanningTree(centers);
  const loops = extraLinks(centers, tree, Math.floor(params.extraLoopRatio * rooms.length));
  layout.links = [...tree, ...loops];

  for (const [from, to] of layout.links) {
    carveElbow(layout, centers[from], centers[to], params.corridorWidth, rng() < 0.5);
  }

  breakWalls(layout, params.wallBreakChance, rng);
  layout.doors = markDoors(layout, rooms);

  const start = centers[0] ?? { x: 1, y: 1 };
  layout.entrance = { ...start };
  layout.exit = { ...start };

  return layout;
}
