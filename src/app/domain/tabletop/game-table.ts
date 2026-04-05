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
  @SyncVar() gridFontColor: string = '#000000e6';
  @SyncVar() gridShow: boolean = false;
  @SyncVar() gridSnap: boolean = true;

  gridClipRect: { top: number; right: number; bottom: number; left: number } | null = null;
  get terrains(): Terrain[] {
    return this.children.filter((o): o is Terrain => o instanceof Terrain);
  }

  get masks(): GameTableMask[] {
    return this.children.filter((o): o is GameTableMask => o instanceof GameTableMask);
  }

  get scratchMasks(): GameTableScratchMask[] {
    return this.children.filter((o): o is GameTableScratchMask => o instanceof GameTableScratchMask);
  }

  // GameObject Lifecycle
  override onStoreAdded() {
    super.onStoreAdded();
    if (this.selected) emitSelectGameTable({ identifier: this.identifier });
  }
}
