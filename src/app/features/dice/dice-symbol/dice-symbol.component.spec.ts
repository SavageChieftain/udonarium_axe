import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

import { DiceSymbolComponent } from './dice-symbol.component';

describe('DiceSymbolComponent', () => {
  let component: DiceSymbolComponent;
  let fixture: ComponentFixture<DiceSymbolComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [DiceSymbolComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DiceSymbolComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
