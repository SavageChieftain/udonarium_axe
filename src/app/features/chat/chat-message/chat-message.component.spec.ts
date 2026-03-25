import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChatMessage } from '@axe/domain/chat/chat-message';
import { ObjectChangeService } from '@axe/shared/object-change.service';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

import { ChatMessageComponent } from './chat-message.component';

describe('ChatMessageComponent', () => {
  let component: ChatMessageComponent;
  let fixture: ComponentFixture<ChatMessageComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [ChatMessageComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ChatMessageComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('escapeHtmlAndRuby', () => {
    it('versionOfシグナルを読み取ること', () => {
      const objectChange = TestBed.inject(ObjectChangeService);
      const spy = vi.spyOn(objectChange, 'versionOf');
      const mockMessage = { identifier: 'test-msg-id' } as ChatMessage;
      component.chatMessage = mockMessage;

      component.escapeHtmlAndRuby('テスト');

      expect(spy).toHaveBeenCalledWith('test-msg-id');
    });

    it('chatMessageがundefinedでもエラーにならないこと', () => {
      component.chatMessage = undefined as unknown as ChatMessage;
      expect(() => component.escapeHtmlAndRuby('テスト')).not.toThrow();
    });
  });
});
