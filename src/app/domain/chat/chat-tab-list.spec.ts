import { TestBed } from '@angular/core/testing';
import { ObjectStore } from '@axe/core/sync/object-store';
import { ChatTab } from '@axe/domain/chat/chat-tab';
import { ChatTabList } from '@axe/domain/chat/chat-tab-list';

describe('ChatTabList', () => {
  let store: ObjectStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = ObjectStore.instance;
    const allObjects = store.getObjects();
    allObjects.forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
    // Reset singleton
    (ChatTabList as unknown as { _instance: ChatTabList | undefined })._instance = undefined;
  });

  afterEach(() => {
    const allObjects = store.getObjects();
    allObjects.forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
    (ChatTabList as unknown as { _instance: ChatTabList | undefined })._instance = undefined;
  });

  describe('instance (singleton)', () => {
    it('シングルトンインスタンスを返す', () => {
      const instance1 = ChatTabList.instance;
      const instance2 = ChatTabList.instance;
      expect(instance1).toBe(instance2);
    });

    it('identifierが"ChatTabList"', () => {
      expect(ChatTabList.instance.identifier).toBe('ChatTabList');
    });
  });

  describe('SyncVar デフォルト値', () => {
    it('systemMessageTabIndex がデフォルト 0', () => {
      expect(ChatTabList.instance.systemMessageTabIndex).toBe(0);
    });
  });

  describe('chatTabs', () => {
    it('初期状態では空配列', () => {
      expect(ChatTabList.instance.chatTabs).toEqual([]);
    });
  });

  describe('addChatTab()', () => {
    it('名前でChatTabを追加する', () => {
      const tab = ChatTabList.instance.addChatTab('テストタブ');
      expect(tab).toBeTruthy();
      expect(tab.name).toBe('テストタブ');
      expect(ChatTabList.instance.chatTabs).toHaveLength(1);
    });

    it('ChatTabインスタンスを追加する', () => {
      const tab = new ChatTab();
      tab.name = 'テスト';
      tab.initialize();
      ChatTabList.instance.addChatTab(tab);
      expect(ChatTabList.instance.chatTabs).toHaveLength(1);
    });

    it('identifierを指定してChatTabを追加する', () => {
      const tab = ChatTabList.instance.addChatTab('タブ', 'custom-tab-id');
      expect(tab.identifier).toBe('custom-tab-id');
    });
  });

  describe('systemMessageTab', () => {
    it('chatTabsが空の場合nullを返す', () => {
      expect(ChatTabList.instance.systemMessageTab).toBeFalsy();
    });

    it('指定インデックスのタブを返す', () => {
      ChatTabList.instance.addChatTab('メイン');
      ChatTabList.instance.addChatTab('サブ');
      ChatTabList.instance.systemMessageTabIndex = 1;
      expect(ChatTabList.instance.systemMessageTab.name).toBe('サブ');
    });
  });

  describe('tachie設定', () => {
    it('tachieHeightValue のデフォルトは200', () => {
      expect(ChatTabList.instance.tachieHeightValue).toBe(200);
    });

    it('minTachieSize のデフォルトは100', () => {
      expect(ChatTabList.instance.minTachieSize).toBe(100);
    });

    it('maxTachieSize のデフォルトは500', () => {
      expect(ChatTabList.instance.maxTachieSize).toBe(500);
    });

    it('isTachieInWindow のデフォルトはfalse', () => {
      expect(ChatTabList.instance.isTachieInWindow).toBe(false);
    });
  });

  describe('simpleDispFlag', () => {
    it('simpleDispFlagTime のデフォルトは0', () => {
      expect(ChatTabList.instance.simpleDispFlagTime).toBe(0);
    });

    it('simpleDispFlagTime を設定できる', () => {
      ChatTabList.instance.simpleDispFlagTime = 1;
      expect(ChatTabList.instance.simpleDispFlagTime).toBe(1);
    });

    it('simpleDispFlagUserId のデフォルトは0', () => {
      expect(ChatTabList.instance.simpleDispFlagUserId).toBe(0);
    });
  });
});
