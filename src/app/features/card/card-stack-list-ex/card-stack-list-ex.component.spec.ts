import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Card } from '@axe/domain/card/card';
import { CardStackListComponentEx } from '@axe/features/card/card-stack-list-ex/card-stack-list-ex.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('CardStackListComponentEx', () => {
  let component: CardStackListComponentEx;
  let fixture: ComponentFixture<CardStackListComponentEx>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [CardStackListComponentEx],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CardStackListComponentEx);
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
