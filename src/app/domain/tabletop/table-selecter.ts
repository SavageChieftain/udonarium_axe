import { SyncObject, SyncVar } from '@axe/core/sync/decorator';
import { GameObject } from '@axe/core/sync/game-object';
import { ObjectStore } from '@axe/core/sync/object-store';
import { emitSelectGameTable, selectGameTable$ } from '@axe/domain/domain-events';
import { GameTable } from '@axe/domain/tabletop/game-table';
import { Subscription } from 'rxjs';

@SyncObject('TableSelecter')
export class TableSelecter extends GameObject {
  private static _instance: TableSelecter;
  static get instance(): TableSelecter {
    if (!TableSelecter._instance) {
      TableSelecter._instance = new TableSelecter('TableSelecter');
      TableSelecter._instance.initialize();
    }
    return TableSelecter._instance;
  }

  @SyncVar() viewTableIdentifier: string = '';
  @SyncVar() tableGridDummy: boolean = false;
  gridShow: boolean = false; // true=常時グリッド表示
  gridSnap: boolean = true;
  private subscription = new Subscription();

  // GameObject Lifecycle
  onStoreAdded() {
    super.onStoreAdded();
    this.subscription.add(
      selectGameTable$.subscribe((data) => {
        if (this.viewTable) this.viewTable.selected = false;
        this.viewTableIdentifier = data.identifier;
        if (this.viewTable) this.viewTable.selected = true;
      })
    );
  }

  // GameObject Lifecycle
  onStoreRemoved() {
    super.onStoreRemoved();
    this.subscription.unsubscribe();
  }

  get viewTable(): GameTable {
    let table: GameTable = ObjectStore.instance.get<GameTable>(this.viewTableIdentifier);
    if (!table) {
      table = ObjectStore.instance.getObjects<GameTable>(GameTable)[0];
      if (table && (this.viewTableIdentifier.length < 1 || ObjectStore.instance.isDeleted(this.viewTableIdentifier))) {
        this.viewTableIdentifier = table.identifier;
        emitSelectGameTable({ identifier: table.identifier });
      }
    }
    return table;
  }
}
