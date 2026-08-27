import { ObjectStore } from '@axe/core/sync/object-store';
import { GameTable } from '@axe/domain/tabletop/game-table';
import { LightSource } from '@axe/domain/tabletop/light-source';

/**
 * The lights standing on a table.
 *
 * A light belongs to its table the way terrain does, so that clearing the table clears the
 * lights with it. Rooms saved before that was true hold lights with no table over them at
 * all; those are shown on whichever table is being looked at, as they always were.
 */
export function lightSourcesOn(table: GameTable | null): LightSource[] {
  const orphans = ObjectStore.instance.getObjects(LightSource).filter((light) => !(light.parent instanceof GameTable));
  const mine = table ? table.lightSources : [];
  return [...mine, ...orphans].filter((light) => light.isVisibleOnTable);
}
