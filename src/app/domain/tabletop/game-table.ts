import { SyncObject, SyncVar } from '@axe/core/sync/decorator';
import { ObjectNode } from '@axe/core/sync/object-node';
import { emitSelectGameTable } from '@axe/domain/domain-events';
import { GameTableMask } from '@axe/domain/tabletop/game-table-mask';
import { GameTableScratchMask } from '@axe/domain/tabletop/game-table-scratch-mask';
import { Terrain } from '@axe/domain/tabletop/terrain';

export enum GridType {
  NONE = -1,
  SQUARE = 0,
  HEX_VERTICAL = 1,
  HEX_HORIZONTAL = 2,
}

export enum FilterType {
  NONE = '',
  WHITE = 'white',
  BLACK = 'black',
}

@SyncObject('game-table')
export class GameTable extends ObjectNode {
  @SyncVar() name: string = 'テーブル';
  @SyncVar() width: number = 20;
  @SyncVar() height: number = 20;
  @SyncVar() gridSize: number = 50;
  @SyncVar() imageIdentifier: string = 'imageIdentifier';
  @SyncVar() backgroundImageIdentifier: string = 'imageIdentifier';
  @SyncVar() backgroundFilterType: FilterType = FilterType.NONE;
  @SyncVar() selected: boolean = false;
  @SyncVar() gridType: GridType = GridType.SQUARE;
  @SyncVar() gridColor: string = '#000000e6';

  gridClipRect: { top: number; right: number; bottom: number; left: number } | null = null;
  get terrains(): Terrain[] {
    const terrains: Terrain[] = [];
    this.children.forEach((object) => {
      if (object instanceof Terrain) terrains.push(object);
    });
    return terrains;
  }

  get masks(): GameTableMask[] {
    const masks: GameTableMask[] = [];
    this.children.forEach((object) => {
      if (object instanceof GameTableMask) masks.push(object);
    });
    return masks;
  }

  get scratchMasks(): GameTableScratchMask[] {
    const masks: GameTableScratchMask[] = [];
    this.children.forEach((object) => {
      if (object instanceof GameTableScratchMask) masks.push(object);
    });
    return masks;
  }

  // GameObject Lifecycle
  onStoreAdded() {
    super.onStoreAdded();
    if (this.selected) emitSelectGameTable({ identifier: this.identifier });
  }
}
