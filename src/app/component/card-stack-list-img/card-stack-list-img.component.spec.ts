import { ComponentFixture, TestBed } from '@angular/core/testing';;

import { CardStackListImageComponent } from './card-stack-list-img.component';

describe('CardStackListImageComponent', () => {
  let component: CardStackListImageComponent;
  let fixture: ComponentFixture<CardStackListImageComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [CardStackListImageComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CardStackListImageComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
