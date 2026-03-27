import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { expectPanelDragRecovery, PanelDragTestHostComponent } from '@axe/testing/panel-drag-recovery';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

import { ChatTabSettingComponent } from './chat-tab-setting.component';

describe('ChatTabSettingComponent', () => {
  let component: ChatTabSettingComponent;
  let fixture: ComponentFixture<ChatTabSettingComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [ChatTabSettingComponent, PanelDragTestHostComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ChatTabSettingComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('selectedTabがnullの場合', () => {
    it('selectedTabがnullでもdetectChangesでクラッシュしないこと', () => {
      component.selectedTab = null;
      expect(() => fixture.detectChanges()).not.toThrow();
    });

    it('tabNameが空文字を返すこと', () => {
      component.selectedTab = null;
      expect(component.tabName).toBe('');
    });
  });

  it('OnPushコンポーネントでChangeDetectorRefが注入されていること', () => {
    const cdr = fixture.debugElement.injector.get(ChangeDetectorRef);
    expect(cdr).toBeTruthy();
  });

  it('global dragging が解除されたら panel の pointer-events-none も解除されること', async () => {
    await expectPanelDragRecovery(ChatTabSettingComponent);
  });
});
