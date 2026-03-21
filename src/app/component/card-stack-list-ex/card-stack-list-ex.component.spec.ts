import { ComponentFixture, TestBed } from '@angular/core/testing';;

import { CardStackListComponentEx } from './card-stack-list-ex.component';

describe('CardStackListComponentEx', () => {
  let component: CardStackListComponentEx;
  let fixture: ComponentFixture<CardStackListComponentEx>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [CardStackListComponentEx],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CardStackListComponentEx);
    component = fixture.componentInstance;
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
