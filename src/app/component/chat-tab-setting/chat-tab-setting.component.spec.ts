import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

import { ChatTabSettingComponent } from './chat-tab-setting.component';

describe('ChatTabSettingComponent', () => {
  let component: ChatTabSettingComponent;
  let fixture: ComponentFixture<ChatTabSettingComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [ChatTabSettingComponent],
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
});
