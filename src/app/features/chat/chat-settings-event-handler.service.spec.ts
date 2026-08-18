import { TestBed } from '@angular/core/testing';
import { ChatPreferencesService } from '@axe/application/chat/chat-preferences.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { ChatTab } from '@axe/domain/chat/chat-tab';
import { ChatTabList } from '@axe/domain/chat/chat-tab-list';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { ChatSettingsEventHandlerService } from '@axe/features/chat/chat-settings-event-handler.service';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('ChatSettingsEventHandlerService', () => {
  function makeTab(name: string): ChatTab {
    const tab = new ChatTab();
    tab.name = name;
    tab.initialize();
    return ChatTabList.instance.appendChild(tab)!;
  }

  function start(): ChatSettingsEventHandlerService {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [...TEST_PROVIDERS] });
    return TestBed.inject(ChatSettingsEventHandlerService);
  }

  function clearCursors(): void {
    // Whoever ran before may have left a cursor behind, and a stray one is another peer.
    for (const cursor of ObjectStore.instance.getObjects<PeerCursor>(PeerCursor)) {
      ObjectStore.instance.delete(cursor, false);
    }
    ObjectStore.instance.clearDeleteHistory();
    PeerCursor.myCursor = null!;
  }

  beforeEach(() => {
    localStorage.clear();
    clearCursors();
    ChatTabList.instance.initialize();
    PeerCursor.createMyCursor();
  });

  afterEach(() => {
    localStorage.clear();
    for (const tab of [...ChatTabList.instance.chatTabs]) tab.destroy();
    clearCursors();
  });

  it('writes the stored colours back onto the cursor', () => {
    localStorage.setItem('chat-preferences', JSON.stringify({ colors: ['#123456', '#654321', '#abcdef'] }));

    start();

    expect(PeerCursor.myCursor.chatColorCode).toEqual(['#123456', '#654321', '#abcdef']);
  });

  it('keeps the colours the panel picked', () => {
    const handler = start();
    PeerCursor.myCursor.chatColorCode[0] = '#ff8800';
    handler.captureColors();

    expect(TestBed.inject(ChatPreferencesService).colors()?.[0]).toBe('#ff8800');
  });

  it('writes the stored display settings back onto the tab list', () => {
    localStorage.setItem(
      'chat-preferences',
      JSON.stringify({
        display: {
          portraitHeight: 320,
          isPortraitInWindow: true,
          isKeepPortraitOutWindow: true,
          simpleDispFlagTime: 1,
          simpleDispFlagUserId: 1,
        },
      })
    );

    start();

    expect(ChatTabList.instance.portraitHeight).toBe(320);
    expect(ChatTabList.instance.isPortraitInWindow).toBe(true);
    expect(ChatTabList.instance.simpleDispFlagTime).toBe(1);
    expect(ChatTabList.instance.simpleDispFlagUserId).toBe(1);
  });

  it('holds a stored portrait height to what the panel allows', () => {
    localStorage.setItem('chat-preferences', JSON.stringify({ display: { portraitHeight: 9999 } }));

    start();

    expect(ChatTabList.instance.portraitHeight).toBe(ChatTabList.instance.maxPortraitSize);
  });

  it('writes the stored flags back onto a tab that arrives later', async () => {
    localStorage.setItem(
      'chat-preferences',
      JSON.stringify({ tabs: { 'tab-late': { portraitDisplayFlag: 0, chatSimpleDispFlag: 1 } } })
    );
    start();

    const tab = new ChatTab('tab-late');
    tab.initialize();

    expect(tab.portraitDisplayFlag).toBe(0);
    expect(tab.chatSimpleDispFlag).toBe(1);
  });

  it('keeps what the tab list was set to after it changes', async () => {
    start();
    ChatTabList.instance.portraitHeight = 260;
    await Promise.resolve();

    expect(TestBed.inject(ChatPreferencesService).display()?.portraitHeight).toBe(260);
  });

  it('keeps what a tab was set to under that tab', async () => {
    start();
    const tab = makeTab('雑談');
    tab.chatSimpleDispFlag = 1;
    await Promise.resolve();

    expect(TestBed.inject(ChatPreferencesService).tabPreferencesOf(tab.identifier)?.chatSimpleDispFlag).toBe(1);
  });
});
