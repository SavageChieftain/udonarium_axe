import { hopDistances, neighboursOf, pathBetween } from '@axe/domain/tabletop/dungeon/dungeon-graph';
import {
  cellAt,
  DungeonCell,
  DungeonDoor,
  DungeonLayout,
  DungeonRoom,
  DungeonRoomRole,
  DungeonRoomRoleValue,
  roomCenter,
  setCell,
} from '@axe/domain/tabletop/dungeon/dungeon-layout';

function leafRooms(layout: DungeonLayout): number[] {
  const neighbours = neighboursOf(layout.links, layout.rooms.length);
  return layout.rooms.map((room) => room.index).filter((index) => neighbours[index].length <= 1);
}

function farthestFrom(distances: readonly number[], exclude: ReadonlySet<number>): number {
  let best = -1;
  let bestDistance = -1;
  distances.forEach((distance, index) => {
    if (exclude.has(index) || distance < 0) return;
    if (distance > bestDistance) {
      bestDistance = distance;
      best = index;
    }
  });
  return best;
}

function largestRoom(layout: DungeonLayout, exclude: ReadonlySet<number>): number {
  let best = -1;
  let bestArea = -1;
  for (const room of layout.rooms) {
    if (exclude.has(room.index)) continue;
    const area = room.w * room.h;
    if (area > bestArea) {
      bestArea = area;
      best = room.index;
    }
  }
  return best;
}

/**
 * Give each room a part to play, then lock the last door before the deepest room
 * and hide its key off that path.
 *
 * Rooms that all look the same give a party no reason to pick one way over another,
 * and a dungeon with nothing shut gives them nothing to solve.
 */
export function assignRoomRoles(layout: DungeonLayout): void {
  if (layout.rooms.length === 0) return;

  const taken = new Set<number>();
  const roles = new Map<number, DungeonRoomRoleValue>();
  const distances = hopDistances(layout.links, layout.rooms.length, 0);

  roles.set(0, DungeonRoomRole.Entrance);
  taken.add(0);

  const boss = farthestFrom(distances, taken);
  if (boss >= 0) {
    roles.set(boss, DungeonRoomRole.Boss);
    taken.add(boss);
  }

  const leaves = leafRooms(layout).filter((index) => !taken.has(index));
  const treasure = farthestFrom(
    distances.map((distance, index) => (leaves.includes(index) ? distance : -1)),
    taken
  );
  if (treasure >= 0) {
    roles.set(treasure, DungeonRoomRole.Treasure);
    taken.add(treasure);
  }

  const hall = largestRoom(layout, taken);
  if (hall >= 0) {
    roles.set(hall, DungeonRoomRole.Hall);
    taken.add(hall);
  }

  for (const index of leafRooms(layout)) {
    if (!roles.has(index)) roles.set(index, DungeonRoomRole.DeadEnd);
  }

  for (const room of layout.rooms) {
    room.role = roles.get(room.index) ?? DungeonRoomRole.Chamber;
  }

  const exitRoom = boss >= 0 ? boss : 0;
  layout.entrance = roomCenter(layout.rooms[0]);
  layout.exit = roomCenter(layout.rooms[exitRoom]);

  lockTheWayToTheBoss(layout, exitRoom);
}

/**
 * Turn every opening in a room's wall into a locked door.
 *
 * Counting the doors already marked is not enough: a corridor two cells wide leaves one
 * cell as a plain opening beside the door, and a single gap makes the key an ornament.
 */
function sealRoom(layout: DungeonLayout, roomIndex: number): DungeonDoor[] {
  const room: DungeonRoom | undefined = layout.rooms[roomIndex];
  if (!room) return [];

  const ring: { x: number; y: number }[] = [];
  for (let dx = 0; dx < room.w; dx++) {
    ring.push({ x: room.x + dx, y: room.y - 1 }, { x: room.x + dx, y: room.y + room.h });
  }
  for (let dy = 0; dy < room.h; dy++) {
    ring.push({ x: room.x - 1, y: room.y + dy }, { x: room.x + room.w, y: room.y + dy });
  }

  const sealed: DungeonDoor[] = [];
  for (const cell of ring) {
    const value = cellAt(layout, cell.x, cell.y);
    if (value !== DungeonCell.Corridor && value !== DungeonCell.Door) continue;
    setCell(layout, cell.x, cell.y, DungeonCell.Door);

    const existing = layout.doors.find((door) => door.x === cell.x && door.y === cell.y);
    if (existing) {
      existing.locked = true;
      if (!existing.rooms.includes(roomIndex)) existing.rooms.push(roomIndex);
      sealed.push(existing);
      continue;
    }
    const added: DungeonDoor = { x: cell.x, y: cell.y, rooms: [roomIndex], locked: true };
    layout.doors.push(added);
    sealed.push(added);
  }

  layout.doors.sort((left, right) => left.y * layout.width + left.x - (right.y * layout.width + right.x));
  return sealed;
}

/** Which rooms can still be walked to from the entrance once the deepest room is shut off. */
function reachableWithout(layout: DungeonLayout, blocked: number): Set<number> {
  const neighbours = neighboursOf(layout.links, layout.rooms.length);
  const seen = new Set<number>([0]);
  const queue = [0];
  for (let head = 0; head < queue.length; head++) {
    for (const next of neighbours[queue[head]]) {
      if (next === blocked || seen.has(next)) continue;
      seen.add(next);
      queue.push(next);
    }
  }
  return seen;
}

function lockTheWayToTheBoss(layout: DungeonLayout, boss: number): void {
  layout.keyRoomIndex = -1;
  for (const door of layout.doors) door.locked = false;
  if (boss === 0) return;

  const path = pathBetween(layout.links, layout.rooms.length, 0, boss);
  if (path.length < 2) return;

  // The key has to be somewhere the party can walk to without going through the room it opens.
  const onPath = new Set(path);
  const reachable = reachableWithout(layout, boss);
  const candidates = leafRooms(layout).filter((index) => !onPath.has(index) && reachable.has(index));
  if (candidates.length === 0) return;

  if (sealRoom(layout, boss).length === 0) return;
  layout.keyRoomIndex = candidates[candidates.length - 1];
}
