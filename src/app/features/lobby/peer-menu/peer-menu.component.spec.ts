import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ObjectStore } from '@axe/core/sync/object-store';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { PeerRole } from '@axe/domain/peer/peer-role';
import { PeerMenuComponent } from '@axe/features/lobby/peer-menu/peer-menu.component';
import { expectPanelDragRecovery, PanelDragTestHostComponent } from '@axe/testing/panel-drag-recovery';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('PeerMenuComponent', () => {
  let component: PeerMenuComponent;
  let fixture: ComponentFixture<PeerMenuComponent>;
  let store: ObjectStore;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [PeerMenuComponent, PanelDragTestHostComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    store = ObjectStore.instance;
    fixture = TestBed.createComponent(PeerMenuComponent);
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

  it('ChangeDetectorRefを使用していないこと', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((component as any).changeDetector).toBeUndefined();
  });

  it('myTimeがsignalであること', () => {
    expect(typeof component.myTime).toBe('function');
  });

  it('global dragging が解除されたら panel の pointer-events-none も解除されること', async () => {
    await expectPanelDragRecovery(PeerMenuComponent, {
      beforeOpen: () => {
        PeerCursor.createMyCursor();
      },
    });
  });

  it('プライベート接続UIを表示しないこと', () => {
    PeerCursor.createMyCursor();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).not.toContain('プライベート接続');
  });

  describe('自己ロール昇格の制限', () => {
    beforeEach(() => {
      PeerCursor.createMyCursor();
    });

    function addGameMasterPeer(): void {
      const gm = new PeerCursor();
      gm.role = PeerRole.GameMaster;
      gm.initialize();
    }

    it('GM が在室なら非GM は GM を自己割り当てできない', () => {
      addGameMasterPeer();
      PeerCursor.myCursor.role = PeerRole.Player;
      expect(component.isRoleSelfAssignable(PeerRole.GameMaster)).toBe(false);
    });

    it('GM が不在なら非GM でも GM を自己割り当てできる（復旧）', () => {
      PeerCursor.myCursor.role = PeerRole.Player;
      expect(component.isRoleSelfAssignable(PeerRole.GameMaster)).toBe(true);
    });

    it('非GM でも Player / Guest は自己割り当てできる', () => {
      PeerCursor.myCursor.role = PeerRole.Guest;
      expect(component.isRoleSelfAssignable(PeerRole.Player)).toBe(true);
      expect(component.isRoleSelfAssignable(PeerRole.Guest)).toBe(true);
    });

    it('GM は GM を保持できる', () => {
      PeerCursor.myCursor.role = PeerRole.GameMaster;
      expect(component.isRoleSelfAssignable(PeerRole.GameMaster)).toBe(true);
    });

    it('GM 在室時に setMyRole(GameMaster) を非GM が呼んでも昇格しない', () => {
      addGameMasterPeer();
      PeerCursor.myCursor.role = PeerRole.Player;
      component.setMyRole(PeerRole.GameMaster);
      expect(PeerCursor.myCursor.role).toBe(PeerRole.Player);
    });
  });

  describe('findPeerTimeReceive', () => {
    it('存在するピアの timestampReceive を返す', () => {
      const cursor = new PeerCursor();
      cursor.initialize();
      cursor.peerId = 'peer-test';
      cursor.timestampReceive = 1234567890;

      expect(component.findPeerTimeReceive('peer-test')).toBe(1234567890);
    });

    it('timestampReceive 未更新のピアは -1 を返す', () => {
      const cursor = new PeerCursor();
      cursor.initialize();
      cursor.peerId = 'peer-new';

      expect(component.findPeerTimeReceive('peer-new')).toBe(-1);
    });

    it('存在しないピアは 0 を返す', () => {
      expect(component.findPeerTimeReceive('nonexistent')).toBe(0);
    });
  });

  describe('findPeerTimeLatency', () => {
    it('存在するピアのレイテンシを秒単位で返す', () => {
      const cursor = new PeerCursor();
      cursor.initialize();
      cursor.peerId = 'peer-lat';
      cursor.timeLatency = 500;

      expect(component.findPeerTimeLatency('peer-lat')).toBe(0.5);
    });

    it('存在しないピアは "--" を返す', () => {
      expect(component.findPeerTimeLatency('nonexistent')).toBe('--');
    });
  });

  describe('findPeerDegreeOfSuccess', () => {
    it('firstTimeSignNo が未設定（-1）なら "0/0" を返す', () => {
      const cursor = new PeerCursor();
      cursor.initialize();
      cursor.peerId = 'peer-deg';

      expect(component.findPeerDegreeOfSuccess('peer-deg')).toBe('0/0');
    });

    it('存在しないピアは "0/0" を返す', () => {
      expect(component.findPeerDegreeOfSuccess('nonexistent')).toBe('0/0');
    });

    it('ハートビート統計から成功率を計算する', () => {
      const cursor = new PeerCursor();
      cursor.initialize();
      cursor.peerId = 'peer-stat';
      cursor.firstTimeSignNo = 0;
      cursor.lastTimeSignNo = 9;
      cursor.totalTimeSignNum = 10;

      expect(component.findPeerDegreeOfSuccess('peer-stat')).toBe('10/10');
    });

    it('一部のハートビートが欠落した場合の成功率', () => {
      const cursor = new PeerCursor();
      cursor.initialize();
      cursor.peerId = 'peer-loss';
      cursor.firstTimeSignNo = 0;
      cursor.lastTimeSignNo = 9;
      cursor.totalTimeSignNum = 7;

      expect(component.findPeerDegreeOfSuccess('peer-loss')).toBe('7/10');
    });
  });
});
