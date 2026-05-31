import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ObjectChangeService, ObjectDeleteEvent } from '@axe/application/sync/object-change.service';
import { EventChannel } from '@axe/core/event/event-channel';
import { childrenChanged$, objectChanged$ } from '@axe/core/sync/object-event-extension';
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

  it('OnPushコンポーネントでChangeDetectorRefが注入されていること', () => {
    const cdr = fixture.debugElement.injector.get(ChangeDetectorRef);
    expect(cdr).toBeTruthy();
  });

  it('global dragging が解除されたら panel の pointer-events-none も解除されること', async () => {
    await expectPanelDragRecovery(ChatWindowComponent);
  });

  describe('チャットタブの変更検知', () => {
    it('UPDATE_GAME_OBJECTでChatTabList変更時に無効なタブが再選択されること', () => {
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

    it('DELETE_GAME_OBJECTで選択中タブ削除時にタブが再選択されること', () => {
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

    it('UPDATE_GAME_OBJECTでタブ再選択時にscrollToBottomが呼ばれること', () => {
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

    it('DELETE_GAME_OBJECTでタブ再選択時にscrollToBottomが呼ばれること', () => {
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
    it('chatTabsVersion が computed signal として公開されていること', () => {
      expect(typeof component.chatTabsVersion).toBe('function');
    });

    it('chatTabsVersion() が chatTabs 配列を返すこと', () => {
      fixture.detectChanges();
      const tabs = component.chatTabsVersion();
      expect(Array.isArray(tabs)).toBe(true);
    });

    it('childrenChanged$ emit 後に chatTabsVersion の依存 signal (versionOf) が increment されること', () => {
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

    it('scrollToBottom 後に notifyChanged が呼ばれること', async () => {
      fixture.detectChanges();
      const objectChange = TestBed.inject(ObjectChangeService);
      const spy = vi.spyOn(objectChange, 'notifyChanged');

      // panelService.scrollablePanel を設定して scrollToBottom が早期 return しないようにする
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

  describe('非追従モードのスクロール挙動', () => {
    /**
     * 非追従モード + 非 force 呼び出し時に scrollToBottom$ を発火しないこと。
     * 発火すると chat-tab.resetMessages() が走り、bottomIndex を末尾にリセットする一方で
     * 実際の scroll は移動しないため、メッセージコンテナが flex justify-end で
     * 下方向にスライドして画面外に押し出されて空白表示になる (報告された不具合)。
     */
    it('非追従モード + isForce=false なら scrollToBottom$ を発火しないこと', async () => {
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

    it('追従モードでは scrollToBottom$ を発火すること', async () => {
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

    it('isForce=true なら追従設定にかかわらず scrollToBottom$ を発火すること', async () => {
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

    it('非追従モードでメッセージ蓄積により下端から離れたら isNearBottom が false になること', async () => {
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

    it('非追従モードで下端付近なら isNearBottom が true のままであること', async () => {
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
});
