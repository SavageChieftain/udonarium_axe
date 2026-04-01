import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChatMessageFixComponent } from '@axe/features/chat/chat-message-fix/chat-message-fix.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('ChatMessageFixComponent', () => {
  let component: ChatMessageFixComponent;
  let fixture: ComponentFixture<ChatMessageFixComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [ChatMessageFixComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ChatMessageFixComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
