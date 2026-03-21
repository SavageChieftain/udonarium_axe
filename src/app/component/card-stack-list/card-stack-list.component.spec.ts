import { ComponentFixture, TestBed } from '@angular/core/testing';;

import { CardStackListComponent } from './card-stack-list.component';

describe('CardStackListComponent', () => {
  let component: CardStackListComponent;
  let fixture: ComponentFixture<CardStackListComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [CardStackListComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CardStackListComponent);
    component = fixture.componentInstance;
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
