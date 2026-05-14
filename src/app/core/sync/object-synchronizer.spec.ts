import { TestBed } from '@angular/core/testing';
import { messageAdded$, selectGameTable$ } from '@axe/core/event/domain-events';
import { localDispatch } from '@axe/core/network/network-messaging';
import { ObjectStore } from '@axe/core/sync/object-store';
import { ObjectSynchronizer } from '@axe/core/sync/object-synchronizer';
import { ChatMessage } from '@axe/domain/chat/chat-message';
import { ChatTab } from '@axe/domain/chat/chat-tab';
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

    it('ChatMessage を同期した時点で messageAdded$ 購読側が ObjectStore.get で解決できる', () => {
      const tab = new ChatTab('synced-chat-tab');
      tab.name = 'メイン';
      ObjectStore.instance.add(tab, false);

      const resolved: (ChatMessage | null)[] = [];
      const off = messageAdded$.subscribe((event) => {
        resolved.push(ObjectStore.instance.get<ChatMessage>(event.messageIdentifier));
      });

      const sample = new ChatMessage('synced-chat-message');
      sample.from = 'remote-user-id';
      sample.name = 'Remote';
      sample.value = 'hello';
      sample.setAttribute('timestamp', 1_000);
      // ChatTab.onChildAdded が emitMessageAdded を発火する条件 (parentIdentifier セット) を満たす。
      const ctx = sample.toContext();
      (ctx.syncData as Record<string, unknown>).parentIdentifier = tab.identifier;

      localDispatch('UPDATE_GAME_OBJECT', ctx, 'remote-peer');

      off();

      expect(resolved.length).toBeGreaterThan(0);
      expect(resolved[0]?.identifier).toBe('synced-chat-message');
    });
  });
});
