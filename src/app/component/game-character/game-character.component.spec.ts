import { ComponentFixture, TestBed } from '@angular/core/testing';;

import { GameCharacterComponent } from './game-character.component';

describe('GameCharacterComponent', () => {
  let component: GameCharacterComponent;
  let fixture: ComponentFixture<GameCharacterComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [GameCharacterComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GameCharacterComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
