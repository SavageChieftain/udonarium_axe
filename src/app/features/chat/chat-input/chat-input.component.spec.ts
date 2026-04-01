import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChatInputComponent } from '@axe/features/chat/chat-input/chat-input.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('ChatInputComponent', () => {
  let component: ChatInputComponent;
  let fixture: ComponentFixture<ChatInputComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [ChatInputComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ChatInputComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('signal-driven CD', () => {
    it('writingPeerNamesがsignalであること', () => {
      expect(typeof component.writingPeerNames).toBe('function');
      expect(component.writingPeerNames()).toEqual([]);
    });
  });
});
