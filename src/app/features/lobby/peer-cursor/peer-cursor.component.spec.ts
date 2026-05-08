import { ComponentFixture, TestBed } from '@angular/core/testing';
import { localDispatch } from '@axe/core/network/network-messaging';
import { ObjectStore } from '@axe/core/sync/object-store';
import { ChatTab } from '@axe/domain/chat/chat-tab';
import { ChatTabList } from '@axe/domain/chat/chat-tab-list';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { PeerCursorComponent } from '@axe/features/lobby/peer-cursor/peer-cursor.component';
import { ChatMessageService } from '@axe/shared/chat/chat-message.service';
import { BatchService } from '@axe/shared/ui/batch.service';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('PeerCursorComponent', () => {
  let component: PeerCursorComponent;
  let fixture: ComponentFixture<PeerCursorComponent>;
  let store: ObjectStore;
  let batchService: BatchService;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [PeerCursorComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    store = ObjectStore.instance;
    batchService = TestBed.inject(BatchService);
    fixture = TestBed.createComponent(PeerCursorComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    const allObjects = store.getObjects();
    allObjects.forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
    PeerCursor.myCursor = null!;
    (PeerCursor as unknown as Record<string, unknown>)['userIdMap'] = new Map();
    (PeerCursor as unknown as Record<string, unknown>)['peerIdMap'] = new Map();
    (ChatTabList as unknown as { _instance: ChatTabList | undefined })._instance = undefined;
    (PeerCursorComponent as unknown as Record<string, unknown>)['_sentLogoutIdentifiers'] = new Set();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('コンポーネント破棄時にエラーにならないこと（タイマー未設定時）', () => {
    expect(() => fixture.destroy()).not.toThrow();
  });

  describe('ハートビート購読', () => {
    it('非自分カーソルのハートビートで batchService にタスクが追加される', () => {
      const myCursor = PeerCursor.createMyCursor();
      myCursor.peerId = 'my-peer';

      const remoteCursor = new PeerCursor();
      remoteCursor.initialize();
      remoteCursor.peerId = 'remote-peer';

      fixture.componentRef.setInput('cursor', remoteCursor);
      fixture.detectChanges();

      const addSpy = vi.spyOn(batchService, 'add');

      localDispatch('HEART_BEAT', [Date.now(), 'my-peer', null, 1], 'remote-peer');

      expect(addSpy).toHaveBeenCalled();
    });

    it('自分のカーソルではハートビートが処理されない', () => {
      const myCursor = PeerCursor.createMyCursor();
      myCursor.peerId = 'my-peer';

      fixture.componentRef.setInput('cursor', myCursor);
      fixture.detectChanges();

      const addSpy = vi.spyOn(batchService, 'add');

      localDispatch('HEART_BEAT', [Date.now(), 'other', null, 1], 'other-peer');

      expect(addSpy).not.toHaveBeenCalled();
    });

    it('異なるピアからのハートビートはフィルタされる', () => {
      const myCursor = PeerCursor.createMyCursor();
      myCursor.peerId = 'my-peer';

      const remoteCursor = new PeerCursor();
      remoteCursor.initialize();
      remoteCursor.peerId = 'remote-peer';

      fixture.componentRef.setInput('cursor', remoteCursor);
      fixture.detectChanges();

      const addSpy = vi.spyOn(batchService, 'add');

      localDispatch('HEART_BEAT', [Date.now(), 'my-peer', null, 1], 'different-peer');

      expect(addSpy).not.toHaveBeenCalled();
    });
  });

  describe('カーソル移動購読', () => {
    it('異なるピアからのカーソル移動はフィルタされる', () => {
      const myCursor = PeerCursor.createMyCursor();
      myCursor.peerId = 'my-peer';

      const remoteCursor = new PeerCursor();
      remoteCursor.initialize();
      remoteCursor.peerId = 'remote-peer';

      fixture.componentRef.setInput('cursor', remoteCursor);
      fixture.detectChanges();

      const addSpy = vi.spyOn(batchService, 'add');

      localDispatch('CURSOR_MOVE', [10, 20, 30], 'different-peer');

      expect(addSpy).not.toHaveBeenCalled();
    });

    it('cursorElement が null のときは batchService に追加されない', () => {
      const myCursor = PeerCursor.createMyCursor();
      myCursor.peerId = 'my-peer';

      const remoteCursor = new PeerCursor();
      remoteCursor.initialize();
      remoteCursor.peerId = 'remote-peer';

      fixture.componentRef.setInput('cursor', remoteCursor);
      fixture.detectChanges();

      const priv = component as unknown as { cursorElement: HTMLElement | null };
      priv.cursorElement = null;

      const addSpy = vi.spyOn(batchService, 'add');

      localDispatch('CURSOR_MOVE', [10, 20, 30], 'remote-peer');

      expect(addSpy).not.toHaveBeenCalled();
    });
  });

  describe('chkDisConnect', () => {
    it('タイムアウト超過時にピアを切断状態にする', () => {
      const myCursor = PeerCursor.createMyCursor();
      myCursor.peerId = 'my-peer';
      // ChatTabList singleton must exist in ObjectStore for chkDisConnect()
      void ChatTabList.instance;

      const remoteCursor = new PeerCursor();
      remoteCursor.initialize();
      remoteCursor.peerId = 'remote-peer';
      remoteCursor.isDisConnect = false;
      remoteCursor.timestampReceive = Date.now() - 50_000;

      fixture.componentRef.setInput('cursor', remoteCursor);
      fixture.detectChanges();

      const priv = component as unknown as { chkDisConnect: () => void };
      priv.chkDisConnect();

      expect(remoteCursor.isDisConnect).toBe(true);
    });

    it('タイムアウト以内ならピアを接続状態にする', () => {
      const myCursor = PeerCursor.createMyCursor();
      myCursor.peerId = 'my-peer';
      void ChatTabList.instance;

      const remoteCursor = new PeerCursor();
      remoteCursor.initialize();
      remoteCursor.peerId = 'remote-peer';
      remoteCursor.isDisConnect = true;
      remoteCursor.timestampReceive = Date.now();

      fixture.componentRef.setInput('cursor', remoteCursor);
      fixture.detectChanges();

      const priv = component as unknown as { chkDisConnect: () => void };
      priv.chkDisConnect();

      expect(remoteCursor.isDisConnect).toBe(false);
    });

    it('既に切断状態のピアは再度切断にならない（重複メッセージ防止）', () => {
      const myCursor = PeerCursor.createMyCursor();
      myCursor.peerId = 'my-peer';
      void ChatTabList.instance;

      const remoteCursor = new PeerCursor();
      remoteCursor.initialize();
      remoteCursor.peerId = 'remote-peer';
      remoteCursor.isDisConnect = true;
      remoteCursor.timestampReceive = Date.now() - 50_000;

      fixture.componentRef.setInput('cursor', remoteCursor);
      fixture.detectChanges();

      const chatService = TestBed.inject(ChatMessageService);
      const chatSpy = vi.spyOn(chatService, 'sendSystemMessageOnePlayer');

      const priv = component as unknown as { chkDisConnect: () => void };
      priv.chkDisConnect();

      expect(remoteCursor.isDisConnect).toBe(true);
      expect(chatSpy).not.toHaveBeenCalled();
    });
  });

  describe('logoutMessage 重複送信防止', () => {
    beforeEach(() => {
      // 各テスト前に静的 Set をリセットする
      (PeerCursorComponent as unknown as Record<string, unknown>)['_sentLogoutIdentifiers'] = new Set();
    });

    it('同一カーソルに対して2回呼び出しても1回しかメッセージを送信しないこと', () => {
      const myCursor = PeerCursor.createMyCursor();
      myCursor.peerId = 'my-peer';
      const tabList = ChatTabList.instance;
      const tab = new ChatTab();
      tab.initialize();
      tabList.appendChild(tab);

      const remoteCursor = new PeerCursor();
      remoteCursor.initialize();
      remoteCursor.peerId = 'remote-peer';
      remoteCursor.userId = 'user-1';

      fixture.componentRef.setInput('cursor', remoteCursor);
      fixture.detectChanges();

      const chatService = TestBed.inject(ChatMessageService);
      const chatSpy = vi.spyOn(chatService, 'sendSystemMessageOnePlayer');

      const priv = component as unknown as { logoutMessage: () => void };
      priv.logoutMessage(); // 1回目
      priv.logoutMessage(); // 2回目（静的 Set で防がれる）

      expect(chatSpy).toHaveBeenCalledTimes(1);
    });

    it('自分のカーソルでは logoutMessage がメッセージを送信しないこと', () => {
      const myCursor = PeerCursor.createMyCursor();
      myCursor.peerId = 'my-peer';
      void ChatTabList.instance;

      fixture.componentRef.setInput('cursor', myCursor);
      fixture.detectChanges();

      const chatService = TestBed.inject(ChatMessageService);
      const chatSpy = vi.spyOn(chatService, 'sendSystemMessageOnePlayer');

      const priv = component as unknown as { logoutMessage: () => void };
      priv.logoutMessage();

      expect(chatSpy).not.toHaveBeenCalled();
    });
  });

  describe('破棄クリーンアップ', () => {
    it('updateInterval が clearTimeout でクリアされ null になる', () => {
      const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
      const priv = component as unknown as { updateInterval: NodeJS.Timeout | null };
      priv.updateInterval = setTimeout(() => {}, 999_999);

      fixture.destroy();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(priv.updateInterval).toBeNull();
    });

    it('timestampInterval が clearTimeout でクリアされ null になる', () => {
      const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
      const priv = component as unknown as {
        timestampInterval: NodeJS.Timeout | null;
        timestampIntervalEnable: boolean;
      };
      priv.timestampInterval = setTimeout(() => {}, 999_999);

      fixture.destroy();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(priv.timestampInterval).toBeNull();
    });
  });
});
