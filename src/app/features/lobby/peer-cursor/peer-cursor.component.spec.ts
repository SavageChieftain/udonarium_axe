import { ComponentFixture, TestBed } from '@angular/core/testing';
import { localDispatch } from '@axe/core/network/network-messaging';
import { ObjectStore } from '@axe/core/sync/object-store';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { PeerCursorComponent } from '@axe/features/lobby/peer-cursor/peer-cursor.component';
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
