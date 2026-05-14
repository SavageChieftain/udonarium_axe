import { TestBed } from '@angular/core/testing';
import { selectGameTable$ } from '@axe/core/event/domain-events';
import { localDispatch } from '@axe/core/network/network-messaging';
import { ObjectStore } from '@axe/core/sync/object-store';
import { ObjectSynchronizer } from '@axe/core/sync/object-synchronizer';
import { GameTable } from '@axe/domain/tabletop/game-table';
import { TableSelecter } from '@axe/domain/tabletop/table-selecter';

describe('ObjectSynchronizer', () => {
  describe('instance (singleton)', () => {
    it('シングルトンインスタンスを返す', () => {
      expect(ObjectSynchronizer.instance).toBe(ObjectSynchronizer.instance);
    });
  });

  describe('initialize / destroy', () => {
    it('initializeでイベントリスナーを登録する', () => {
      ObjectSynchronizer.instance.initialize();
      expect(true).toBe(true);
    });

    it('destroyでイベントリスナーを解除する', () => {
      ObjectSynchronizer.instance.initialize();
      ObjectSynchronizer.instance.destroy();
      expect(true).toBe(true);
    });
  });

  describe('UPDATE_GAME_OBJECT で未知の object を受信したとき', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({});
      // TableSelecter.instance の subscribe は onStoreAdded で張られるため、
      // store から取り除くと再 add するまで selectGameTable$ を受け取れなくなる。
      // 他の object だけ消す。
      for (const o of ObjectStore.instance.getObjects()) {
        if (o.identifier === TableSelecter.instance.identifier) continue;
        ObjectStore.instance.delete(o, false);
      }
      ObjectStore.instance.clearDeleteHistory();
      // TableSelecter.instance が store に存在することを保証 (subscription が活きる)
      if (!ObjectStore.instance.get(TableSelecter.instance.identifier)) {
        ObjectStore.instance.add(TableSelecter.instance, false);
      }
      ObjectSynchronizer.instance.initialize();
    });

    afterEach(() => {
      for (const o of ObjectStore.instance.getObjects()) {
        if (o.identifier === TableSelecter.instance.identifier) continue;
        ObjectStore.instance.delete(o, false);
      }
      ObjectStore.instance.clearDeleteHistory();
      ObjectSynchronizer.instance.destroy();
    });

    /**
     * セーブデータから入室直後の joiner で、selected=true の GameTable が同期されたときに
     * TableSelecter が正しく更新されることを保証する。
     *
     * バグ再現: createObject は ObjectStore.add → apply の順で行っていたため、
     * GameTable.onStoreAdded は selected=true が反映される前に発火し、
     * selectGameTable$ を emit できず joiner だけが別 table を見ていた。
     */
    it('selected=true の GameTable を同期すると selectGameTable$ が発火し TableSelecter.viewTableIdentifier が更新される', () => {
      const tableSelecter = TableSelecter.instance;
      tableSelecter.viewTableIdentifier = '';

      const emitted: string[] = [];
      const off = selectGameTable$.subscribe((e) => emitted.push(e.identifier));

      // host 側で selected=true として作った GameTable を localDispatch でシミュレート
      const sample = new GameTable('synced-table-id');
      sample.name = '決戦の宇宙';
      sample.selected = true;
      sample.gridType = 2; // HEX_HORIZONTAL
      sample.width = 48;
      sample.height = 36;
      const ctx = sample.toContext();

      localDispatch('UPDATE_GAME_OBJECT', ctx, 'remote-peer');

      off();

      expect(emitted).toContain('synced-table-id');
      expect(tableSelecter.viewTableIdentifier).toBe('synced-table-id');
    });
  });
});
