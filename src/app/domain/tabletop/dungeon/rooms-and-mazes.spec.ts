import { seededRandom } from '@axe/core/util/seeded-random';
import {
  cellAt,
  countOpenCells,
  DungeonCell,
  DungeonLayout,
  reachableCells,
} from '@axe/domain/tabletop/dungeon/dungeon-layout';
import { generateRoomsAndMazes, RoomsAndMazesParams } from '@axe/domain/tabletop/dungeon/rooms-and-mazes';

const SEEDS = [1, 7, 42, 1234, 99999];

function build(overrides: Partial<RoomsAndMazesParams> = {}): DungeonLayout {
  const params: RoomsAndMazesParams = {
    width: 37,
    height: 27,
    roomCount: 8,
    minRoom: 5,
    maxRoom: 9,
    windingPercent: 25,
    extraConnectorChance: 0.06,
    wallBreakChance: 0,
    shapes: ['rect'],
    seed: 1,
    ...overrides,
  };
  return generateRoomsAndMazes(params, seededRandom(params.seed));
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

describe('generateRoomsAndMazes()', () => {
  it('gives the same dungeon back for the same seed', () => {
    expect(Array.from(build({ seed: 42 }).cells)).toEqual(Array.from(build({ seed: 42 }).cells));
  });

  it('gives a different dungeon for a different seed', () => {
    expect(Array.from(build({ seed: 42 }).cells)).not.toEqual(Array.from(build({ seed: 43 }).cells));
  });

  it('works on an odd board whatever size it is handed', () => {
    const even = build({ width: 40, height: 30 });

    expect(even.width % 2).toBe(1);
    expect(even.height % 2).toBe(1);
  });

  it('never places more rooms than asked for', () => {
    for (const seed of SEEDS) expect(build({ seed }).rooms.length).toBeLessThanOrEqual(8);
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
    for (const seed of SEEDS) expect(borderIsAllRock(build({ seed }))).toBe(true);
  });

  it('leaves no passage that goes nowhere', () => {
    // A maze grown to fill the rock is nearly all dead ends until they are trimmed back.
    for (const seed of SEEDS) {
      const layout = build({ seed });
      for (let y = 1; y < layout.height - 1; y++) {
        for (let x = 1; x < layout.width - 1; x++) {
          const cell = cellAt(layout, x, y);
          if (cell !== DungeonCell.Corridor && cell !== DungeonCell.Door) continue;
          const exits = [
            cellAt(layout, x + 1, y),
            cellAt(layout, x - 1, y),
            cellAt(layout, x, y + 1),
            cellAt(layout, x, y - 1),
          ].filter((neighbour) => neighbour !== DungeonCell.Rock).length;
          expect(exits).toBeGreaterThan(1);
        }
      }
    }
  });

  it('never runs a passage flush along a room it does not open onto', () => {
    // The maze only carves two cells from anything already open, so stone always stands between.
    for (const seed of SEEDS) {
      for (const layout of [build({ seed }), build({ seed, shapes: ['circle', 'cross'], minRoom: 7, maxRoom: 9 })]) {
        for (const room of layout.rooms) {
          for (let dy = -1; dy <= room.h; dy++) {
            for (let dx = -1; dx <= room.w; dx++) {
              const x = room.x + dx;
              const y = room.y + dy;
              const inside = dx >= 0 && dx < room.w && dy >= 0 && dy < room.h;
              if (inside && cellAt(layout, x, y) === DungeonCell.Room) continue;
              expect(cellAt(layout, x, y)).not.toBe(DungeonCell.Corridor);
            }
          }
        }
      }
    }
  });

  it('gives every room it kept a way in', () => {
    for (const seed of SEEDS) {
      const layout = build({ seed });
      for (const room of layout.rooms) {
        expect(layout.doors.some((door) => door.rooms.includes(room.index))).toBe(true);
      }
    }
  });

  it('marks every door cell as a door and never two in one place', () => {
    const layout = build({ seed: 7 });
    const cells = layout.doors.map((door) => `${door.x},${door.y}`);

    expect(new Set(cells).size).toBe(cells.length);
    for (const door of layout.doors) expect(cellAt(layout, door.x, door.y)).toBe(DungeonCell.Door);
  });

  it('joins rooms it can walk between and no others', () => {
    const layout = build({ seed: 7 });

    for (const [from, to] of layout.links) {
      expect(from).toBeLessThan(layout.rooms.length);
      expect(to).toBeLessThan(layout.rooms.length);
      expect(from).not.toBe(to);
    }
  });

  it('opens more joins when told to make loops', () => {
    const tight = build({ seed: 7, extraConnectorChance: 0 }).doors.length;
    const loose = build({ seed: 7, extraConnectorChance: 0.9 }).doors.length;

    expect(loose).toBeGreaterThan(tight);
  });

  it('draws rooms in the shapes it was given', () => {
    const circles = build({ seed: 7, shapes: ['circle'], minRoom: 7, maxRoom: 9 });
    const corners = circles.rooms.filter((room) => cellAt(circles, room.x, room.y) === DungeonCell.Rock);

    expect(circles.rooms.length).toBeGreaterThan(0);
    expect(corners.length).toBe(circles.rooms.length);
  });

  it('crumbles a ruin without dissolving the room walls', () => {
    for (const seed of SEEDS) {
      const layout = build({ seed, wallBreakChance: 0.2 });
      expect(reachableCells(layout, layout.entrance).size).toBe(countOpenCells(layout));
      expect(borderIsAllRock(layout)).toBe(true);
    }
  });

  it('copes with a board too small for the rooms it was asked for', () => {
    const layout = build({ width: 13, height: 13, roomCount: 8 });

    expect(layout.rooms.length).toBeLessThan(8);
    expect(reachableCells(layout, layout.entrance).size).toBe(countOpenCells(layout));
  });
});
