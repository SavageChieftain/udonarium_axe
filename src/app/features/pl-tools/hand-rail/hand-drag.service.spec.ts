import { TestBed } from '@angular/core/testing';
import { ObjectStore } from '@axe/core/sync/object-store';
import { Card } from '@axe/domain/card/card';
import { HandDragService } from '@axe/features/pl-tools/hand-rail/hand-drag.service';
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

  it('初期状態では何もドラッグしていない', () => {
    expect(service.card()).toBeNull();
    expect(service.tableCard()).toBeNull();
  });

  it('手札からのドラッグを開始し、座標を追い、終了で解除する', () => {
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

  it('卓上からのドラッグ中だけ手札レールを受け入れ状態にする', () => {
    service.armTableDrag(card);
    expect(service.tableCard()).toBe(card);

    service.disarmTableDrag();
    expect(service.tableCard()).toBeNull();
  });
});
