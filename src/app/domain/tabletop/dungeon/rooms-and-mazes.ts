import {
  DungeonCell,
  DungeonDoor,
  DungeonLayout,
  DungeonRoom,
  DungeonRoomRole,
  firstCellOf,
} from '@axe/domain/tabletop/dungeon/dungeon-layout';
import { ROOM_SHAPES, RoomShape, shapeCells, shapeFits } from '@axe/domain/tabletop/dungeon/room-shapes';

export interface RoomsAndMazesParams {
  width: number;
  height: number;
  roomCount: number;
  minRoom: number;
  maxRoom: number;
  /** How much the passages twist. At nothing they run dead straight; at a hundred they never do. */
  windingPercent: number;
  /** How often a join that is no longer needed is opened anyway, which is what makes loops. */
  extraConnectorChance: number;
  wallBreakChance: number;
  shapes: readonly RoomShape[];
  seed: number;
}

const PLACEMENT_TRIES_PER_ROOM = 60;
const DIRECTIONS: readonly [number, number][] = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
];

/**
 * Rooms first, then a maze through everything left over, then the two joined at the walls.
 *
 * Running a corridor from one room's middle to another's drags it along whatever lies
 * between, and a passage with no stone beside it opens the whole flank of the room it
 * passes. A maze cannot do that: it only ever carves into rock two cells from anything
 * already open, so a wall always stands between a passage and a room it does not serve.
 */
export function generateRoomsAndMazes(params: RoomsAndMazesParams, rng: () => number): DungeonLayout {
  // The maze steps two cells at a time, so the board has to be odd for its far wall to stand.
  const width = params.width % 2 === 0 ? params.width - 1 : params.width;
  const height = params.height % 2 === 0 ? params.height - 1 : params.height;

  const layout: DungeonLayout = {
    width,
    height,
    cells: new Uint8Array(width * height).fill(DungeonCell.Rock),
    rooms: [],
    doors: [],
    links: [],
    entrance: { x: 1, y: 1 },
    exit: { x: 1, y: 1 },
    mouth: null,
    keyRoomIndex: -1,
    seed: params.seed,
  };

  const regions = new Int32Array(width * height).fill(-1);
  /**
   * The whole bounding box of every room, shape or no shape.
   *
   * A circle leaves the corners of its box as rock, and without holding them back the maze
   * carves into them and comes to rest against the room's edge with no wall between.
   */
  const reserved = new Uint8Array(width * height);
  let regionCount = 0;

  const carve = (x: number, y: number, kind: number, region: number) => {
    layout.cells[y * width + x] = kind;
    regions[y * width + x] = region;
  };
  const isSolid = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < width && y < height && regions[y * width + x] === -1 && reserved[y * width + x] === 0;

  regionCount = placeRooms(layout, regions, reserved, params, rng, regionCount);
  regionCount = growMazes(layout, regions, params, rng, regionCount, carve, isSolid);
  layout.doors = joinRegions(layout, regions, params, rng, regionCount);
  pruneDeadEnds(layout);
  crumble(layout, params, rng);
  layout.doors = layout.doors.filter((door) => layout.cells[door.y * width + door.x] === DungeonCell.Door);
  layout.links = deriveLinks(layout);

  const start = firstCellOf(layout, 0);
  layout.entrance = { ...start };
  layout.exit = { ...start };
  return layout;
}

function placeRooms(
  layout: DungeonLayout,
  regions: Int32Array,
  reserved: Uint8Array,
  params: RoomsAndMazesParams,
  rng: () => number,
  regionCount: number
): number {
  const odd = (low: number, high: number) => {
    const span = Math.floor((high - low) / 2) + 1;
    return low + Math.floor(rng() * span) * 2;
  };
  const rooms: DungeonRoom[] = [];
  let region = regionCount;

  for (
    let attempt = 0;
    attempt < params.roomCount * PLACEMENT_TRIES_PER_ROOM && rooms.length < params.roomCount;
    attempt++
  ) {
    const w = odd(params.minRoom, params.maxRoom) | 1;
    const h = odd(params.minRoom, params.maxRoom) | 1;
    if (w + 2 >= layout.width || h + 2 >= layout.height) continue;
    const x = odd(1, layout.width - w - 2);
    const y = odd(1, layout.height - h - 2);
    const bounds = { x, y, w, h };

    const shape = pickShape(params.shapes, bounds, rng);
    const cells = shapeCells(shape, bounds, rng);
    if (cells.length === 0) continue;

    // Grown by one on every side, so two rooms always keep a wall between them.
    let clashes = bounds.x < 1 || bounds.y < 1;
    for (let dy = -1; dy <= bounds.h && !clashes; dy++) {
      for (let dx = -1; dx <= bounds.w && !clashes; dx++) {
        const nx = bounds.x + dx;
        const ny = bounds.y + dy;
        if (nx < 0 || ny < 0 || nx >= layout.width || ny >= layout.height) clashes = true;
        else if (regions[ny * layout.width + nx] !== -1 || reserved[ny * layout.width + nx] !== 0) clashes = true;
      }
    }
    if (clashes) continue;

    for (let dy = 0; dy < bounds.h; dy++) {
      for (let dx = 0; dx < bounds.w; dx++) reserved[(bounds.y + dy) * layout.width + bounds.x + dx] = 1;
    }
    for (const cell of cells) {
      layout.cells[cell.y * layout.width + cell.x] = DungeonCell.Room;
      regions[cell.y * layout.width + cell.x] = region;
    }
    rooms.push({ ...bounds, index: rooms.length, role: DungeonRoomRole.Chamber });
    region++;
  }

  layout.rooms = rooms;
  return region;
}

