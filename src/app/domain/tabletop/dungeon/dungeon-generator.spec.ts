import {
  atmosphereById,
  DUNGEON_ATMOSPHERE_IDS,
  DUNGEON_ATMOSPHERES,
} from '@axe/domain/tabletop/dungeon/dungeon-atmosphere';
import { DUNGEON_MAX_TERRAINS, MAX_MERGE_SPAN, syncObjectCount } from '@axe/domain/tabletop/dungeon/dungeon-blocks';
import {
  boardSizeFor,
  clampRoomCount,
  generateDungeon,
  MAX_BOARD_HEIGHT,
  MAX_BOARD_WIDTH,
  planDungeon,
} from '@axe/domain/tabletop/dungeon/dungeon-generator';
import { cellAt, countOpenCells, DungeonCell, reachableCells } from '@axe/domain/tabletop/dungeon/dungeon-layout';

const SEEDS = [1, 7, 42, 1234, 99999];

describe('clampRoomCount()', () => {
  it('holds the count between three and twenty', () => {
    expect(clampRoomCount(0)).toBe(3);
    expect(clampRoomCount(99)).toBe(20);
    expect(clampRoomCount(8)).toBe(8);
    expect(clampRoomCount(Number.NaN)).toBe(3);
  });
});

describe('boardSizeFor()', () => {
  it('grows the board with the number of rooms', () => {
    const rooms = DUNGEON_ATMOSPHERES.stoneDungeon;

    // A maze fills whatever rock is left over, so the board is kept snug and always odd.
    expect(boardSizeFor(rooms, 3)).toEqual({ width: 27, height: 19 });
    expect(boardSizeFor(rooms, 8)).toEqual({ width: 35, height: 27 });
    expect(boardSizeFor(rooms, 20)).toEqual({ width: 49, height: 37 });
  });

  it('never lets the board outgrow one scratch mask', () => {
    for (const id of DUNGEON_ATMOSPHERE_IDS) {
      for (const rooms of [3, 8, 12, 16, 20, 99]) {
        const size = boardSizeFor(atmosphereById(id), rooms);
        expect(size.width).toBeLessThanOrEqual(MAX_BOARD_WIDTH);
        expect(size.height).toBeLessThanOrEqual(MAX_BOARD_HEIGHT);
      }
    }
  });

  it('gives a cave a smaller board than a set of rooms', () => {
    const rooms = boardSizeFor(DUNGEON_ATMOSPHERES.stoneDungeon, 12);
    const cave = boardSizeFor(DUNGEON_ATMOSPHERES.cavern, 12);

    expect(cave.width).toBeLessThan(rooms.width);
    expect(cave.height).toBeLessThan(rooms.height);
  });
});

describe('generateDungeon()', () => {
  it('sends each atmosphere to the shape it asks for', () => {
    for (const id of DUNGEON_ATMOSPHERE_IDS) {
      const layout = generateDungeon({ atmosphere: id, roomCount: 8, seed: 7 });
      const size = boardSizeFor(atmosphereById(id), 8);

      expect({ width: layout.width, height: layout.height }).toEqual(size);
    }
  });

  it('leaves every dungeon walkable end to end', () => {
    for (const id of DUNGEON_ATMOSPHERE_IDS) {
      for (const seed of SEEDS) {
        const layout = generateDungeon({ atmosphere: id, roomCount: 8, seed });
        expect(reachableCells(layout, layout.entrance).size).toBe(countOpenCells(layout));
      }
    }
  });

  it('gives back the same dungeon for the same request', () => {
    const first = generateDungeon({ atmosphere: 'stoneDungeon', roomCount: 8, seed: 55 });
    const second = generateDungeon({ atmosphere: 'stoneDungeon', roomCount: 8, seed: 55 });

    expect(Array.from(first.cells)).toEqual(Array.from(second.cells));
  });

  it('falls back to the stone dungeon for an atmosphere it does not know', () => {
    const layout = generateDungeon({ atmosphere: 'nonsense' as never, roomCount: 8, seed: 7 });

    expect({ width: layout.width, height: layout.height }).toEqual(boardSizeFor(DUNGEON_ATMOSPHERES.stoneDungeon, 8));
  });
});

