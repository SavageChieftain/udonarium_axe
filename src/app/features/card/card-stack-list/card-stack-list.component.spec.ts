import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Card } from '@axe/domain/card/card';
import { CardStackListComponent } from '@axe/features/card/card-stack-list/card-stack-list.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('CardStackListComponent', () => {
  let component: CardStackListComponent;
  let fixture: ComponentFixture<CardStackListComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [CardStackListComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CardStackListComponent);
    component = fixture.componentInstance;
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  describe('cardStackがnullの場合', () => {
    it('cardStackがnullでもdetectChangesでクラッシュしないこと', () => {
      component.cardStack = null;
      expect(() => fixture.detectChanges()).not.toThrow();
    });

    it('drawCardが何もせずreturnすること', () => {
      component.cardStack = null;
      const mockCard = {} as unknown as Card;
      expect(() => component.drawCard(mockCard)).not.toThrow();
    });
  });
});
