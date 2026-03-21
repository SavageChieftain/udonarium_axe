import { ComponentFixture, TestBed } from '@angular/core/testing';;

import { GameTableComponent } from './game-table.component';

describe('GameTableComponent', () => {
  let component: GameTableComponent;
  let fixture: ComponentFixture<GameTableComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [GameTableComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GameTableComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
