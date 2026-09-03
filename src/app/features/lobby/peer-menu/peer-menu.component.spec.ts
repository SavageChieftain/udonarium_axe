import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { PeerRole } from '@axe/domain/peer/peer-role';
import { PeerMenuComponent } from '@axe/features/lobby/peer-menu/peer-menu.component';
import { expectPanelDragRecovery, PanelDragTestHostComponent } from '@axe/testing/panel-drag-recovery';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('PeerMenuComponent', () => {
  let component: PeerMenuComponent;
  let fixture: ComponentFixture<PeerMenuComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [PeerMenuComponent, PanelDragTestHostComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PeerMenuComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    PeerCursor.myCursor = null!;
    (PeerCursor as unknown as Record<string, unknown>)['userIdMap'] = new Map();
    (PeerCursor as unknown as Record<string, unknown>)['peerIdMap'] = new Map();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('asks for no change detector', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((component as any).changeDetector).toBeUndefined();
  });

  it('holds the time in a signal', () => {
    expect(typeof component.myTime).toBe('function');
  });

  it('lets the panel take the pointer again once the drag ends', async () => {
    await expectPanelDragRecovery(PeerMenuComponent, {
      beforeOpen: () => {
        PeerCursor.createMyCursor();
      },
    });
  });

  it('leaves the private connection controls out', () => {
    PeerCursor.createMyCursor();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).not.toContain('プライベート接続');
  });

  describe('promoting yourself', () => {
    beforeEach(() => {
      PeerCursor.createMyCursor();
    });

    function addGameMasterPeer(): void {
      const gm = new PeerCursor();
      gm.role = PeerRole.GameMaster;
      gm.initialize();
    }

    it('will not make you the game master while there is one', () => {
      addGameMasterPeer();
      PeerCursor.myCursor.role = PeerRole.Player;
      expect(component.isRoleSelfAssignable(PeerRole.GameMaster)).toBe(false);
    });

    it('will while there is none, so the room can recover', () => {
      PeerCursor.myCursor.role = PeerRole.Player;
      expect(component.isRoleSelfAssignable(PeerRole.GameMaster)).toBe(true);
    });

    it('lets anybody take the player or guest role', () => {
      PeerCursor.myCursor.role = PeerRole.Guest;
      expect(component.isRoleSelfAssignable(PeerRole.Player)).toBe(true);
      expect(component.isRoleSelfAssignable(PeerRole.Guest)).toBe(true);
    });

    it('lets the game master keep it', () => {
      PeerCursor.myCursor.role = PeerRole.GameMaster;
      expect(component.isRoleSelfAssignable(PeerRole.GameMaster)).toBe(true);
    });

    it('refuses the promotion outright while somebody holds it', () => {
      addGameMasterPeer();
      PeerCursor.myCursor.role = PeerRole.Player;
      component.setMyRole(PeerRole.GameMaster);
      expect(PeerCursor.myCursor.role).toBe(PeerRole.Player);
    });
  });

  describe('findPeerTimeReceive', () => {
    it('returns when a peer was last heard from', () => {
      const cursor = new PeerCursor();
      cursor.initialize();
      cursor.peerId = 'peer-test';
      cursor.timestampReceive = 1234567890;

      expect(component.findPeerTimeReceive('peer-test')).toBe(1234567890);
    });

    it('returns nothing for a peer not yet heard from', () => {
      const cursor = new PeerCursor();
      cursor.initialize();
      cursor.peerId = 'peer-new';

      expect(component.findPeerTimeReceive('peer-new')).toBe(-1);
    });

    it('returns zero for a peer that is not there', () => {
      expect(component.findPeerTimeReceive('nonexistent')).toBe(0);
    });
  });

  describe('findPeerTimeLatency', () => {
    it('returns the latency of a peer in seconds', () => {
      const cursor = new PeerCursor();
      cursor.initialize();
      cursor.peerId = 'peer-lat';
      cursor.timeLatency = 500;

      expect(component.findPeerTimeLatency('peer-lat')).toBe(0.5);
    });

    it('returns a dash for one that is not there', () => {
      expect(component.findPeerTimeLatency('nonexistent')).toBe('--');
    });
  });

  describe('findPeerDegreeOfSuccess', () => {
    it('returns none of none before the first beat', () => {
      const cursor = new PeerCursor();
      cursor.initialize();
      cursor.peerId = 'peer-deg';

      expect(component.findPeerDegreeOfSuccess('peer-deg')).toBe('0/0');
    });

    it('returns none of none for a peer that is not there', () => {
      expect(component.findPeerDegreeOfSuccess('nonexistent')).toBe('0/0');
    });

    it('works the success rate out of the heartbeats', () => {
      const cursor = new PeerCursor();
      cursor.initialize();
      cursor.peerId = 'peer-stat';
      cursor.firstTimeSignNo = 0;
      cursor.lastTimeSignNo = 9;
      cursor.totalTimeSignNum = 10;

      expect(component.findPeerDegreeOfSuccess('peer-stat')).toBe('10/10');
    });

    it('with some of them missed', () => {
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
