import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChatTabList } from '@axe/class/chat-tab-list';
import { EventSystem } from '@axe/class/core/system';
import { PeerCursor } from '@axe/class/peer-cursor';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

import { ChatWindowComponent } from './chat-window.component';

describe('ChatWindowComponent', () => {
  let component: ChatWindowComponent;
  let fixture: ComponentFixture<ChatWindowComponent>;

  beforeEach(async () => {
    PeerCursor.createMyCursor();
    TestBed.configureTestingModule({
      imports: [ChatWindowComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ChatWindowComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('OnPushコンポーネントでChangeDetectorRefが注入されていること', () => {
    const cdr = fixture.debugElement.injector.get(ChangeDetectorRef);
    expect(cdr).toBeTruthy();
  });

  describe('チャットタブの変更検知', () => {
    it('UPDATE_GAME_OBJECTでChatTabList変更時に無効なタブが再選択されること', () => {
      fixture.detectChanges();
      const invalidId = 'non-existent-tab-id';
      (component as unknown as { _chatTabidentifier: string })._chatTabidentifier = invalidId;

      const chatTabList = ChatTabList.instance;
      EventSystem.trigger('UPDATE_GAME_OBJECT', chatTabList.toContext());

      expect((component as unknown as { _chatTabidentifier: string })._chatTabidentifier).not.toBe(invalidId);
    });

    it('DELETE_GAME_OBJECTで選択中タブ削除時にタブが再選択されること', () => {
      fixture.detectChanges();
      const oldIdentifier = 'non-existent-tab-id';
      (component as unknown as { _chatTabidentifier: string })._chatTabidentifier = oldIdentifier;

      EventSystem.trigger('DELETE_GAME_OBJECT', {
        aliasName: 'chat-tab',
        identifier: oldIdentifier,
      });

      expect((component as unknown as { _chatTabidentifier: string })._chatTabidentifier).not.toBe(oldIdentifier);
    });

    it('UPDATE_GAME_OBJECTでタブ再選択時にscrollToBottomが呼ばれること', () => {
      fixture.detectChanges();
      const spy = vi.spyOn(component, 'scrollToBottom');
      const invalidId = 'non-existent-tab-id';
      (component as unknown as { _chatTabidentifier: string })._chatTabidentifier = invalidId;

      const chatTabList = ChatTabList.instance;
      EventSystem.trigger('UPDATE_GAME_OBJECT', chatTabList.toContext());

      expect(spy).toHaveBeenCalledWith(true);
    });

    it('DELETE_GAME_OBJECTでタブ再選択時にscrollToBottomが呼ばれること', () => {
      fixture.detectChanges();
      const spy = vi.spyOn(component, 'scrollToBottom');
      const oldIdentifier = 'non-existent-tab-id';
      (component as unknown as { _chatTabidentifier: string })._chatTabidentifier = oldIdentifier;

      EventSystem.trigger('DELETE_GAME_OBJECT', {
        aliasName: 'chat-tab',
        identifier: oldIdentifier,
      });

      expect(spy).toHaveBeenCalledWith(true);
    });
  });
});
