import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GameCharacterBuffViewComponent } from './game-character-buff-view.component';

describe('GameCharacterBuffViewComponent', () => {
  let component: GameCharacterBuffViewComponent;
  let fixture: ComponentFixture<GameCharacterBuffViewComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [GameCharacterBuffViewComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GameCharacterBuffViewComponent);
    component = fixture.componentInstance;
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
