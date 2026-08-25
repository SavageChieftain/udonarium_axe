import { seededRandom } from '@axe/core/util/seeded-random';
import { pathBetween } from '@axe/domain/tabletop/dungeon/dungeon-graph';
import { DungeonLayout, DungeonRoomRole } from '@axe/domain/tabletop/dungeon/dungeon-layout';
import { assignRoomRoles } from '@axe/domain/tabletop/dungeon/room-roles';
import { generateRoomsAndCorridors, RoomsAndCorridorsParams } from '@axe/domain/tabletop/dungeon/rooms-and-corridors';

const SEEDS = [1, 7, 42, 1234, 99999];

function build(overrides: Partial<RoomsAndCorridorsParams> = {}): DungeonLayout {
  const settings: RoomsAndCorridorsParams = {
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
  const layout = generateRoomsAndCorridors(settings, seededRandom(settings.seed));
  assignRoomRoles(layout);
  return layout;
}

function roleOf(layout: DungeonLayout, role: string): number {
  return layout.rooms.findIndex((room) => room.role === role);
}

describe('assignRoomRoles()', () => {
  it('makes the first room the way in', () => {
    for (const seed of SEEDS) {
      expect(build({ seed }).rooms[0].role).toBe(DungeonRoomRole.Entrance);
    }
  });

  it('puts the way out at the middle of the deepest room', () => {
    for (const seed of SEEDS) {
      const layout = build({ seed });
      const boss = layout.rooms.find((room) => room.role === DungeonRoomRole.Boss);
      expect(boss).toBeDefined();
      expect(layout.exit).toEqual({
        x: boss!.x + Math.floor(boss!.w / 2),
        y: boss!.y + Math.floor(boss!.h / 2),
      });
    }
  });

  it('never gives two rooms the same singular part', () => {
    for (const seed of SEEDS) {
      const layout = build({ seed });
      for (const role of [
        DungeonRoomRole.Entrance,
        DungeonRoomRole.Boss,
        DungeonRoomRole.Treasure,
        DungeonRoomRole.Hall,
      ]) {
        expect(layout.rooms.filter((room) => room.role === role).length).toBeLessThanOrEqual(1);
      }
    }
  });

  it('gives every room some part to play', () => {
    for (const seed of SEEDS) {
      for (const room of build({ seed }).rooms) {
        expect(Object.values(DungeonRoomRole)).toContain(room.role);
      }
    }
  });

  it('locks at most one door', () => {
    for (const seed of SEEDS) {
      expect(build({ seed }).doors.filter((door) => door.locked).length).toBeLessThanOrEqual(1);
    }
  });

  it('locks a door on the way to the deepest room', () => {
    for (const seed of SEEDS) {
      const layout = build({ seed });
      const locked = layout.doors.find((door) => door.locked);
      if (!locked) continue;
      const boss = roleOf(layout, DungeonRoomRole.Boss);
      expect(locked.rooms).toContain(boss);
    }
  });

  it('hides the key away from the road to the deepest room', () => {
    for (const seed of SEEDS) {
      const layout = build({ seed });
      if (layout.keyRoomIndex < 0) continue;
      const boss = roleOf(layout, DungeonRoomRole.Boss);
      const road = new Set(pathBetween(layout.links, layout.rooms.length, 0, boss));
      expect(road.has(layout.keyRoomIndex)).toBe(false);
    }
  });

  it('leaves everything open when there is nowhere to hide a key', () => {
    const layout = build({ roomCount: 2, width: 24, height: 20, minRoom: 4, maxRoom: 6 });

    expect(layout.doors.every((door) => !door.locked)).toBe(true);
    expect(layout.keyRoomIndex).toBe(-1);
  });

  it('does nothing to a dungeon with no rooms at all', () => {
    const layout = build({ roomCount: 0 });

    expect(layout.rooms).toEqual([]);
    expect(layout.keyRoomIndex).toBe(-1);
  });
});
