import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

import { ChatPaletteComponent } from './chat-palette.component';

describe('ChatPaletteComponent', () => {
  let component: ChatPaletteComponent;
  let fixture: ComponentFixture<ChatPaletteComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [ChatPaletteComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ChatPaletteComponent);
    component = fixture.componentInstance;
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
