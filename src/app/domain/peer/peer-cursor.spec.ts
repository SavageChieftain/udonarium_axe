import { TestBed } from '@angular/core/testing';
import { Network } from '@axe/core/index';
import { resetPeerContextProvider } from '@axe/core/network/peer-context-source';
import { ObjectStore } from '@axe/core/sync/object-store';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';

describe('PeerCursor', () => {
  let store: ObjectStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    // 他の spec が setPeerContextProvider でスタブを残していた場合に備えて毎回既定に戻す。
    resetPeerContextProvider();
    store = ObjectStore.instance;
    const allObjects = store.getObjects();
    allObjects.forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
    PeerCursor.myCursor = null!;
    (PeerCursor as unknown as Record<string, unknown>)['userIdMap'] = new Map();
    (PeerCursor as unknown as Record<string, unknown>)['peerIdMap'] = new Map();
  });

  afterEach(() => {
    const allObjects = store.getObjects();
    allObjects.forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
    PeerCursor.myCursor = null!;
    (PeerCursor as unknown as Record<string, unknown>)['userIdMap'] = new Map();
    (PeerCursor as unknown as Record<string, unknown>)['peerIdMap'] = new Map();
    vi.restoreAllMocks();
  });

  describe('SyncVar デフォルト値', () => {
    it('userIdが空文字', () => {
      const cursor = new PeerCursor();
      cursor.initialize();
      expect(cursor.userId).toBe('');
    });

    it('peerIdが空文字', () => {
      const cursor = new PeerCursor();
      cursor.initialize();
      expect(cursor.peerId).toBe('');
    });

    it('nameが空文字', () => {
      const cursor = new PeerCursor();
      cursor.initialize();
      expect(cursor.name).toBe('');
    });

    it('imageIdentifierが空文字', () => {
      const cursor = new PeerCursor();
      cursor.initialize();
      expect(cursor.imageIdentifier).toBe('');
    });

    it('voteAnswerが-1', () => {
      const cursor = new PeerCursor();
      cursor.initialize();
      expect(cursor.voteAnswer).toBe(-1);
    });

    it('voteIdが-1', () => {
      const cursor = new PeerCursor();
      cursor.initialize();
      expect(cursor.voteId).toBe(-1);
    });
  });

  describe('プロパティ', () => {
    it('isDisConnectのデフォルトはtrue', () => {
      const cursor = new PeerCursor();
      cursor.initialize();
      expect(cursor.isDisConnect).toBe(true);
    });

    it('isDisConnectを設定できる', () => {
      const cursor = new PeerCursor();
      cursor.initialize();
      cursor.isDisConnect = false;
      expect(cursor.isDisConnect).toBe(false);
    });

    it('timestampSendのデフォルトは-1', () => {
      const cursor = new PeerCursor();
      cursor.initialize();
      expect(cursor.timestampSend).toBe(-1);
    });

    it('timestampReceiveのデフォルトは-1', () => {
      const cursor = new PeerCursor();
      cursor.initialize();
      expect(cursor.timestampReceive).toBe(-1);
    });

    it('timeLatencyのデフォルトは99999', () => {
      const cursor = new PeerCursor();
      cursor.initialize();
      expect(cursor.timeLatency).toBe(99999);
    });

    it('timeoutのデフォルトは40', () => {
      const cursor = new PeerCursor();
      cursor.initialize();
      expect(cursor.timeout).toBe(40);
    });

    it('timeoutが0以下の場合は1を返す', () => {
      const cursor = new PeerCursor();
      cursor.initialize();
      cursor.timeout = 0;
      expect(cursor.timeout).toBe(1);
      cursor.timeout = -5;
      expect(cursor.timeout).toBe(1);
    });

    it('chatColorCodeのデフォルト', () => {
      const cursor = new PeerCursor();
      cursor.initialize();
      expect(cursor.chatColorCode).toEqual(['#000000', '#FF0000', '#0099FF']);
    });
  });

  describe('diceImageIdentifier', () => {
    it('diceImageTypeが空の場合は空文字を返す', () => {
      const cursor = new PeerCursor();
      cursor.initialize();
      expect(cursor.diceImageIdentifier).toBe('');
    });

    it('diceImageTypeとdiceImageIndexから識別子を生成する', () => {
      const cursor = new PeerCursor();
      cursor.initialize();
      cursor.diceImageType = 'normal';
      cursor.diceImageIndex = 3;
      expect(cursor.diceImageIdentifier).toBe('normal_dice[03]');
    });

    it('diceImageIndexが1桁の場合ゼロパディングされる', () => {
      const cursor = new PeerCursor();
      cursor.initialize();
      cursor.diceImageType = 'star';
      cursor.diceImageIndex = 0;
      expect(cursor.diceImageIdentifier).toBe('star_dice[00]');
    });
  });

  describe('isMine', () => {
    it('myCursorが設定されていない場合はfalsy', () => {
      const cursor = new PeerCursor();
      cursor.initialize();
      expect(cursor.isMine).toBeFalsy();
    });

    it('myCursorが自分自身の場合はtrue', () => {
      const cursor = new PeerCursor();
      cursor.initialize();
      PeerCursor.myCursor = cursor;
      expect(cursor.isMine).toBe(true);
    });

    it('myCursorが他のカーソルの場合はfalse', () => {
      const cursor1 = new PeerCursor();
      cursor1.initialize();
      const cursor2 = new PeerCursor();
      cursor2.initialize();
      PeerCursor.myCursor = cursor1;
      expect(cursor2.isMine).toBe(false);
    });
  });

  describe('createMyCursor', () => {
    it('myCursorを作成できる', () => {
      const cursor = PeerCursor.createMyCursor();
      expect(cursor).toBeTruthy();
      expect(PeerCursor.myCursor).toBe(cursor);
    });

    it('peerIdがNetwork.peerIdに設定される', () => {
      const cursor = PeerCursor.createMyCursor();
      expect(cursor.peerId).toBe(Network.peerId);
    });

    it('すでに作成済みの場合は既存のカーソルを返す', () => {
      const cursor1 = PeerCursor.createMyCursor();
      const cursor2 = PeerCursor.createMyCursor();
      expect(cursor1).toBe(cursor2);
    });

    it('isDisConnect が false に設定される（自分自身は切断扱いにならない）', () => {
      const cursor = PeerCursor.createMyCursor();
      expect(cursor.isDisConnect).toBe(false);
    });
  });

  describe('findByUserId / findByPeerId', () => {
    it('userIdで検索できる', () => {
      const cursor = new PeerCursor();
      cursor.initialize();
      cursor.userId = 'user-abc';
      expect(PeerCursor.findByUserId('user-abc')).toBe(cursor);
    });

    it('peerIdで検索できる', () => {
      const cursor = new PeerCursor();
      cursor.initialize();
      cursor.peerId = 'peer-xyz';
      expect(PeerCursor.findByPeerId('peer-xyz')).toBe(cursor);
    });

    it('存在しないIDはnullを返す', () => {
      expect(PeerCursor.findByUserId('nonexistent')).toBeFalsy();
      expect(PeerCursor.findByPeerId('nonexistent')).toBeFalsy();
    });

    it('空のIDは未設定のカーソルに一致しないこと', () => {
      const cursor = new PeerCursor();
      cursor.initialize();

      expect(cursor.userId).toBe('');
      expect(PeerCursor.findByUserId('')).toBeNull();
      expect(PeerCursor.findByPeerId('')).toBeNull();
    });
  });

  describe('isPeerAUdon', () => {
    it('peerIdに"udon"を含む場合true', () => {
      const cursor = new PeerCursor();
      cursor.initialize();
      cursor.peerId = 'UDoNarium';
      expect(cursor.isPeerAUdon()).toBe(true);
    });

    it('peerIdに"udon"を含まない場合false', () => {
      const cursor = new PeerCursor();
      cursor.initialize();
      cursor.peerId = 'test-peer';
      expect(cursor.isPeerAUdon()).toBe(false);
    });
  });

  describe('debugReceiveDelay', () => {
    it('timestampReceiveにdelayを加算する', () => {
      const cursor = new PeerCursor();
      cursor.initialize();
      cursor.debugReceiveDelay = 100;
      cursor.timestampReceive = 1000;
      expect(cursor.timestampReceive).toBe(1100);
    });
  });
});
