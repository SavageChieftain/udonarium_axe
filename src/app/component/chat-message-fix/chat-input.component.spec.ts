import { ComponentFixture, TestBed } from '@angular/core/testing';;

import { ChatMessageFixComponent } from './chat-message-fix.component';

describe('ChatMessageFixComponent', () => {
  let component: ChatMessageFixComponent;
  let fixture: ComponentFixture<ChatMessageFixComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [ChatMessageFixComponent],
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
