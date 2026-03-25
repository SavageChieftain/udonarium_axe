import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CardStack } from '@axe/domain/card/card-stack';
import { ObjectChangeService } from '@axe/shared/object-change.service';
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

  describe('signal-driven CD', () => {
    it('animeStateがsignalであること', () => {
      expect(typeof component.animeState).toBe('function');
      expect(component.animeState()).toBe('inactive');
    });

    it('nameゲッターがnetworkVersionを参照していること', () => {
      const cardStack = CardStack.create('テストスタック');
      component.cardStack = cardStack;
      const objectChangeService = TestBed.inject(ObjectChangeService);
      const original = objectChangeService.networkVersion;
      const spy = vi.fn(() => original());
      Object.defineProperty(objectChangeService, 'networkVersion', { value: spy, configurable: true });
      void component.name;
      expect(spy).toHaveBeenCalled();
    });
  });
});
