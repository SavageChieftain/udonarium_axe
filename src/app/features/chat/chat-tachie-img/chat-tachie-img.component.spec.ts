import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { objectChanged$ } from '@axe/core/sync/object-event-extension';
import { ChatTabList } from '@axe/domain/chat/chat-tab-list';
import { ObjectChangeService } from '@axe/shared/object-change.service';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

import { ChatTachieImageComponent } from './chat-tachie-img.component';

describe('ChatTachieImageComponent', () => {
  let component: ChatTachieImageComponent;
  let fixture: ComponentFixture<ChatTachieImageComponent>;
  let objectChange: ObjectChangeService;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [ChatTachieImageComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ChatTachieImageComponent);
    component = fixture.componentInstance;
    objectChange = TestBed.inject(ObjectChangeService);

    const chatTabList = ChatTabList.instance;
    const chatTab = chatTabList.chatTabs[0] ?? chatTabList.addChatTab('テスト');
    component.chatTabidentifier = chatTab.identifier;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('イベントリスナー', () => {
    it('imageFileUrl_00がfileVersion()シグナルを読み取ること', () => {
      fixture.detectChanges();
      const spy = vi.spyOn(objectChange, 'fileVersion');

      // getterを呼び出すとfileVersion()が読まれる
      void component.imageFileUrl_00;

      expect(spy).toHaveBeenCalled();
    });

    it('objectChanged$で対象タブのmarkForCheckが呼ばれること', () => {
      fixture.detectChanges();
      const cdr = (component as unknown as { changeDetectionRef: ChangeDetectorRef }).changeDetectionRef;
      const spy = vi.spyOn(cdr, 'markForCheck');

      const chatTab = ChatTabList.instance.chatTabs[0];
      objectChanged$.next({ identifier: chatTab.identifier, aliasName: chatTab.aliasName, isSendFromSelf: false });

      expect(spy).toHaveBeenCalled();
    });

    it('objectChanged$で無関係なオブジェクトではmarkForCheckが呼ばれないこと', () => {
      fixture.detectChanges();
      const cdr = (component as unknown as { changeDetectionRef: ChangeDetectorRef }).changeDetectionRef;
      const spy = vi.spyOn(cdr, 'markForCheck');

      objectChanged$.next({ identifier: 'unrelated-id', aliasName: 'other', isSendFromSelf: false });

      expect(spy).not.toHaveBeenCalled();
    });
  });
});
