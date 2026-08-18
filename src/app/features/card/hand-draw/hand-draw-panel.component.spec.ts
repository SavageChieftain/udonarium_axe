import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChatMessageService } from '@axe/application/chat/chat-message.service';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { Card } from '@axe/domain/card/card';
import { handLocationOf } from '@axe/domain/card/hand-location';
import { ChatMessage } from '@axe/domain/chat/chat-message';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { PeerRole } from '@axe/domain/peer/peer-role';
import { HandDrawPanelComponent } from '@axe/features/card/hand-draw/hand-draw-panel.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('HandDrawPanelComponent', () => {
  let fixture: ComponentFixture<HandDrawPanelComponent>;
  let component: HandDrawPanelComponent;
  const created: { destroy(): void }[] = [];

  function card(code: string, userId: string): Card {
    const object = Card.create('カード', `./assets/images/trump/${code}.webp`, './assets/images/trump/z01.webp');
    object.toHand(userId);
    created.push(object);
    return object;
  }

  function peer(userId: string, name: string, role = PeerRole.Player): PeerCursor {
    const cursor = new PeerCursor();
    cursor.userId = userId;
    cursor.peerId = `peer-${userId}`;
    cursor.name = name;
    cursor.role = role;
    cursor.initialize();
    created.push(cursor);
    return cursor;
  }

  beforeEach(() => {
    PeerCursor.createMyCursor();
    PeerCursor.myCursor.userId = 'me';
    PeerCursor.myCursor.name = 'わたし';
    PeerCursor.myCursor.role = PeerRole.Player;
    TestBed.configureTestingModule({ imports: [HandDrawPanelComponent], providers: [...TEST_PROVIDERS] });
    vi.spyOn(TestBed.inject(ChatMessageService), 'sendSystemMessage').mockReturnValue(null as unknown as ChatMessage);
    fixture = TestBed.createComponent(HandDrawPanelComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture?.destroy();
    vi.restoreAllMocks();
    for (const object of created.splice(0)) object.destroy();
    for (const cursor of ObjectStore.instance.getObjects<PeerCursor>(PeerCursor)) {
      if (cursor !== PeerCursor.myCursor) ObjectStore.instance.delete(cursor, false);
    }
  });

  it('offers only the other players who hold a hand', () => {
    peer('other', 'あいて');
    peer('empty', 'てふだなし');
    card('s01', 'other');
    card('h05', 'me');
    fixture.detectChanges();

    expect(component.targets().map((target) => target.userId)).toEqual(['other']);
    expect(component.targets()[0].count).toBe(1);
  });

  it('lays their hand out face down once one is chosen', () => {
    peer('other', 'あいて');
    card('s01', 'other');
    card('s02', 'other');
    fixture.detectChanges();

    component.select('other');
    fixture.detectChanges();

    expect(component.cards()).toHaveLength(2);
    expect(fixture.nativeElement.querySelectorAll('img')).toHaveLength(2);
  });

  it('takes a chosen card into your own hand and out of theirs', () => {
    peer('other', 'あいて');
    const drawn = card('s01', 'other');
    card('s02', 'other');
    fixture.detectChanges();
    component.select('other');
    fixture.detectChanges();

    component.draw(component.cards()[0]);
    TestBed.inject(ObjectChangeService).notifyChanged(drawn.identifier);
    fixture.detectChanges();

    expect(drawn.location.name).toBe(handLocationOf('me'));
    expect(component.cards()).toHaveLength(1);
  });

  it('lets them go once their hand is empty', () => {
    peer('other', 'あいて');
    card('s01', 'other');
    fixture.detectChanges();
    component.select('other');
    fixture.detectChanges();

    const drawn = component.cards()[0];
    component.draw(drawn);
    TestBed.inject(ObjectChangeService).notifyChanged(drawn.identifier);
    fixture.detectChanges();

    expect(component.selected()).toBeNull();
  });
});
