import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

import { ChatTachieComponent } from './chat-tachie.component';

describe('ChatTachieComponent', () => {
  let component: ChatTachieComponent;
  let fixture: ComponentFixture<ChatTachieComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [ChatTachieComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ChatTachieComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
