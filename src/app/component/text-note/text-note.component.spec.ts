import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

import { TextNoteComponent } from './text-note.component';

describe('TextNoteComponent', () => {
  let component: TextNoteComponent;
  let fixture: ComponentFixture<TextNoteComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [TextNoteComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TextNoteComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
