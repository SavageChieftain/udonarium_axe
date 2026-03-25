import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { objectChanged$ } from '@axe/core/sync/object-event-extension';
import { ChatTabList } from '@axe/domain/chat/chat-tab-list';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { ObjectChangeService, ObjectDeleteEvent } from '@axe/shared/object-change.service';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';
import { Subject } from 'rxjs';

import { ChatWindowComponent } from './chat-window.component';

describe('ChatWindowComponent', () => {
  let component: ChatWindowComponent;
  let fixture: ComponentFixture<ChatWindowComponent>;
  let objectChange: ObjectChangeService;

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
    objectChange = TestBed.inject(ObjectChangeService);
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
      objectChanged$.next({
        identifier: chatTabList.identifier,
        aliasName: chatTabList.aliasName,
        isSendFromSelf: false,
      });

      expect((component as unknown as { _chatTabidentifier: string })._chatTabidentifier).not.toBe(invalidId);
    });

    it('DELETE_GAME_OBJECTで選択中タブ削除時にタブが再選択されること', () => {
      fixture.detectChanges();
      const oldIdentifier = 'non-existent-tab-id';
      (component as unknown as { _chatTabidentifier: string })._chatTabidentifier = oldIdentifier;

      (objectChange as unknown as { _objectDeleted$: Subject<ObjectDeleteEvent> })._objectDeleted$.next({
        aliasName: 'chat-tab',
        identifier: oldIdentifier,
        isSendFromSelf: true,
      });

      expect((component as unknown as { _chatTabidentifier: string })._chatTabidentifier).not.toBe(oldIdentifier);
    });

    it('UPDATE_GAME_OBJECTでタブ再選択時にscrollToBottomが呼ばれること', () => {
      fixture.detectChanges();
      const spy = vi.spyOn(component, 'scrollToBottom');
      const invalidId = 'non-existent-tab-id';
      (component as unknown as { _chatTabidentifier: string })._chatTabidentifier = invalidId;

      const chatTabList = ChatTabList.instance;
      objectChanged$.next({
        identifier: chatTabList.identifier,
        aliasName: chatTabList.aliasName,
        isSendFromSelf: false,
      });

      expect(spy).toHaveBeenCalledWith(true);
    });

    it('DELETE_GAME_OBJECTでタブ再選択時にscrollToBottomが呼ばれること', () => {
      fixture.detectChanges();
      const spy = vi.spyOn(component, 'scrollToBottom');
      const oldIdentifier = 'non-existent-tab-id';
      (component as unknown as { _chatTabidentifier: string })._chatTabidentifier = oldIdentifier;

      (objectChange as unknown as { _objectDeleted$: Subject<ObjectDeleteEvent> })._objectDeleted$.next({
        aliasName: 'chat-tab',
        identifier: oldIdentifier,
        isSendFromSelf: true,
      });

      expect(spy).toHaveBeenCalledWith(true);
    });
  });
});
