import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { expectPanelDragRecovery, PanelDragTestHostComponent } from '@axe/testing/panel-drag-recovery';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

import { AlarmMenuComponent } from './alarm-menu.component';

describe('AlarmMenuComponent', () => {
  let component: AlarmMenuComponent;
  let fixture: ComponentFixture<AlarmMenuComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [AlarmMenuComponent, PanelDragTestHostComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AlarmMenuComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('global dragging が解除されたら panel の pointer-events-none も解除されること', async () => {
    await expectPanelDragRecovery(AlarmMenuComponent, {
      beforeOpen: () => {
        PeerCursor.createMyCursor();
      },
    });
  });

  describe('checkedPeers による選択状態管理', () => {
    it('voteBlockClick で未登録のIDが追加されること', () => {
      component.voteBlockClick('peer-1');
      expect(component['checkedPeers'].has('peer-1')).toBe(true);
    });

    it('voteBlockClick で登録済みのIDが削除されること', () => {
      component.voteBlockClick('peer-1');
      component.voteBlockClick('peer-1');
      expect(component['checkedPeers'].has('peer-1')).toBe(false);
    });

    it('複数のピアを独立して管理できること', () => {
      component.voteBlockClick('peer-a');
      component.voteBlockClick('peer-b');
      expect(component['checkedPeers'].has('peer-a')).toBe(true);
      expect(component['checkedPeers'].has('peer-b')).toBe(true);

      component.voteBlockClick('peer-a');
      expect(component['checkedPeers'].has('peer-a')).toBe(false);
      expect(component['checkedPeers'].has('peer-b')).toBe(true);
    });
  });

  describe('selectedList', () => {
    it('checkedPeersの内容が返されること', () => {
      component['checkedPeers'].add('peer-1');
      component.includSelf = false;
      const list = component.selectedList();
      expect(list).toContain('peer-1');
      expect(list.length).toBe(1);
    });
  });

  describe('changeAlarmTime', () => {
    it('負値を0にクランプすること', () => {
      component.alarmTime = -10;
      component.changeAlarmTime();
      expect(component.alarmTime).toBe(0);
    });

    it('3600超を3600にクランプすること', () => {
      component.alarmTime = 9999;
      component.changeAlarmTime();
      expect(component.alarmTime).toBe(3600);
    });
  });
});
