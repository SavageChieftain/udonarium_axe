import { inject, TestBed } from '@angular/core/testing';
import { ChatMessageService } from '@axe/application/chat/chat-message.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { ChatTab } from '@axe/domain/chat/chat-tab';
import { ChatTabList } from '@axe/domain/chat/chat-tab-list';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('ChatMessageService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...TEST_PROVIDERS, ChatMessageService],
    });
  });

  it('should ...', inject([ChatMessageService], (service: ChatMessageService) => {
    expect(service).toBeTruthy();
  }));

  it('sendSystemMessageToMainTab routes to the first chat tab', inject(
    [ChatMessageService],
    (service: ChatMessageService) => {
      const mainTab = {} as ChatTab;
      const chatTabList = { chatTabs: [mainTab, {} as ChatTab] } as unknown as ChatTabList;
      vi.spyOn(TestBed.inject(ObjectStore), 'get').mockReturnValue(chatTabList as never);
      const toTabSpy = vi.spyOn(service, 'sendSystemMessageToTab').mockReturnValue(undefined as never);

      service.sendSystemMessageToMainTab('hello');

      expect(toTabSpy).toHaveBeenCalledWith(mainTab, 'hello', undefined);
    }
  ));
});
