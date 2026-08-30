import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChatMessageService } from '@axe/application/chat/chat-message.service';
import { ChatSpeakerService } from '@axe/application/chat/chat-speaker.service';
import { ObjectChangeService, ObjectDeleteEvent } from '@axe/application/sync/object-change.service';
import { EventChannel } from '@axe/core/event/event-channel';
import { childrenChanged$, objectChanged$ } from '@axe/core/sync/object-event-extension';
import { GameCharacter } from '@axe/domain/character/game-character';
import { ChatTab } from '@axe/domain/chat/chat-tab';
import { ChatTabList } from '@axe/domain/chat/chat-tab-list';
import { DataElement, DataElementFieldType } from '@axe/domain/data/data-element';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { PeerRole } from '@axe/domain/peer/peer-role';
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

  it('leaves the speaker alone when a second window opens', () => {
    const speaker = TestBed.inject(ChatSpeakerService);
    const character = GameCharacter.create('術者', 1, '');
    component.sendFrom = character.identifier;
    expect(speaker.current()).toBe(character);

    TestBed.createComponent(ChatWindowComponent);

    expect(speaker.current()).toBe(character);
    character.destroy();
  });

  it('tells the room who it speaks as once the reader chooses', () => {
    const speaker = TestBed.inject(ChatSpeakerService);
    const character = GameCharacter.create('術者', 1, '');

    component.sendFrom = character.identifier;

    expect(speaker.identifier()).toBe(character.identifier);
    character.destroy();
  });

  it('injects a change detector', () => {
    const cdr = fixture.debugElement.injector.get(ChangeDetectorRef);
    expect(cdr).toBeTruthy();
  });

  it('lets the panel take the pointer again once the drag ends', async () => {
    await expectPanelDragRecovery(ChatWindowComponent);
  });

  describe('who is typing', () => {
    function log(): HTMLElement {
      return fixture.nativeElement.querySelector('[data-testid="chat-log-scroll"]') as HTMLElement;
    }

    let tab: ChatTab;

    beforeEach(() => {
      tab = ChatTabList.instance.addChatTab('話している卓');
      component.chatTabidentifier = tab.identifier;
      fixture.detectChanges();
    });

    afterEach(() => {
      tab.destroy();
    });

    function typing(names: string[]): void {
      const speakers = names.map((name, at) => ({
        peerId: `peer-${at}`,
        name,
        imageFile: GameCharacter.create(name, 1, '').imageFile,
      }));
      component.chatTabRef()?.writingSpeakers.set(speakers);
      fixture.detectChanges();
    }

    it('holds the strip open whether or not anybody is typing', () => {
      typing([]);
      const quiet = log().style.paddingBottom;

      typing(['somebody']);

      expect(log().style.paddingBottom).toBe(quiet);
      expect(quiet).toBe(`${component.writingStripPx}px`);
    });

    it('hangs it over the log rather than under it, so no line the reader is on moves', () => {
      typing(['somebody']);
      const strip = fixture.nativeElement.querySelector('[data-testid="writing-strip"]') as HTMLElement;

      expect(strip).not.toBeNull();
      expect(strip.className).toContain('absolute');
      expect(strip.style.height).toBe(`${component.writingStripPx}px`);
    });

    it('shows nothing at all while nobody is typing', () => {
      typing([]);

      expect(fixture.nativeElement.querySelector('[data-testid="writing-strip"]')).toBeNull();
    });

    it('names the first two and counts the rest', () => {
      typing(['one', 'two', 'three', 'four']);
      const words = (fixture.nativeElement as HTMLElement).textContent ?? '';

      expect(words).toContain('one');
      expect(words).toContain('two');
      expect(words).not.toContain('three');
    });
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

    it('walks only the tabs the strip shows', () => {
      PeerCursor.myCursor.role = PeerRole.Player;
      tabs[1].plCanView = false;
      objectChange.notifyChanged(tabs[1].identifier);
      fixture.detectChanges();

      component.chatTabSwitchRelative(1);

      expect(component.chatTabidentifier).toBe(tabs[0].identifier);
    });
  });

  describe('moving between tabs by wheel', () => {
    let tabs: ChatTab[];

    function turnWheel(deltaY: number, deltaMode = 0): WheelEvent {
      const event = new WheelEvent('wheel', { deltaY, cancelable: true });
      Object.defineProperty(event, 'deltaMode', { value: deltaMode });
      component.switchTabByWheel(event);
      fixture.detectChanges();
      return event;
    }

    beforeEach(() => {
      tabs = [
        ChatTabList.instance.addChatTab('一枚目'),
        ChatTabList.instance.addChatTab('二枚目'),
        ChatTabList.instance.addChatTab('三枚目'),
      ];
      component.chatTabidentifier = tabs[0].identifier;
      fixture.detectChanges();
    });

    afterEach(() => {
      tabs.forEach((tab) => tab.destroy());
    });

    it('moves on to the next tab as the wheel turns forward', () => {
      turnWheel(100);

      expect(component.chatTabidentifier).toBe(tabs[1].identifier);
    });

    it('moves back a tab as the wheel turns back', () => {
      component.chatTabidentifier = tabs[1].identifier;

      turnWheel(-100);

      expect(component.chatTabidentifier).toBe(tabs[0].identifier);
    });

    it('takes a notch reported in lines as a whole notch', () => {
      turnWheel(3, 1);

      expect(component.chatTabidentifier).toBe(tabs[1].identifier);
    });

    it('gathers up the small steps a trackpad sends', () => {
      turnWheel(8);
      turnWheel(8);

      expect(component.chatTabidentifier).toBe(tabs[0].identifier);

      turnWheel(8);
      turnWheel(8);
      turnWheel(8);

      expect(component.chatTabidentifier).toBe(tabs[1].identifier);
    });

    it('drops what it gathered when the wheel turns the other way', () => {
      turnWheel(30);
      turnWheel(-30);

      expect(component.chatTabidentifier).toBe(tabs[0].identifier);
    });

    it('holds on to the wheel so the strip does not slide instead', () => {
      const event = turnWheel(100);

      expect(event.defaultPrevented).toBe(true);
    });

    it('stops at the last tab rather than coming back round', () => {
      component.chatTabidentifier = tabs[2].identifier;

      turnWheel(100);

      expect(component.chatTabidentifier).toBe(tabs[2].identifier);
    });

    it('stops at the first tab rather than coming back round', () => {
      turnWheel(-100);

      expect(component.chatTabidentifier).toBe(tabs[0].identifier);
    });

    it('leaves a sideways push to the strip it is over', () => {
      const event = new WheelEvent('wheel', { deltaX: -120, deltaY: 0, cancelable: true });
      component.switchTabByWheel(event);
      fixture.detectChanges();

      // The strip is the one thing there that scrolls sideways, so the push belongs to it.
      expect(event.defaultPrevented).toBe(false);
      expect(component.chatTabidentifier).toBe(tabs[0].identifier);
    });

    it('leaves a wheel that has not moved alone', () => {
      const event = turnWheel(0);

      expect(event.defaultPrevented).toBe(false);
      expect(component.chatTabidentifier).toBe(tabs[0].identifier);
    });
  });
  describe('bringing the current tab back into the strip', () => {
    const PILL_WIDTH = 50;
    const PILL_PITCH = 60;

    let tabs: ChatTab[];

    /** happy-dom lays nothing out, so the strip is given a shape: three pills of 50 every 60. */
    function layOutStrip(stripWidth: number): { strip: HTMLElement; scrolledTo: number[] } {
      const inputs = [...fixture.nativeElement.querySelectorAll('input[name="chat-tab"]')] as HTMLInputElement[];
      const pills = inputs.map((input) => input.closest('label') as HTMLElement);
      const strip = pills[0].parentElement as HTMLElement;
      const scrolledTo: number[] = [];

      strip.getBoundingClientRect = () => ({ left: 0, right: stripWidth }) as DOMRect;
      pills.forEach((pill, index) => {
        pill.getBoundingClientRect = () => {
          const left = index * PILL_PITCH - strip.scrollLeft;
          return { left, right: left + PILL_WIDTH } as DOMRect;
        };
      });
      strip.scrollTo = ((options: ScrollToOptions) => {
        scrolledTo.push(options.left ?? 0);
        strip.scrollLeft = options.left ?? 0;
      }) as typeof strip.scrollTo;

      return { strip, scrolledTo };
    }

    beforeEach(() => {
      tabs = ['一枚目', '二枚目', '三枚目'].map((name) => ChatTabList.instance.addChatTab(name));
      component.chatTabidentifier = tabs[0].identifier;
      fixture.detectChanges();
    });

    afterEach(() => {
      tabs.forEach((tab) => tab.destroy());
    });

    it('measures the tab it lands on rather than the one it left', () => {
      const { strip, scrolledTo } = layOutStrip(100);

      component.chatTabidentifier = tabs[2].identifier;
      fixture.detectChanges();

      // The third pill sits at 120 and the strip is 100 wide: 94 leaves it 24 clear of the far edge.
      expect(scrolledTo).toEqual([94]);
      expect(strip.scrollLeft).toBe(94);
    });

    it('leaves the tab clear of the edge it came in at', () => {
      const { strip, scrolledTo } = layOutStrip(100);
      component.chatTabidentifier = tabs[2].identifier;
      fixture.detectChanges();
      scrolledTo.length = 0;

      component.chatTabidentifier = tabs[1].identifier;
      fixture.detectChanges();

      expect(strip.scrollLeft).toBe(36);
      expect(60 - strip.scrollLeft).toBe(24);
    });

    it('holds still for a tab that already has room on both sides', () => {
      const { scrolledTo } = layOutStrip(300);

      component.chatTabidentifier = tabs[2].identifier;
      fixture.detectChanges();

      expect(scrolledTo).toEqual([]);
    });

    it('follows the wheel a tab at a time', () => {
      const { strip, scrolledTo } = layOutStrip(100);

      component.switchTabByWheel(new WheelEvent('wheel', { deltaY: 100, cancelable: true }));
      fixture.detectChanges();

      expect(component.chatTabidentifier).toBe(tabs[1].identifier);
      expect(scrolledTo).toEqual([34]);
      expect(strip.scrollLeft).toBe(34);
    });

    it('finishes the scroll when the wheel runs on past the last tab', () => {
      const { strip, scrolledTo } = layOutStrip(100);
      component.chatTabidentifier = tabs[2].identifier;
      fixture.detectChanges();
      strip.scrollLeft = 0;
      scrolledTo.length = 0;

      component.switchTabByWheel(new WheelEvent('wheel', { deltaY: 100, cancelable: true }));

      expect(component.chatTabidentifier).toBe(tabs[2].identifier);
      expect(scrolledTo).toEqual([94]);
    });
  });

  describe('filling in the references of a line', () => {
    let tab: ChatTab;
    let character: GameCharacter;
    let sent: { text: string; attachments: string[] | undefined }[];
    let mark: GameCharacter | null;

    function speak(text: string, sendFrom: string): void {
      component.sendChat({
        text,
        gameSystem: null as never,
        sendFrom,
        sendTo: '',
        portraitIndex: 0,
        messColor: '#000000',
        replyTo: '',
        quoteOf: '',
      });
    }

    beforeEach(() => {
      tab = ChatTabList.instance.addChatTab('参照');
      component.chatTabidentifier = tab.identifier;
      fixture.detectChanges();

      character = new GameCharacter();
      character.initialize();
      character.createDataElements();
      const detail = DataElement.create('detail', '');
      const status = DataElement.create('ステータス', '');
      status.appendChild(DataElement.create('HP', '13'));
      detail.appendChild(status);
      character.rootDataElement?.appendChild(detail);

      sent = [];
      mark = null;
      vi.spyOn(TestBed.inject(ChatMessageService), 'sendMessage').mockImplementation(((...args: unknown[]) => {
        sent.push({ text: args[1] as string, attachments: args[8] as string[] | undefined });
        return null as never;
      }) as never);
    });

    afterEach(() => {
      vi.restoreAllMocks();
      mark?.destroy();
      character.destroy();
      tab.destroy();
    });

    it('reads the sheet of the piece the line is spoken as', () => {
      speak('2d6+{HP}', character.identifier);

      expect(sent[0].text).toBe('2d6+13');
    });

    it('leaves the line alone when it is spoken as yourself', () => {
      speak('2d6+{HP}', PeerCursor.myCursor.identifier);

      expect(sent[0].text).toBe('2d6+{HP}');
    });

    it('reads the sheet of the piece the line is aimed at, spoken as yourself', () => {
      mark = GameCharacter.create('対象', 1, '');
      mark.status.setValue('HP', 'now', 7);
      mark.setLocation('table');
      mark.targeted = true;

      speak('t:HP-t{HP}', PeerCursor.myCursor.identifier);

      expect(sent[0].text).toBe('t:HP-7 [対象]');
    });

    it('sends on the picture a reference stands for', () => {
      const detail = character.rootDataElement?.getFirstElementByName('detail');
      detail?.appendChild(DataElement.create('立ち絵', 'portrait-id', { fieldType: DataElementFieldType.IMAGE }));

      speak('{立ち絵}', character.identifier);

      expect(sent[0].attachments).toEqual(['portrait-id']);
    });
  });
});
