import { seededRandom } from '@axe/core/util/seeded-random';
import {
  cellAt,
  countOpenCells,
  DungeonCell,
  DungeonLayout,
  reachableCells,
} from '@axe/domain/tabletop/dungeon/dungeon-layout';
import { generateRoomsAndCorridors, RoomsAndCorridorsParams } from '@axe/domain/tabletop/dungeon/rooms-and-corridors';

const SEEDS = [1, 7, 42, 1234, 99999];

function params(overrides: Partial<RoomsAndCorridorsParams> = {}): RoomsAndCorridorsParams {
  return {
    width: 40,
    height: 30,
    roomCount: 8,
    minRoom: 5,
    maxRoom: 10,
    corridorWidth: 1,
    extraLoopRatio: 0.15,
    wallBreakChance: 0,
    seed: 1,
    ...overrides,
  };
}

function build(overrides: Partial<RoomsAndCorridorsParams> = {}): DungeonLayout {
  const settings = params(overrides);
  return generateRoomsAndCorridors(settings, seededRandom(settings.seed));
}

function borderIsAllRock(layout: DungeonLayout): boolean {
  for (let x = 0; x < layout.width; x++) {
    if (cellAt(layout, x, 0) !== DungeonCell.Rock) return false;
    if (cellAt(layout, x, layout.height - 1) !== DungeonCell.Rock) return false;
  }
  for (let y = 0; y < layout.height; y++) {
    if (cellAt(layout, 0, y) !== DungeonCell.Rock) return false;
    if (cellAt(layout, layout.width - 1, y) !== DungeonCell.Rock) return false;
  }
  return true;
}

describe('generateRoomsAndCorridors()', () => {
  it('gives the same dungeon back for the same seed', () => {
    expect(Array.from(build({ seed: 42 }).cells)).toEqual(Array.from(build({ seed: 42 }).cells));
  });

  it('gives a different dungeon for a different seed', () => {
    expect(Array.from(build({ seed: 42 }).cells)).not.toEqual(Array.from(build({ seed: 43 }).cells));
  });

  it('never places more rooms than asked for', () => {
    for (const seed of SEEDS) {
      expect(build({ seed }).rooms.length).toBeLessThanOrEqual(8);
    }
  });

  it('places the rooms it was asked for on a board with the space', () => {
    for (const seed of SEEDS) {
      expect(build({ seed }).rooms.length).toBe(8);
    }
  });

  it('keeps a wall between every pair of rooms', () => {
    for (const seed of SEEDS) {
      const rooms = build({ seed }).rooms;
      for (let a = 0; a < rooms.length; a++) {
        for (let b = a + 1; b < rooms.length; b++) {
          const left = rooms[a];
          const right = rooms[b];
          const touching =
            left.x <= right.x + right.w &&
            right.x <= left.x + left.w &&
            left.y <= right.y + right.h &&
            right.y <= left.y + left.h;
          expect(touching).toBe(false);
        }
      }
    }
  });

  it('leaves every open cell reachable from the entrance', () => {
    for (const seed of SEEDS) {
      const layout = build({ seed });
      expect(reachableCells(layout, layout.entrance).size).toBe(countOpenCells(layout));
    }
  });

  it('keeps the outer ring solid', () => {
    for (const seed of SEEDS) {
      expect(borderIsAllRock(build({ seed }))).toBe(true);
    }
  });

  it('gives every room at least one door', () => {
    for (const seed of SEEDS) {
      const layout = build({ seed });
      for (const room of layout.rooms) {
        expect(layout.doors.some((door) => door.rooms.includes(room.index))).toBe(true);
      }
    }
  });

  it('never puts two doors in the same cell', () => {
    const layout = build({ seed: 7 });
    const cells = layout.doors.map((door) => `${door.x},${door.y}`);

    expect(new Set(cells).size).toBe(cells.length);
  });

  it('names every room a door serves', () => {
    const layout = build({ seed: 7 });

    for (const door of layout.doors) {
      expect(door.rooms.length).toBeGreaterThan(0);
      for (const index of door.rooms) {
        const room = layout.rooms[index];
        const touching =
          door.x >= room.x - 1 && door.x <= room.x + room.w && door.y >= room.y - 1 && door.y <= room.y + room.h;
        expect(touching).toBe(true);
      }
    }
  });

  it('marks every door cell as a door', () => {
    const layout = build();
    for (const door of layout.doors) {
      expect(cellAt(layout, door.x, door.y)).toBe(DungeonCell.Door);
    }
  });

  it('leaves the dungeon whole even when walls crumble', () => {
    for (const seed of SEEDS) {
      const layout = build({ seed, wallBreakChance: 0.12 });
      expect(reachableCells(layout, layout.entrance).size).toBe(countOpenCells(layout));
      expect(borderIsAllRock(layout)).toBe(true);
    }
  });

  it('opens more of the board when walls crumble', () => {
    const plain = countOpenCells(build({ seed: 7 }));
    const ruined = countOpenCells(build({ seed: 7, wallBreakChance: 0.2 }));

    expect(ruined).toBeGreaterThan(plain);
  });

  it('joins the rooms with one link fewer than there are rooms, plus the loops', () => {
    const layout = build({ seed: 7, roomCount: 8, extraLoopRatio: 0.25 });

    expect(layout.links.length).toBe(layout.rooms.length - 1 + Math.floor(0.25 * layout.rooms.length));
  });

  it('copes with a board too small for the rooms it was asked for', () => {
    const layout = build({ width: 12, height: 12, roomCount: 8, minRoom: 5, maxRoom: 10 });

    expect(layout.rooms.length).toBeLessThan(8);
    expect(reachableCells(layout, layout.entrance).size).toBe(countOpenCells(layout));
  });
});
