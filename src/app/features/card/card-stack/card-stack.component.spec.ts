import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

import { CardStackComponent } from './card-stack.component';

describe('CardStackComponent', () => {
  let component: CardStackComponent;
  let fixture: ComponentFixture<CardStackComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [CardStackComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CardStackComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
