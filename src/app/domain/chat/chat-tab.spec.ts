import { TestBed } from '@angular/core/testing';
import { ObjectStore } from '@axe/core/sync/object-store';
import { ChatTab } from '@axe/domain/chat/chat-tab';

describe('ChatTab', () => {
  let store: ObjectStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = ObjectStore.instance;
    const allObjects = store.getObjects();
    allObjects.forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
  });

  afterEach(() => {
    const allObjects = store.getObjects();
    allObjects.forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
  });

  describe('SyncVar デフォルト値', () => {
    it('name がデフォルト "タブ"', () => {
      const tab = new ChatTab();
      tab.initialize();
      expect(tab.name).toBe('タブ');
    });

    it('pos_num がデフォルト -1', () => {
      const tab = new ChatTab();
      tab.initialize();
      expect(tab.pos_num).toBe(-1);
    });

    it('count がデフォルト 0', () => {
      const tab = new ChatTab();
      tab.initialize();
      expect(tab.count).toBe(0);
    });

    it('imageIdentifier が12要素の配列', () => {
      const tab = new ChatTab();
      tab.initialize();
      expect(tab.imageIdentifier).toHaveLength(12);
    });

    it('imageCharacterName が12要素の配列', () => {
      const tab = new ChatTab();
      tab.initialize();
      expect(tab.imageCharacterName).toHaveLength(12);
    });
  });

  describe('chatMessages', () => {
    it('初期状態では空配列', () => {
      const tab = new ChatTab();
      tab.initialize();
      expect(tab.chatMessages).toEqual([]);
    });
  });

  describe('portraitReset()', () => {
    it('立ち絵情報をリセットする', () => {
      const tab = new ChatTab();
      tab.initialize();
      tab.imageIdentifier = ['x', 'y'];
      tab.portraitReset();
      expect(tab.imageIdentifier).toHaveLength(12);
      expect(tab.imageIdentifier[0]).toBe('a');
    });
  });

  describe('portraitSlotOf()', () => {
    it('キャラクタ名の位置を返す', () => {
      const tab = new ChatTab();
      tab.initialize();
      expect(tab.portraitSlotOf('#0')).toBe(0);
      expect(tab.portraitSlotOf('#5')).toBe(5);
    });

    it('存在しない名前は-1を返す', () => {
      const tab = new ChatTab();
      tab.initialize();
      expect(tab.portraitSlotOf('unknown')).toBe(-1);
    });
  });

  describe('isPortraitPosVisible()', () => {
    it('初期状態では全位置がtrue', () => {
      const tab = new ChatTab();
      tab.initialize();
      expect(tab.isPortraitPosVisible(0)).toBe(true);
      expect(tab.isPortraitPosVisible(11)).toBe(true);
    });
  });

  describe('hidePortraitPos()', () => {
    it('指定位置を非表示にする', () => {
      const tab = new ChatTab();
      tab.initialize();
      tab.hidePortraitPos(3);
      expect(tab.isPortraitPosVisible(3)).toBe(false);
    });
  });

  describe('portraitZIndex()', () => {
    it('位置のZ順序インデックスを返す', () => {
      const tab = new ChatTab();
      tab.initialize();
      expect(tab.portraitZIndex(0)).toBe(0);
      expect(tab.portraitZIndex(5)).toBe(5);
    });
  });

  describe('replacePortraitZIndex()', () => {
    it('指定位置をZ順序の最上位に移動する', () => {
      const tab = new ChatTab();
      tab.initialize();
      tab.replacePortraitZIndex(3);
      const zpos = tab.imageZposList;
      expect(zpos[zpos.length - 1]).toBe(3);
    });
  });

  describe('unread', () => {
    it('初期状態でunreadLengthが0', () => {
      const tab = new ChatTab();
      tab.initialize();
      expect(tab.unreadLength).toBe(0);
      expect(tab.hasUnread).toBe(false);
    });

    it('markForReadでunreadを0にリセットする', () => {
      const tab = new ChatTab();
      tab.initialize();
      tab.markForRead();
      expect(tab.unreadLength).toBe(0);
    });

    it('addMessage でメッセージを追加すると unreadLength が増加する', () => {
      const tab = new ChatTab();
      tab.initialize();
      tab.addMessage({ text: 'hello', name: 'user1' });
      expect(tab.unreadLength).toBeGreaterThan(0);
      expect(tab.hasUnread).toBe(true);
    });

    it('addMessage で messColor が SyncVar に正しく保存される', () => {
      const tab = new ChatTab();
      tab.initialize();
      const msg = tab.addMessage({ text: 'hello', name: 'user1', messColor: '#0099FF' });
      expect(msg.messColor).toBe('#0099FF');
    });

    it('addMessage で name が SyncVar に正しく保存される', () => {
      const tab = new ChatTab();
      tab.initialize();
      const msg = tab.addMessage({ text: 'hello', name: 'テストプレイヤー' });
      expect(msg.name).toBe('テストプレイヤー');
    });

    it('addMessage で from が SyncVar に正しく保存される', () => {
      const tab = new ChatTab();
      tab.initialize();
      const msg = tab.addMessage({ text: 'hello', name: 'user', from: 'user-id-123' });
      expect(msg.from).toBe('user-id-123');
    });

    it('複数メッセージ追加で unreadLength が累積する', () => {
      const tab = new ChatTab();
      tab.initialize();
      tab.addMessage({ text: 'msg1', name: 'user1' });
      tab.addMessage({ text: 'msg2', name: 'user1' });
      tab.addMessage({ text: 'msg3', name: 'user1' });
      expect(tab.unreadLength).toBe(3);
    });

    it('addMessage 後に markForRead すると unreadLength が 0 になる', () => {
      const tab = new ChatTab();
      tab.initialize();
      tab.addMessage({ text: 'hello', name: 'user1' });
      tab.markForRead();
      expect(tab.unreadLength).toBe(0);
      expect(tab.hasUnread).toBe(false);
    });
  });

  describe('dispCharctorIcon', () => {
    it('デフォルトがtrue', () => {
      const tab = new ChatTab();
      tab.initialize();
      expect(tab.dispCharctorIcon).toBe(true);
    });

    it('falseに設定できる', () => {
      const tab = new ChatTab();
      tab.initialize();
      tab.dispCharctorIcon = false;
      expect(tab.dispCharctorIcon).toBe(false);
    });
  });

  describe('latestTimeStamp', () => {
    it('メッセージがない場合0を返す', () => {
      const tab = new ChatTab();
      tab.initialize();
      expect(tab.latestTimeStamp).toBe(0);
    });
  });

  describe('escapeHtml()', () => {
    it('HTMLタグをエスケープする', () => {
      const tab = new ChatTab();
      tab.initialize();
      expect(tab.escapeHtml('<script>')).toBe('&lt;script&gt;');
    });

    it('&をエスケープする', () => {
      const tab = new ChatTab();
      tab.initialize();
      expect(tab.escapeHtml('a&b')).toBe('a&amp;b');
    });

    it('引用符をエスケープする', () => {
      const tab = new ChatTab();
      tab.initialize();
      expect(tab.escapeHtml('"test"')).toBe('&quot;test&quot;');
    });

    it('ルビ記法を変換する', () => {
      const tab = new ChatTab();
      tab.initialize();
      const result = tab.escapeHtml('|漢字《かんじ》');
      expect(result).toContain('<ruby>');
      expect(result).toContain('<rt>かんじ</rt>');
    });

    it('非文字列はStringに変換する', () => {
      const tab = new ChatTab();
      tab.initialize();
      expect(tab.escapeHtml(123)).toBe('123');
    });
  });

  describe('displayableMessagesLength()', () => {
    it('初期状態で0', () => {
      const tab = new ChatTab();
      tab.initialize();
      expect(tab.displayableMessagesLength()).toBe(0);
    });
  });
});
