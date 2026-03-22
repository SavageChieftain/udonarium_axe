import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from 'testing/test-providers';

import { GameCharacterSheetComponent } from './game-character-sheet.component';

describe('GameCharacterSheetComponent', () => {
  let component: GameCharacterSheetComponent;
  let fixture: ComponentFixture<GameCharacterSheetComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [GameCharacterSheetComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GameCharacterSheetComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
