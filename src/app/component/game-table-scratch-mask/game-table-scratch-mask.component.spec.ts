import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

import { GameTableScratchMaskComponent } from './game-table-scratch-mask.component';

describe('GameTableScratchMaskComponent', () => {
  let component: GameTableScratchMaskComponent;
  let fixture: ComponentFixture<GameTableScratchMaskComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [GameTableScratchMaskComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GameTableScratchMaskComponent);
    component = fixture.componentInstance;
  });

  it('should be defined', () => {
    expect(component).toBeTruthy();
  });
});
