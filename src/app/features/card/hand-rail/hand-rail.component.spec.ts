import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { SelectionSignalService } from '@axe/application/ui/selection-signal.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { Card, CardState } from '@axe/domain/card/card';
import { handLocationOf } from '@axe/domain/card/hand-location';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { PeerRole } from '@axe/domain/peer/peer-role';
import { HandRailComponent } from '@axe/features/card/hand-rail/hand-rail.component';
import { HandRailService } from '@axe/features/card/hand-rail/hand-rail.service';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('HandRailComponent', () => {
  let component: HandRailComponent;
  let fixture: ComponentFixture<HandRailComponent>;
  let store: ObjectStore;

  function makeCard(locationName: string): Card {
    const card = Card.create('カード', 'front.png', 'back.png');
    card.location.name = locationName;
    return card;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HandRailComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
    fixture = TestBed.createComponent(HandRailComponent);
    component = fixture.componentInstance;
    store = ObjectStore.instance;
    PeerCursor.createMyCursor();
    PeerCursor.myCursor.userId = 'me';
    PeerCursor.myCursor.role = PeerRole.Player;
  });

  afterEach(() => {
    store.getObjects().forEach((object) => store.delete(object, false));
    store.clearDeleteHistory();
    PeerCursor.myCursor = null!;
  });

  it('自分の手札に置かれたカードだけを並べる', () => {
    const mine = makeCard(handLocationOf('me'));
    makeCard(handLocationOf('other'));
    makeCard('table');

    expect(component.cards()).toEqual([mine]);
  });

  it('所有権だけ持つ卓上のカードは手札に出さない', () => {
    const peeked = makeCard('table');
    peeked.owner = 'me';

    expect(component.cards()).toEqual([]);
  });

  it('開いていて卓を編集できる役割のときだけレールを描画する', async () => {
    const rail = TestBed.inject(HandRailService);

    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.hand-rail')).toBeNull();

    rail.open();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.hand-rail')).not.toBeNull();

    PeerCursor.myCursor.role = PeerRole.GameMaster;
    TestBed.inject(ObjectChangeService).notifyChanged(PeerCursor.myCursor.identifier);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.hand-rail')).not.toBeNull();

    PeerCursor.myCursor.role = PeerRole.Guest;
    TestBed.inject(ObjectChangeService).notifyChanged(PeerCursor.myCursor.identifier);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.hand-rail')).toBeNull();
  });

  it('表向きで場に出すと卓上へ戻り手札から外れる', () => {
    const card = makeCard(handLocationOf('me'));

    (component as unknown as { playFaceUp: (c: Card) => void }).playFaceUp(card);

    expect(card.location.name).toBe('table');
    expect(card.state).toBe(CardState.FRONT);
    expect(component.cards()).toEqual([]);
  });

  it('裏向きで場に出すと伏せた状態で卓上へ戻る', () => {
    const card = makeCard(handLocationOf('me'));

    (component as unknown as { playFaceDown: (c: Card) => void }).playFaceDown(card);

    expect(card.location.name).toBe('table');
    expect(card.state).toBe(CardState.BACK);
    expect(card.owner).toBe('');
  });

  it('場に出したカードへ視点を移す', () => {
    const card = makeCard(handLocationOf('me'));
    card.location.x = 120;
    card.location.y = 80;
    const selection = TestBed.inject(SelectionSignalService);

    (component as unknown as { playFaceUp: (c: Card) => void }).playFaceUp(card);

    expect(selection.focusCoordinate()).toEqual(expect.objectContaining({ x: 120, y: 80 }));
  });
});
