import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChatPortraitComponent } from '@axe/features/chat/chat-portrait/chat-portrait.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('ChatPortraitComponent', () => {
  let component: ChatPortraitComponent;
  let fixture: ComponentFixture<ChatPortraitComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [ChatPortraitComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ChatPortraitComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
