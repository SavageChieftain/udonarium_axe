import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ObjectChangeService, ObjectDeleteEvent } from '@axe/application/sync/object-change.service';
import { EventChannel } from '@axe/core/event/event-channel';
import { childrenChanged$, objectChanged$ } from '@axe/core/sync/object-event-extension';
import { ChatTab } from '@axe/domain/chat/chat-tab';
import { ChatTabList } from '@axe/domain/chat/chat-tab-list';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { ChatWindowComponent } from '@axe/features/chat/chat-window/chat-window.component';
import { expectPanelDragRecovery, PanelDragTestHostComponent } from '@axe/testing/panel-drag-recovery';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('ChatWindowComponent', () => {
  let component: ChatWindowComponent;
  let fixture: ComponentFixture<ChatWindowComponent>;
  let objectChange: ObjectChangeService;

  beforeEach(async () => {
    PeerCursor.createMyCursor();
    TestBed.configureTestingModule({
      imports: [ChatWindowComponent, PanelDragTestHostComponent],
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

  it('injects a change detector', () => {
    const cdr = fixture.debugElement.injector.get(ChangeDetectorRef);
    expect(cdr).toBeTruthy();
  });

  it('lets the panel take the pointer again once the drag ends', async () => {
    await expectPanelDragRecovery(ChatWindowComponent);
  });

  describe('noticing a change of chat tab', () => {
    it('moves off a tab that is no longer there when the list changes', () => {
      fixture.detectChanges();
      const invalidId = 'non-existent-tab-id';
      const priv = component as unknown as { _chatTabidentifier: { (): string; set(v: string): void } };
      priv._chatTabidentifier.set(invalidId);

      const chatTabList = ChatTabList.instance;
      objectChanged$.emit({
        identifier: chatTabList.identifier,
        aliasName: chatTabList.aliasName,
        isSendFromSelf: false,
      });

      expect(priv._chatTabidentifier()).not.toBe(invalidId);
    });

    it('moves off the open tab once it is deleted', () => {
      fixture.detectChanges();
      const oldIdentifier = 'non-existent-tab-id';
      const priv = component as unknown as { _chatTabidentifier: { (): string; set(v: string): void } };
      priv._chatTabidentifier.set(oldIdentifier);

      (objectChange as unknown as { _objectDeleted$: EventChannel<ObjectDeleteEvent> })._objectDeleted$.emit({
        aliasName: 'chat-tab',
        identifier: oldIdentifier,
        isSendFromSelf: true,
      });

      expect(priv._chatTabidentifier()).not.toBe(oldIdentifier);
    });

    it('scrolls to the bottom after moving on an update', () => {
      fixture.detectChanges();
      const spy = vi.spyOn(component, 'scrollToBottom');
      const invalidId = 'non-existent-tab-id';
      const priv = component as unknown as { _chatTabidentifier: { set(v: string): void } };
      priv._chatTabidentifier.set(invalidId);

      const chatTabList = ChatTabList.instance;
      objectChanged$.emit({
        identifier: chatTabList.identifier,
        aliasName: chatTabList.aliasName,
        isSendFromSelf: false,
      });

      expect(spy).toHaveBeenCalledWith(true);
    });

    it('scrolls to the bottom after moving on a delete', () => {
      fixture.detectChanges();
      const spy = vi.spyOn(component, 'scrollToBottom');
      const oldIdentifier = 'non-existent-tab-id';
      const priv = component as unknown as { _chatTabidentifier: { set(v: string): void } };
      priv._chatTabidentifier.set(oldIdentifier);

      (objectChange as unknown as { _objectDeleted$: EventChannel<ObjectDeleteEvent> })._objectDeleted$.emit({
        aliasName: 'chat-tab',
        identifier: oldIdentifier,
        isSendFromSelf: true,
      });

      expect(spy).toHaveBeenCalledWith(true);
    });
  });

  describe('chatTabsVersion signal', () => {
    it('exposes the tab version as a computed signal', () => {
      expect(typeof component.chatTabsVersion).toBe('function');
    });

    it('returns the tabs from it', () => {
      fixture.detectChanges();
      const tabs = component.chatTabsVersion();
      expect(Array.isArray(tabs)).toBe(true);
    });

    it('bumps the version it depends on when the children change', () => {
      fixture.detectChanges();
      const objectChange = TestBed.inject(ObjectChangeService);
      const tabs = component.chatTabsVersion();
      if (tabs.length === 0) return; // タブなしは検証スキップ

      const tabId = tabs[0].identifier;
      const before = objectChange.versionOf(tabId)();

      childrenChanged$.emit({ identifier: tabId });

      const after = objectChange.versionOf(tabId)();
      expect(after).toBe(before + 1);
    });

    it('says it changed after scrolling to the bottom', async () => {
      fixture.detectChanges();
      const objectChange = TestBed.inject(ObjectChangeService);
      const spy = vi.spyOn(objectChange, 'notifyChanged');

      // a scrollable panel is set, so the scroll does not return early
      const panelEl = document.createElement('div');
      const priv = component as unknown as { panelService: { scrollablePanel: HTMLDivElement | null } };
      priv.panelService.scrollablePanel = panelEl;

      vi.useFakeTimers();
      try {
        component.scrollToBottom(true);
        vi.runOnlyPendingTimers();
      } finally {
        vi.useRealTimers();
      }

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('scrolling while it is not following', () => {
    /**
     * It does not fire the scroll while it is not following and is not forced.
     * Firing it resets the messages and puts the bottom index at the end while the scroll
     * itself does not move, so the container slides down against its end alignment and is
     * pushed off the screen, leaving a blank.
     */
    it('does not scroll while it is not following and is not forced', async () => {
      const { ChatPreferencesService } = await import('@axe/application/chat/chat-preferences.service');
      const prefs = TestBed.inject(ChatPreferencesService);
      prefs.setAutoFollowScroll(false);
      try {
        fixture.detectChanges();
        const panelEl = document.createElement('div');
        Object.defineProperty(panelEl, 'scrollHeight', { value: 1000, configurable: true });
        const priv = component as unknown as {
          panelService: { scrollablePanel: HTMLDivElement | null; scrollToBottom$: { emit: () => void } };
          isAutoScroll: boolean;
        };
        priv.panelService.scrollablePanel = panelEl;
        priv.isAutoScroll = true; // 「ボトム付近」状態を強制
        const emitSpy = vi.spyOn(priv.panelService.scrollToBottom$, 'emit');

        component.scrollToBottom(false);

        expect(emitSpy).not.toHaveBeenCalled();
      } finally {
        prefs.setAutoFollowScroll(true);
      }
    });

    it('scrolls while it is following', async () => {
      const { ChatPreferencesService } = await import('@axe/application/chat/chat-preferences.service');
      const prefs = TestBed.inject(ChatPreferencesService);
      prefs.setAutoFollowScroll(true);

      fixture.detectChanges();
      const panelEl = document.createElement('div');
      Object.defineProperty(panelEl, 'scrollHeight', { value: 1000, configurable: true });
      const priv = component as unknown as {
        panelService: { scrollablePanel: HTMLDivElement | null; scrollToBottom$: { emit: () => void } };
        isAutoScroll: boolean;
      };
      priv.panelService.scrollablePanel = panelEl;
      priv.isAutoScroll = true;
      const emitSpy = vi.spyOn(priv.panelService.scrollToBottom$, 'emit');

      component.scrollToBottom(false);

      expect(emitSpy).toHaveBeenCalled();
    });

    it('scrolls when it is forced, however it is following', async () => {
      const { ChatPreferencesService } = await import('@axe/application/chat/chat-preferences.service');
      const prefs = TestBed.inject(ChatPreferencesService);
      prefs.setAutoFollowScroll(false);
      try {
        fixture.detectChanges();
        const panelEl = document.createElement('div');
        Object.defineProperty(panelEl, 'scrollHeight', { value: 1000, configurable: true });
        const priv = component as unknown as {
          panelService: { scrollablePanel: HTMLDivElement | null; scrollToBottom$: { emit: () => void } };
        };
        priv.panelService.scrollablePanel = panelEl;
        const emitSpy = vi.spyOn(priv.panelService.scrollToBottom$, 'emit');

        component.scrollToBottom(true); // 「ボトムに戻る」ボタン相当

        expect(emitSpy).toHaveBeenCalled();
      } finally {
        prefs.setAutoFollowScroll(true);
      }
    });

    it('counts itself away from the bottom once the messages pile up beneath it', async () => {
      const { ChatPreferencesService } = await import('@axe/application/chat/chat-preferences.service');
      const prefs = TestBed.inject(ChatPreferencesService);
      prefs.setAutoFollowScroll(false);
      try {
        fixture.detectChanges();
        const panelEl = document.createElement('div');
        Object.defineProperty(panelEl, 'scrollHeight', { value: 1000, configurable: true });
        Object.defineProperty(panelEl, 'clientHeight', { value: 500, configurable: true });
        panelEl.scrollTop = 100;
        const priv = component as unknown as { panelService: { scrollablePanel: HTMLDivElement | null } };
        priv.panelService.scrollablePanel = panelEl;
        component.isNearBottom.set(true);

        component.onAddMessage();

        expect(component.isNearBottom()).toBe(false);
      } finally {
        prefs.setAutoFollowScroll(true);
      }
    });

    it('counts itself near the bottom while it is', async () => {
      const { ChatPreferencesService } = await import('@axe/application/chat/chat-preferences.service');
      const prefs = TestBed.inject(ChatPreferencesService);
      prefs.setAutoFollowScroll(false);
      try {
        fixture.detectChanges();
        const panelEl = document.createElement('div');
        Object.defineProperty(panelEl, 'scrollHeight', { value: 1000, configurable: true });
        Object.defineProperty(panelEl, 'clientHeight', { value: 500, configurable: true });
        panelEl.scrollTop = 499;
        const priv = component as unknown as { panelService: { scrollablePanel: HTMLDivElement | null } };
        priv.panelService.scrollablePanel = panelEl;
        component.isNearBottom.set(false);

        component.onAddMessage();

        expect(component.isNearBottom()).toBe(true);
      } finally {
        prefs.setAutoFollowScroll(true);
      }
    });
  });

  describe('following only from the very bottom', () => {
    function setPanel(scrollTop: number) {
      const panelEl = document.createElement('div');
      Object.defineProperty(panelEl, 'scrollHeight', { value: 1000, configurable: true });
      Object.defineProperty(panelEl, 'clientHeight', { value: 500, configurable: true });
      panelEl.scrollTop = scrollTop;
      const priv = component as unknown as { panelService: { scrollablePanel: HTMLDivElement | null } };
      priv.panelService.scrollablePanel = panelEl;
      return priv;
    }

    it('starts following from the bottom', () => {
      fixture.detectChanges();
      const priv = setPanel(500) as unknown as { isAutoScroll: boolean };
      priv.isAutoScroll = false;

      component.checkAutoScroll();

      expect(priv.isAutoScroll).toBe(true);
    });

    it('does not follow from even a line above it', () => {
      fixture.detectChanges();
      const priv = setPanel(470) as unknown as { isAutoScroll: boolean };
      priv.isAutoScroll = true;

      component.checkAutoScroll();

      expect(priv.isAutoScroll).toBe(false);
    });

    it('clears the unread badge on returning to the bottom', () => {
      fixture.detectChanges();
      const priv = setPanel(500) as unknown as { onScrollPositionChange: () => void };
      component.newMessageCount.set(3);
      component.hasNewMessage.set(true);

      priv.onScrollPositionChange();

      expect(component.newMessageCount()).toBe(0);
      expect(component.hasNewMessage()).toBe(false);
    });

    it('keeps the badge while it is reading above it', () => {
      fixture.detectChanges();
      const priv = setPanel(470) as unknown as { onScrollPositionChange: () => void };
      component.newMessageCount.set(3);
      component.hasNewMessage.set(true);

      priv.onScrollPositionChange();

      expect(component.newMessageCount()).toBe(3);
      expect(component.hasNewMessage()).toBe(true);
      expect(component.isNearBottom()).toBe(true);
    });
  });

  describe('moving between tabs by keyboard', () => {
    function pressControlArrow(direction: number): void {
      const event = new KeyboardEvent('keydown', {
        key: direction < 0 ? 'ArrowLeft' : 'ArrowRight',
        ctrlKey: true,
        bubbles: true,
      });
      fixture.nativeElement.dispatchEvent(event);
      fixture.detectChanges();
    }

    let tabs: ChatTab[];

    beforeEach(() => {
      tabs = [ChatTabList.instance.addChatTab('一枚目'), ChatTabList.instance.addChatTab('二枚目')];
      component.chatTabidentifier = tabs[0].identifier;
      fixture.detectChanges();
    });

    afterEach(() => {
      tabs.forEach((tab) => tab.destroy());
    });

    it('listens on the window, so the shortcut does not depend on the input being there', () => {
      pressControlArrow(1);

      expect(component.chatTabidentifier).toBe(tabs[1].identifier);
    });

    it('keeps hold of the keyboard on a tab that shows no input', () => {
      Object.defineProperty(component, 'canSpeakCurrentTab', { value: () => false });

      component.switchTabByKey(new KeyboardEvent('keydown'), 1);

      expect(component.chatTabidentifier).toBe(tabs[1].identifier);
      expect(document.activeElement).toBe(fixture.nativeElement);
    });
  });
});
