import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Card } from '@axe/class/card';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

import { CardStackListComponentEx } from './card-stack-list-ex.component';

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
