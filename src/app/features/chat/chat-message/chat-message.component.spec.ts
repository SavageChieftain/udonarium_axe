import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChatMessage } from '@axe/domain/chat/chat-message';
import { ChatMessageComponent } from '@axe/features/chat/chat-message/chat-message.component';
import { ObjectChangeService } from '@axe/shared/sync/object-change.service';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

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
      fixture.componentRef.setInput('chatMessage', mockMessage);

      component.escapeHtmlAndRuby('テスト');

      expect(spy).toHaveBeenCalledWith('test-msg-id');
    });

    it('chatMessageがundefinedでもエラーにならないこと', () => {
      fixture.componentRef.setInput('chatMessage', undefined as unknown as ChatMessage);
      expect(() => component.escapeHtmlAndRuby('テスト')).not.toThrow();
    });
  });
});
