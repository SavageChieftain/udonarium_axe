import { TabletopLocation } from '@axe/domain/tabletop/tabletop-object';

export function centerFollowerOnCharacter(
  follower: { location: TabletopLocation },
  character: { location: TabletopLocation; size: number },
  gridSize: number
): void {
  follower.location.x = character.location.x + (gridSize * character.size) / 2;
  follower.location.y = character.location.y + (gridSize * character.size) / 2;
}
