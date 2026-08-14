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

  it('窓を開くまでは行き先を持たないこと', () => {
    expect(service.current()).toBeNull();
  });

  it('伝えられたタブを返すこと', () => {
    const tab = makeTab('雑談');
    service.set(tab.identifier);

    expect(service.current()).toBe(tab);
  });

  it('見ていたタブが消えたら行き先なしに戻ること', () => {
    // 別のタブで埋めると、消えた側に出していたつもりの発言が紛れる。
    const tab = makeTab('雑談');
    makeTab('メイン');
    service.set(tab.identifier);
    tab.destroy();

    expect(service.current()).toBeNull();
  });
});