describe('planDungeon()', () => {
  it('stays inside the terrain budget for every atmosphere at any size', () => {
    for (const id of DUNGEON_ATMOSPHERE_IDS) {
      for (const rooms of [8, 20]) {
        for (const seed of SEEDS) {
          const plan = planDungeon({ atmosphere: id, roomCount: rooms, seed });
          expect(plan.blocks.blocks.length).toBeLessThanOrEqual(DUNGEON_MAX_TERRAINS);
        }
      }
    }
  });

  it('counts twelve objects to sync for every terrain', () => {
    const plan = planDungeon({ atmosphere: 'stoneDungeon', roomCount: 8, seed: 7 });

    expect(syncObjectCount(plan.blocks.blocks)).toBe(plan.blocks.blocks.length * 12);
  });

  it('never merges a block longer than the span', () => {
    const plan = planDungeon({ atmosphere: 'stoneDungeon', roomCount: 12, seed: 7 });

    for (const block of plan.blocks.blocks) {
      expect(block.rect.w).toBeLessThanOrEqual(MAX_MERGE_SPAN);
      expect(block.rect.h).toBeLessThanOrEqual(MAX_MERGE_SPAN);
    }
  });

  it('leaves out the doors and the stairs when told to', () => {
    const plan = planDungeon(
      { atmosphere: 'stoneDungeon', roomCount: 8, seed: 7 },
      { placeDoors: false, placeStairs: false }
    );

    expect(plan.blocks.blocks.some((block) => block.kind === 'door')).toBe(false);
    expect(plan.blocks.blocks.some((block) => block.kind.startsWith('stair'))).toBe(false);
  });

  it('stands no more torches than the atmosphere asks for', () => {
    for (const id of DUNGEON_ATMOSPHERE_IDS) {
      const plan = planDungeon({ atmosphere: id, roomCount: 12, seed: 7 });

      expect(plan.blocks.torchSpots.length).toBeLessThanOrEqual(atmosphereById(id).torches);
      expect(plan.blocks.torchSpots.length).toBe(plan.blocks.torchRooms.length);
    }
  });

  it('stands every torch on open floor beside a wall, never inside the rock', () => {
    // A light on a merged rock block stops the block blocking light, opening a hole its whole size.
    for (const id of DUNGEON_ATMOSPHERE_IDS) {
      const plan = planDungeon({ atmosphere: id, roomCount: 12, seed: 7 });
      for (const spot of plan.blocks.torchSpots) {
        expect(cellAt(plan.layout, spot.x, spot.y)).not.toBe(DungeonCell.Rock);
        const beside =
          cellAt(plan.layout, spot.x + 1, spot.y) === DungeonCell.Rock ||
          cellAt(plan.layout, spot.x - 1, spot.y) === DungeonCell.Rock ||
          cellAt(plan.layout, spot.x, spot.y + 1) === DungeonCell.Rock ||
          cellAt(plan.layout, spot.x, spot.y - 1) === DungeonCell.Rock;
        expect(beside).toBe(true);
      }
    }
  });

  it('lets light past a floor and stops it at a wall that faces open ground', () => {
    const plan = planDungeon({ atmosphere: 'stoneDungeon', roomCount: 8, seed: 7 });
    const floors = plan.blocks.blocks.filter((block) => block.kind === 'floor');
    const walls = plan.blocks.blocks.filter((block) => block.kind === 'wall');

    expect(floors.every((block) => !block.blocksSight)).toBe(true);
    expect(walls.some((block) => block.blocksSight)).toBe(true);
  });

  it('spares the sight test the stone buried behind other stone', () => {
    // How much stone ends up buried depends on the shape, so it is only checked where there is some.
    for (const seed of SEEDS) {
      const plan = planDungeon({ atmosphere: 'stoneDungeon', roomCount: 20, seed });
      for (const block of plan.blocks.blocks) {
        if (block.kind !== 'wall' || block.blocksSight) continue;
        expect(block.rooms).toEqual([]);
      }
    }
  });
});

describe('the atmosphere table', () => {
  it('has an entry for every id', () => {
    for (const id of DUNGEON_ATMOSPHERE_IDS) {
      expect(DUNGEON_ATMOSPHERES[id].id).toBe(id);
    }
  });

  it('carries the shape its algorithm needs', () => {
    for (const id of DUNGEON_ATMOSPHERE_IDS) {
      const atmosphere = DUNGEON_ATMOSPHERES[id];
      if (atmosphere.algorithm === 'cave') expect(atmosphere.cave).toBeDefined();
      else expect(atmosphere.rooms).toBeDefined();
    }
  });
});
