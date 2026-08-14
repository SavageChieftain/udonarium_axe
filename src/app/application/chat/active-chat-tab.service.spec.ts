import { TestBed } from '@angular/core/testing';
import { ActiveChatTabService } from '@axe/application/chat/active-chat-tab.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { ChatTab } from '@axe/domain/chat/chat-tab';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('ActiveChatTabService', () => {
  let service: ActiveChatTabService;

  function makeTab(name: string): ChatTab {
    const tab = new ChatTab();
    tab.name = name;
    tab.initialize();
    return tab;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...TEST_PROVIDERS] });
    service = TestBed.inject(ActiveChatTabService);
  });

  afterEach(() => {
    for (const object of ObjectStore.instance.getObjects()) ObjectStore.instance.remove(object);
    ObjectStore.instance.clearDeleteHistory();
  });

  it('has nowhere to report until a window is open', () => {
    expect(service.current()).toBeNull();
  });

  it('returns the tab it was told about', () => {
    const tab = makeTab('雑談');
    service.set(tab.identifier);

    expect(service.current()).toBe(tab);
  });

  it('goes back to having nowhere to report when that tab is gone', () => {
    // Substituting another tab would scatter lines meant for the one that vanished.
    const tab = makeTab('雑談');
    makeTab('メイン');
    service.set(tab.identifier);
    tab.destroy();

    expect(service.current()).toBeNull();
  });
});
