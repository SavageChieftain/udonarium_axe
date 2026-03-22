import { TestBed } from '@angular/core/testing';
import { ChatMessage } from './chat-message';
import { ObjectStore } from './core/synchronize-object/object-store';
import { Network } from './core/system';
import { IPeerContext } from './core/system/network/peer-context';

describe('ChatMessage', () => {
  let store: ObjectStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = ObjectStore.instance;
    const allObjects = store.getObjects();
    allObjects.forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();

    vi.spyOn(Network, 'peerContext', 'get').mockReturnValue({
      peerId: 'test-peer',
      userId: 'test-user',
      isOpen: true,
    } as IPeerContext);
  });

  afterEach(() => {
    const allObjects = store.getObjects();
    allObjects.forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
    vi.restoreAllMocks();
  });

  describe('SyncVar デフォルト値', () => {
    it('fixd がデフォルト false', () => {
      const msg = new ChatMessage();
      msg.initialize();
      expect(msg.fixd).toBe(false);
    });
  });

  describe('text getter/setter', () => {
    it('テキストを設定・取得できる', () => {
      const msg = new ChatMessage();
      msg.initialize();
      msg.text = 'テストメッセージ';
      expect(msg.text).toBe('テストメッセージ');
    });
  });

  describe('timestamp', () => {
    it('attributeが未設定の場合1を返す', () => {
      const msg = new ChatMessage();
      msg.initialize();
      const ts = msg.timestamp;
      expect(typeof ts).toBe('number');
    });

    it('attributeに設定した値を返す', () => {
      const msg = new ChatMessage();
      msg.initialize();
      msg.setAttribute('timestamp', 1234567890);
      expect(msg.timestamp).toBe(1234567890);
    });
  });

  describe('sendTo', () => {
    it('toが空の場合空配列', () => {
      const msg = new ChatMessage();
      msg.initialize();
      msg.to = '';
      expect(msg.sendTo).toEqual([]);
    });

    it('スペース区切りで分割される', () => {
      const msg = new ChatMessage();
      msg.initialize();
      msg.to = 'user1 user2';
      expect(msg.sendTo).toEqual(['user1', 'user2']);
    });
  });

  describe('tags', () => {
    it('tagが空の場合空配列', () => {
      const msg = new ChatMessage();
      msg.initialize();
      msg.tag = '';
      expect(msg.tags).toEqual([]);
    });

    it('スペース区切りで分割される', () => {
      const msg = new ChatMessage();
      msg.initialize();
      msg.tag = 'system secret';
      expect(msg.tags).toEqual(['system', 'secret']);
    });
  });

  describe('isDirect', () => {
    it('sendToが空の場合false', () => {
      const msg = new ChatMessage();
      msg.initialize();
      msg.to = '';
      expect(msg.isDirect).toBe(false);
    });

    it('sendToがある場合true', () => {
      const msg = new ChatMessage();
      msg.initialize();
      msg.to = 'user1';
      expect(msg.isDirect).toBe(true);
    });
  });

  describe('isSendFromSelf', () => {
    it('fromが自分のuserIdの場合true', () => {
      const msg = new ChatMessage();
      msg.initialize();
      msg.from = 'test-user';
      expect(msg.isSendFromSelf).toBe(true);
    });

    it('fromが他のuserIdの場合false', () => {
      const msg = new ChatMessage();
      msg.initialize();
      msg.from = 'other-user';
      expect(msg.isSendFromSelf).toBe(false);
    });

    it('originFromが自分のuserIdの場合もtrue', () => {
      const msg = new ChatMessage();
      msg.initialize();
      msg.from = 'other-user';
      msg.originFrom = 'test-user';
      expect(msg.isSendFromSelf).toBe(true);
    });
  });

  describe('isSystem', () => {
    it('systemタグがある場合true', () => {
      const msg = new ChatMessage();
      msg.initialize();
      msg.tag = 'system';
      expect(msg.isSystem).toBe(true);
    });

    it('systemタグがない場合false', () => {
      const msg = new ChatMessage();
      msg.initialize();
      msg.tag = 'normal';
      expect(msg.isSystem).toBe(false);
    });
  });

  describe('isDicebot', () => {
    it('system+System-BCDiceの場合true', () => {
      const msg = new ChatMessage();
      msg.initialize();
      msg.tag = 'system';
      msg.from = 'System-BCDice';
      expect(msg.isDicebot).toBe(true);
    });
  });

  describe('isSecret', () => {
    it('secretタグがある場合true', () => {
      const msg = new ChatMessage();
      msg.initialize();
      msg.tag = 'secret';
      expect(msg.isSecret).toBe(true);
    });
  });

  describe('isDisplayable', () => {
    it('directメッセージでない場合true', () => {
      const msg = new ChatMessage();
      msg.initialize();
      msg.to = '';
      expect(msg.isDisplayable).toBe(true);
    });

    it('自分宛のdirectメッセージはtrue', () => {
      const msg = new ChatMessage();
      msg.initialize();
      msg.to = 'test-user';
      msg.from = 'other-user';
      expect(msg.isDisplayable).toBe(true);
    });

    it('他人宛のdirectメッセージはfalse', () => {
      const msg = new ChatMessage();
      msg.initialize();
      msg.to = 'other-user';
      msg.from = 'third-user';
      expect(msg.isDisplayable).toBe(false);
    });
  });

  describe('changeable', () => {
    it('自分が送信したメッセージで名前がシステムメッセージでない場合true', () => {
      const msg = new ChatMessage();
      msg.initialize();
      msg.from = 'test-user';
      msg.name = 'テストキャラ';
      expect(msg.changeable).toBe(true);
    });

    it('システムメッセージの場合false', () => {
      const msg = new ChatMessage();
      msg.initialize();
      msg.from = 'test-user';
      msg.name = 'システムメッセージ';
      expect(msg.changeable).toBe(false);
    });

    it('他人が送信したメッセージの場合false', () => {
      const msg = new ChatMessage();
      msg.initialize();
      msg.from = 'other-user';
      msg.name = 'テスト';
      expect(msg.changeable).toBe(false);
    });
  });
});
