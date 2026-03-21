import { ComponentFixture, TestBed } from '@angular/core/testing';;

import { GameDataElementBuffComponent } from './game-data-element-buff.component';

describe('GameDataElementBuffComponent', () => {
  let component: GameDataElementBuffComponent;
  let fixture: ComponentFixture<GameDataElementBuffComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [GameDataElementBuffComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GameDataElementBuffComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
