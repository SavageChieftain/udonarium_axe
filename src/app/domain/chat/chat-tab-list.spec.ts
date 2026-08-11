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
      expect(ChatTabList.instance.systemMessageTab!.name).toBe('サブ');
    });
  });

  describe('portrait設定', () => {
    it('portraitHeight のデフォルトは200', () => {
      expect(ChatTabList.instance.portraitHeight).toBe(200);
    });

    it('minPortraitSize のデフォルトは100', () => {
      expect(ChatTabList.instance.minPortraitSize).toBe(100);
    });

    it('maxPortraitSize のデフォルトは500', () => {
      expect(ChatTabList.instance.maxPortraitSize).toBe(500);
    });

    it('isPortraitInWindow のデフォルトはfalse', () => {
      expect(ChatTabList.instance.isPortraitInWindow).toBe(false);
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

  describe('システムタブ', () => {
    it('用意すると専用の identifier で 1 枚だけ増えること', () => {
      const list = ChatTabList.instance;
      list.addChatTab('メイン');

      const system = list.ensureSystemTab();

      expect(system.isSystemTab).toBe(true);
      expect(list.ensureSystemTab()).toBe(system);
      expect(list.chatTabs.filter((tab) => tab.isSystemTab)).toHaveLength(1);
    });

    it('名前を変えてもシステムタブのままであること', () => {
      const list = ChatTabList.instance;
      const system = list.ensureSystemTab();
      system.name = 'お知らせ';

      // 見分けは identifier で付ける。名前で見ると、改名した途端に別物になる。
      expect(system.isSystemTab).toBe(true);
      expect(list.systemMessageTab).toBe(system);
    });

    it('システムメッセージの行き先を専用タブにすること', () => {
      const list = ChatTabList.instance;
      const main = list.addChatTab('メイン');
      const system = list.ensureSystemTab();
      list.systemMessageTabIndex = 0;

      // 番号の指定より専用タブが優先される。
      expect(list.systemMessageTab).toBe(system);
      expect(list.systemMessageTab).not.toBe(main);
    });

    it('専用タブが無い部屋では今までどおり番号で決めること', () => {
      const list = ChatTabList.instance;
      list.addChatTab('メイン');
      const sub = list.addChatTab('サブ');
      list.systemMessageTabIndex = 1;

      expect(list.systemMessageTab).toBe(sub);
    });

    it('会話のタブにシステムタブを混ぜないこと', () => {
      const list = ChatTabList.instance;
      const main = list.addChatTab('メイン');
      list.ensureSystemTab();

      expect(list.spokenChatTabs).toEqual([main]);
    });

    it('全タブの書き出しにシステムタブを入れないこと', () => {
      const list = ChatTabList.instance;
      const main = list.addChatTab('メイン');
      const system = list.ensureSystemTab();
      main.addMessage({ from: 'alice', text: '会話の行', timestamp: 1, tag: '', name: 'アリス', imageIdentifier: '' });
      system.addMessage({
        from: 'System',
        text: '退室の知らせ',
        timestamp: 2,
        tag: 'system-message',
        name: 'システム',
        imageIdentifier: '',
      });

      const html = list.logHtml();
      expect(html).toContain('会話の行');
      expect(html).not.toContain('退室の知らせ');
    });
  });
});
