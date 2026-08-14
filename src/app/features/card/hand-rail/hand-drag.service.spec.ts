import { TestBed } from '@angular/core/testing';
import { ObjectStore } from '@axe/core/sync/object-store';
import { Card } from '@axe/domain/card/card';
import { HandDragService } from '@axe/features/card/hand-rail/hand-drag.service';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('HandDragService', () => {
  let service: HandDragService;
  let card: Card;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HandDragService);
    card = Card.create('カード', 'front.png', 'back.png');
  });

  afterEach(() => {
    const store = ObjectStore.instance;
    store.getObjects().forEach((object) => store.delete(object, false));
    store.clearDeleteHistory();
  });

  it('starts with nothing being dragged', () => {
    expect(service.card()).toBeNull();
    expect(service.tableCard()).toBeNull();
  });

  it('starts a drag from the hand, follows it and lets go at the end', () => {
    service.begin(card, 10, 20);
    expect(service.card()).toBe(card);
    expect(service.x()).toBe(10);
    expect(service.y()).toBe(20);

    service.move(30, 40);
    expect(service.x()).toBe(30);
    expect(service.y()).toBe(40);

    service.end();
    expect(service.card()).toBeNull();
  });

  it('opens the rail to a card only while one is dragged off the table', () => {
    service.armTableDrag(card);
    expect(service.tableCard()).toBe(card);

    service.disarmTableDrag();
    expect(service.tableCard()).toBeNull();
  });
});