function pickShape(shapes: readonly RoomShape[], bounds: { w: number; h: number }, rng: () => number): RoomShape {
  const usable = (shapes.length > 0 ? shapes : ROOM_SHAPES).filter((shape) =>
    shapeFits(shape, { x: 0, y: 0, ...bounds })
  );
  if (usable.length === 0) return 'rect';
  return usable[Math.floor(rng() * usable.length)];
}

function growMazes(
  layout: DungeonLayout,
  regions: Int32Array,
  params: RoomsAndMazesParams,
  rng: () => number,
  regionCount: number,
  carve: (x: number, y: number, kind: number, region: number) => void,
  isSolid: (x: number, y: number) => boolean
): number {
  let region = regionCount;

  for (let y = 1; y < layout.height; y += 2) {
    for (let x = 1; x < layout.width; x += 2) {
      if (!isSolid(x, y)) continue;
      growOneMaze(layout, params, rng, region, { x, y }, carve, isSolid);
      region++;
    }
  }

  return region;
}

function growOneMaze(
  layout: DungeonLayout,
  params: RoomsAndMazesParams,
  rng: () => number,
  region: number,
  start: { x: number; y: number },
  carve: (x: number, y: number, kind: number, region: number) => void,
  isSolid: (x: number, y: number) => boolean
): void {
  const stack: { x: number; y: number }[] = [start];
  carve(start.x, start.y, DungeonCell.Corridor, region);
  let lastDir: [number, number] | null = null;

  while (stack.length > 0) {
    const cell = stack[stack.length - 1];
    const open = DIRECTIONS.filter(([dx, dy]) => {
      // Two cells on has to be solid and a third has to exist, or the maze eats its own wall.
      const beyond = { x: cell.x + dx * 3, y: cell.y + dy * 3 };
      if (beyond.x < 0 || beyond.y < 0 || beyond.x >= layout.width || beyond.y >= layout.height) return false;
      return isSolid(cell.x + dx * 2, cell.y + dy * 2);
    });

    if (open.length === 0) {
      stack.pop();
      lastDir = null;
      continue;
    }

    const heading: [number, number] | null = lastDir;
    const straightOn: boolean = heading !== null && open.some(([ox, oy]) => ox === heading[0] && oy === heading[1]);
    const chosen: [number, number] =
      straightOn && heading !== null && rng() * 100 > params.windingPercent
        ? heading
        : open[Math.floor(rng() * open.length)];
    const [dx, dy] = chosen;

    carve(cell.x + dx, cell.y + dy, DungeonCell.Corridor, region);
    carve(cell.x + dx * 2, cell.y + dy * 2, DungeonCell.Corridor, region);
    stack.push({ x: cell.x + dx * 2, y: cell.y + dy * 2 });
    lastDir = [dx, dy];
  }
}

interface Connector {
  x: number;
  y: number;
  regions: number[];
}

function joinRegions(
  layout: DungeonLayout,
  regions: Int32Array,
  params: RoomsAndMazesParams,
  rng: () => number,
  regionCount: number
): DungeonDoor[] {
  const merged = new Int32Array(regionCount);
  for (let index = 0; index < regionCount; index++) merged[index] = index;
  const openRegions = new Set<number>();
  for (let index = 0; index < regionCount; index++) openRegions.add(index);

  let connectors: Connector[] = [];
  for (let y = 1; y < layout.height - 1; y++) {
    for (let x = 1; x < layout.width - 1; x++) {
      if (regions[y * layout.width + x] !== -1) continue;
      const beside = new Set<number>();
      for (const [dx, dy] of DIRECTIONS) {
        const region = regions[(y + dy) * layout.width + x + dx];
        if (region !== -1) beside.add(region);
      }
      if (beside.size >= 2) connectors.push({ x, y, regions: [...beside] });
    }
  }

  const doors: DungeonDoor[] = [];
  const roomOf = roomsByRegion(layout, regions);

  while (openRegions.size > 1 && connectors.length > 0) {
    const chosen = connectors[Math.floor(rng() * connectors.length)];
    openConnector(layout, chosen, roomOf, doors);

    const sources = chosen.regions.map((region) => merged[region]);
    const target = sources[0];
    // A join can touch the same region twice over, or two that have already been joined. Only
    // the ones that are really being swallowed may be struck off, or the survivor goes with them
    // and the count of what is left falls below what is still standing apart.
    const absorbed = [...new Set(sources)].filter((root) => root !== target);
    for (let index = 0; index < regionCount; index++) {
      if (absorbed.includes(merged[index])) merged[index] = target;
    }
    for (const region of absorbed) openRegions.delete(region);

    connectors = connectors.filter((connector) => {
      if (Math.abs(connector.x - chosen.x) + Math.abs(connector.y - chosen.y) < 2) return false;
      const spans = new Set(connector.regions.map((region) => merged[region]));
      if (spans.size > 1) return true;
      // A join that is no longer needed still gets opened now and then, and that is a loop.
      if (rng() < params.extraConnectorChance) openConnector(layout, connector, roomOf, doors);
      return false;
    });
  }

  return doors;
}

