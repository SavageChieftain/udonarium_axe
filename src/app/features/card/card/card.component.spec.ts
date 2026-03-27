import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Card } from '@axe/domain/card/card';
import { ObjectChangeService } from '@axe/shared/sync/object-change.service';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

import { CardComponent } from './card.component';

describe('CardComponent', () => {
  let component: CardComponent;
  let fixture: ComponentFixture<CardComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [CardComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('signal-driven CD', () => {
    it('nameゲッターがnetworkVersionを参照していること', () => {
      const card = Card.create('テストカード', 'front', 'back');
      fixture.componentRef.setInput('card', card);
      const objectChangeService = TestBed.inject(ObjectChangeService);
      const original = objectChangeService.networkVersion;
      const spy = vi.fn(() => original());
      Object.defineProperty(objectChangeService, 'networkVersion', { value: spy, configurable: true });
      void component.name;
      expect(spy).toHaveBeenCalled();
    });

    it('isIconHiddenがsignalであること', () => {
      expect(typeof component.isIconHidden).toBe('function');
      expect(component.isIconHidden()).toBe(false);
    });
  });
});
