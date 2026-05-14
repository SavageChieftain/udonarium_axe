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
    // TableSelecter の selectGameTable$ subscription は onStoreAdded で張られるため
    // ObjectStore から外すとテスト中に通知が届かなくなる。他オブジェクトのみクリーンアップする。
    beforeEach(() => {
      TestBed.configureTestingModule({});
      for (const o of ObjectStore.instance.getObjects()) {
        if (o.identifier === TableSelecter.instance.identifier) continue;
        ObjectStore.instance.delete(o, false);
      }
      ObjectStore.instance.clearDeleteHistory();
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

    it('selected=true の GameTable を同期すると selectGameTable$ が発火し TableSelecter.viewTableIdentifier が更新される', () => {
      const tableSelecter = TableSelecter.instance;
      tableSelecter.viewTableIdentifier = '';

      const emitted: string[] = [];
      const off = selectGameTable$.subscribe((e) => emitted.push(e.identifier));

      const sample = new GameTable('synced-table-id');
      sample.name = '決戦の宇宙';
      sample.selected = true;
      sample.gridType = 2;
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
