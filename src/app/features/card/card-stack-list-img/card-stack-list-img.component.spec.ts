import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CardStackListImageComponent } from '@axe/features/card/card-stack-list-img/card-stack-list-img.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('CardStackListImageComponent', () => {
  let component: CardStackListImageComponent;
  let fixture: ComponentFixture<CardStackListImageComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [CardStackListImageComponent],
      providers: [...TEST_PROVIDERS],
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
