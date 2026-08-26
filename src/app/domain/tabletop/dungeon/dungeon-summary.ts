import { neighboursOf } from '@axe/domain/tabletop/dungeon/dungeon-graph';
import { DungeonLayout, DungeonRoomRole, DungeonRoomRoleValue } from '@axe/domain/tabletop/dungeon/dungeon-layout';

export interface DungeonSummaryLabels {
  roleName(role: DungeonRoomRoleValue): string;
  title: string;
  start: string;
  key: string;
  locked: string;
  torch: string;
}

export interface DungeonSummaryInput {
  layout: DungeonLayout;
  name: string;
  torchRooms: readonly number[];
  labels: DungeonSummaryLabels;
}

/**
 * The sheet the master reads while running the place.
 *
 * A generated dungeon nobody can describe is a floor plan, not an adventure, so every
 * room gets a number, a part to play, what it joins, and whatever was put in it.
 */
export function buildDungeonSummary(input: DungeonSummaryInput): string {
  const { layout, labels } = input;
  const neighbours = neighboursOf(layout.links, layout.rooms.length);
  const lockedRooms = new Set(layout.doors.filter((door) => door.locked).flatMap((door) => door.rooms));
  const torches = new Set(input.torchRooms);

  const lines = [
    `${input.name} / ${labels.title} ${layout.seed} / ${layout.width}x${layout.height}`,
    `${labels.start}: #1 (${layout.entrance.x}, ${layout.entrance.y})`,
    '',
  ];

  for (const room of layout.rooms) {
    const joins = neighbours[room.index]
      .slice()
      .sort((left, right) => left - right)
      .map((index) => {
        // A locked door usually names only the room it seals, so either end being sealed shuts the way.
        const shut = lockedRooms.has(room.index) || lockedRooms.has(index);
        return `#${index + 1}${shut ? `(${labels.locked})` : ''}`;
      })
      .join(' ');

    const notes: string[] = [];
    if (layout.keyRoomIndex === room.index) notes.push(labels.key);
    if (torches.has(room.index)) notes.push(labels.torch);

    const cells = [
      `#${room.index + 1}`,
      labels.roleName(room.role),
      `${room.w}x${room.h}`,
      joins.length > 0 ? `-> ${joins}` : '',
      notes.join(' '),
    ];
    lines.push(cells.filter((cell) => cell.length > 0).join('  '));
  }

  return lines.join('\n');
}

export function defaultRoleOrder(): DungeonRoomRoleValue[] {
  return [
    DungeonRoomRole.Entrance,
    DungeonRoomRole.Hall,
    DungeonRoomRole.Treasure,
    DungeonRoomRole.Boss,
    DungeonRoomRole.DeadEnd,
    DungeonRoomRole.Chamber,
  ];
}
