import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SelectionSignalService } from '@axe/application/ui/selection-signal.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { Card, CardState } from '@axe/domain/card/card';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { HandCardListPanelComponent } from '@axe/features/pl-tools/hand-card-list/hand-card-list-panel.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('HandCardListPanelComponent', () => {
  let component: HandCardListPanelComponent;
  let fixture: ComponentFixture<HandCardListPanelComponent>;
  let store: ObjectStore;

  function makeCard(owner: string, locationName: string): Card {
    const card = Card.create('カード', 'front.png', 'back.png');
    card.owner = owner;
    card.location.name = locationName;
    return card;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HandCardListPanelComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
    fixture = TestBed.createComponent(HandCardListPanelComponent);
    component = fixture.componentInstance;
    store = ObjectStore.instance;
    PeerCursor.createMyCursor();
    PeerCursor.myCursor.userId = 'me';
  });

  afterEach(() => {
    store.getObjects().forEach((object) => store.delete(object, false));
    store.clearDeleteHistory();
    PeerCursor.myCursor = null!;
  });

  it('自分が所有するカードだけを手札として並べる', () => {
    const mine = makeCard('me', 'table');
    makeCard('other', 'table');
    makeCard('me', 'graveyard');

    expect(component.cards()).toEqual([mine]);
  });

  it('faceUp で表になり所有権が外れる', () => {
    const card = makeCard('me', 'table');

    (component as unknown as { faceUp: (c: Card) => void }).faceUp(card);

    expect(card.state).toBe(CardState.FRONT);
    expect(card.owner).toBe('');
  });

  it('faceDown で伏せて所有権が外れる', () => {
    const card = makeCard('me', 'table');

    (component as unknown as { faceDown: (c: Card) => void }).faceDown(card);

    expect(card.state).toBe(CardState.BACK);
    expect(card.owner).toBe('');
  });

  it('テーブル上のカードだけ視点を移せる', () => {
    const onTable = makeCard('me', 'table');
    const offTable = makeCard('me', 'common');
    const selection = TestBed.inject(SelectionSignalService);
    onTable.location.x = 120;
    onTable.location.y = 80;
    const actions = component as unknown as {
      canFocus: (c: Card) => boolean;
      focusToCard: (c: Card) => void;
    };

    expect(actions.canFocus(onTable)).toBe(true);
    expect(actions.canFocus(offTable)).toBe(false);

    actions.focusToCard(onTable);
    expect(selection.focusCoordinate()).toEqual(expect.objectContaining({ x: 120, y: 80 }));
  });
});
