import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { VoteMenuComponent } from '@axe/features/vote/vote-menu/vote-menu.component';
import { expectPanelDragRecovery, PanelDragTestHostComponent } from '@axe/testing/panel-drag-recovery';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('VoteMenuComponent', () => {
  let component: VoteMenuComponent;
  let fixture: ComponentFixture<VoteMenuComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [VoteMenuComponent, PanelDragTestHostComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(VoteMenuComponent);
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

  it('lets the panel take the pointer again once the drag ends', async () => {
    await expectPanelDragRecovery(VoteMenuComponent);
  });

  describe('keeping track of who is picked', () => {
    it('picks somebody who was not picked', () => {
      component.voteBlockClick('peer-1');
      expect(component['checkedPeers'].has('peer-1')).toBe(true);
    });

    it('unpicks somebody who was', () => {
      component.voteBlockClick('peer-1');
      component.voteBlockClick('peer-1');
      expect(component['checkedPeers'].has('peer-1')).toBe(false);
    });

    it('keeps several peers apart', () => {
      component.voteBlockClick('peer-a');
      component.voteBlockClick('peer-b');
      expect(component['checkedPeers'].has('peer-a')).toBe(true);
      expect(component['checkedPeers'].has('peer-b')).toBe(true);

      component.voteBlockClick('peer-a');
      expect(component['checkedPeers'].has('peer-a')).toBe(false);
      expect(component['checkedPeers'].has('peer-b')).toBe(true);
    });
  });

  describe('onChangeType', () => {
    it('knows a roll call', () => {
      component.isRollCall = false;
      component.onChangeType('rollcall');
      expect(component.isRollCall).toBe(true);
    });

    it('knows a vote', () => {
      component.isRollCall = true;
      component.onChangeType('vote');
      expect(component.isRollCall).toBe(false);
    });
  });

  describe('selectedList', () => {
    it('returns who is picked', () => {
      component['checkedPeers'].add('peer-1');
      component['checkedPeers'].add('peer-2');
      component.includSelf = false;
      const list = component.selectedList();
      expect(list).toContain('peer-1');
      expect(list).toContain('peer-2');
      expect(list.length).toBe(2);
    });

    it('leaves the caller out when they ask to be left out', () => {
      component['checkedPeers'].add('peer-1');
      component.includSelf = false;
      const list = component.selectedList();
      expect(list).toEqual(['peer-1']);
    });
  });

  describe('selectedNum', () => {
    it('counts them', () => {
      component['checkedPeers'].add('peer-1');
      component.includSelf = false;
      expect(component.selectedNum()).toBe(1);
    });
  });

  describe('isPeerIsDisConnect', () => {
    it('is false for a peer still connected', () => {
      const cursor = new PeerCursor();
      cursor.initialize();
      cursor.peerId = 'connected-peer';
      cursor.isDisConnect = false;

      expect(component.isPeerIsDisConnect('connected-peer')).toBe(false);
    });

    it('is true for one that has dropped', () => {
      const cursor = new PeerCursor();
      cursor.initialize();
      cursor.peerId = 'disconnected-peer';
      cursor.isDisConnect = true;

      expect(component.isPeerIsDisConnect('disconnected-peer')).toBe(true);
    });

    it('is true for one that was never there', () => {
      expect(component.isPeerIsDisConnect('nonexistent')).toBe(true);
    });
  });

  describe('setDefaultCheck', () => {
    it('leaves a dropped peer out of the picked', () => {
      const cursor = new PeerCursor();
      cursor.initialize();
      cursor.peerId = 'disc-peer';
      cursor.isDisConnect = true;

      component.setDefaultCheck();

      expect(component['checkedPeers'].has('disc-peer')).toBe(false);
    });
  });
});
