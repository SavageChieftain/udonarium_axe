import { inject, TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

import { ChatMessageService } from './chat-message.service';

describe('ChatMessageService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...TEST_PROVIDERS, ChatMessageService],
    });
  });

  it('should ...', inject([ChatMessageService], (service: ChatMessageService) => {
    expect(service).toBeTruthy();
  }));
});