function roomsByRegion(layout: DungeonLayout, regions: Int32Array): Map<number, number> {
  const byRegion = new Map<number, number>();
  for (const room of layout.rooms) {
    for (let dy = 0; dy < room.h; dy++) {
      for (let dx = 0; dx < room.w; dx++) {
        const index = (room.y + dy) * layout.width + room.x + dx;
        if (layout.cells[index] === DungeonCell.Room) byRegion.set(regions[index], room.index);
      }
    }
  }
  return byRegion;
}

function openConnector(
  layout: DungeonLayout,
  connector: Connector,
  roomOf: Map<number, number>,
  doors: DungeonDoor[]
): void {
  layout.cells[connector.y * layout.width + connector.x] = DungeonCell.Door;
  const rooms = connector.regions
    .map((region) => roomOf.get(region))
    .filter((index): index is number => index !== undefined);
  doors.push({ x: connector.x, y: connector.y, rooms: [...new Set(rooms)].sort((a, b) => a - b), locked: false });
}

/** A passage that goes nowhere is not a passage; the maze is trimmed back until every stub is gone. */
function pruneDeadEnds(layout: DungeonLayout): void {
  for (;;) {
    let trimmed = false;
    for (let y = 1; y < layout.height - 1; y++) {
      for (let x = 1; x < layout.width - 1; x++) {
        const index = y * layout.width + x;
        if (layout.cells[index] === DungeonCell.Rock) continue;
        if (layout.cells[index] === DungeonCell.Room) continue;

        let exits = 0;
        for (const [dx, dy] of DIRECTIONS) {
          if (layout.cells[(y + dy) * layout.width + x + dx] !== DungeonCell.Rock) exits++;
        }
        if (exits > 1) continue;
        layout.cells[index] = DungeonCell.Rock;
        trimmed = true;
      }
    }
    if (!trimmed) return;
  }
}

function crumble(layout: DungeonLayout, params: RoomsAndMazesParams, rng: () => number): void {
  if (params.wallBreakChance <= 0) return;
  const doomed: number[] = [];

  for (let y = 1; y < layout.height - 1; y++) {
    for (let x = 1; x < layout.width - 1; x++) {
      if (layout.cells[y * layout.width + x] !== DungeonCell.Rock) continue;
      const besideARoom = layout.rooms.some(
        (room) => x >= room.x - 1 && x <= room.x + room.w && y >= room.y - 1 && y <= room.y + room.h
      );
      if (besideARoom) continue;
      let open = 0;
      for (const [dx, dy] of DIRECTIONS) {
        if (layout.cells[(y + dy) * layout.width + x + dx] !== DungeonCell.Rock) open++;
      }
      if (open >= 2 && rng() < params.wallBreakChance) doomed.push(y * layout.width + x);
    }
  }

  for (const index of doomed) layout.cells[index] = DungeonCell.Corridor;
}

/** Which rooms a party can walk between without crossing a third, read off the finished map. */
function deriveLinks(layout: DungeonLayout): [number, number][] {
  const roomAt = new Int32Array(layout.cells.length).fill(-1);
  for (const room of layout.rooms) {
    for (let dy = 0; dy < room.h; dy++) {
      for (let dx = 0; dx < room.w; dx++) {
        const index = (room.y + dy) * layout.width + room.x + dx;
        if (layout.cells[index] === DungeonCell.Room) roomAt[index] = room.index;
      }
    }
  }

  const links = new Set<string>();
  for (const room of layout.rooms) {
    const seen = new Set<number>();
    const queue: number[] = [];
    for (let dy = 0; dy < room.h; dy++) {
      for (let dx = 0; dx < room.w; dx++) {
        const index = (room.y + dy) * layout.width + room.x + dx;
        if (roomAt[index] === room.index) queue.push(index);
      }
    }
    for (const index of queue) seen.add(index);

    for (let head = 0; head < queue.length; head++) {
      const index = queue[head];
      const x = index % layout.width;
      const y = Math.floor(index / layout.width);
      for (const [dx, dy] of DIRECTIONS) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= layout.width || ny >= layout.height) continue;
        const next = ny * layout.width + nx;
        if (seen.has(next) || layout.cells[next] === DungeonCell.Rock) continue;
        seen.add(next);
        const other = roomAt[next];
        if (other !== -1 && other !== room.index) {
          const pair = other < room.index ? [other, room.index] : [room.index, other];
          links.add(pair.join(','));
          continue;
        }
        queue.push(next);
      }
    }
  }

  return [...links].map((key) => key.split(',').map(Number) as [number, number]);
}
