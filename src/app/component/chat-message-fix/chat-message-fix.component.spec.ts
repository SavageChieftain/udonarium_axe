import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

import { ChatMessageFixComponent } from './chat-message-fix.component';

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

  it('should be defined', () => {
    expect(component).toBeTruthy();
  });
});
