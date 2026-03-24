import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EventSystem } from '@axe/core/index';
import { ChatTabList } from '@axe/domain/chat/chat-tab-list';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

import { ChatTachieImageComponent } from './chat-tachie-img.component';

describe('ChatTachieImageComponent', () => {
  let component: ChatTachieImageComponent;
  let fixture: ComponentFixture<ChatTachieImageComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [ChatTachieImageComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ChatTachieImageComponent);
    component = fixture.componentInstance;

    const chatTabList = ChatTabList.instance;
    const chatTab = chatTabList.chatTabs[0] ?? chatTabList.addChatTab('テスト');
    component.chatTabidentifier = chatTab.identifier;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('イベントリスナー', () => {
    it('SYNCHRONIZE_FILE_LISTイベントでmarkForCheckが呼ばれること', () => {
      fixture.detectChanges();
      const cdr = (component as unknown as { changeDetectionRef: ChangeDetectorRef }).changeDetectionRef;
      const spy = vi.spyOn(cdr, 'markForCheck');

      EventSystem.trigger('SYNCHRONIZE_FILE_LIST', []);

      expect(spy).toHaveBeenCalled();
    });

    it('UPDATE_GAME_OBJECTイベントで対象タブのmarkForCheckが呼ばれること', () => {
      fixture.detectChanges();
      const cdr = (component as unknown as { changeDetectionRef: ChangeDetectorRef }).changeDetectionRef;
      const spy = vi.spyOn(cdr, 'markForCheck');

      const chatTab = ChatTabList.instance.chatTabs[0];
      EventSystem.trigger('UPDATE_GAME_OBJECT', chatTab.toContext());

      expect(spy).toHaveBeenCalled();
    });

    it('UPDATE_GAME_OBJECTイベントで無関係なオブジェクトではmarkForCheckが呼ばれないこと', () => {
      fixture.detectChanges();
      const cdr = (component as unknown as { changeDetectionRef: ChangeDetectorRef }).changeDetectionRef;
      const spy = vi.spyOn(cdr, 'markForCheck');

      EventSystem.trigger('UPDATE_GAME_OBJECT', {
        identifier: 'unrelated-id',
        majorVersion: 0,
        minorVersion: 0,
        syncData: {},
        aliasName: 'other',
      });

      expect(spy).not.toHaveBeenCalled();
    });
  });
});
