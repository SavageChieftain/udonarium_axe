import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

import { VoteMenuComponent } from './vote-menu.component';

describe('VoteMenuComponent', () => {
  let component: VoteMenuComponent;
  let fixture: ComponentFixture<VoteMenuComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [VoteMenuComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(VoteMenuComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
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

  describe('onChangeType', () => {
    it('rollcallを渡すとisRollCallがtrueになること', () => {
      component.isRollCall = false;
      component.onChangeType('rollcall');
      expect(component.isRollCall).toBe(true);
    });

    it('voteを渡すとisRollCallがfalseになること', () => {
      component.isRollCall = true;
      component.onChangeType('vote');
      expect(component.isRollCall).toBe(false);
    });
  });

  describe('selectedList', () => {
    it('checkedPeersの内容が返されること', () => {
      component['checkedPeers'].add('peer-1');
      component['checkedPeers'].add('peer-2');
      component.includSelf = false;
      const list = component.selectedList();
      expect(list).toContain('peer-1');
      expect(list).toContain('peer-2');
      expect(list.length).toBe(2);
    });

    it('includSelfがfalseのときcheckedPeersのみ返すこと', () => {
      component['checkedPeers'].add('peer-1');
      component.includSelf = false;
      const list = component.selectedList();
      expect(list).toEqual(['peer-1']);
    });
  });

  describe('selectedNum', () => {
    it('selectedListの長さを返すこと', () => {
      component['checkedPeers'].add('peer-1');
      component.includSelf = false;
      expect(component.selectedNum()).toBe(1);
    });
  });
});
