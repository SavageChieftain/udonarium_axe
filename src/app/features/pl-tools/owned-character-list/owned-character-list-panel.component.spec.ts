import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PanelService } from '@axe/application/ui/panel.service';
import { SelectionSignalService } from '@axe/application/ui/selection-signal.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { OwnedCharacterListPanelComponent } from '@axe/features/pl-tools/owned-character-list/owned-character-list-panel.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('OwnedCharacterListPanelComponent', () => {
  let component: OwnedCharacterListPanelComponent;
  let fixture: ComponentFixture<OwnedCharacterListPanelComponent>;
  let panelStub: { open: ReturnType<typeof vi.fn>; openLazy: ReturnType<typeof vi.fn> };
  let store: ObjectStore;

  function makeCharacter(name: string, owner: string, locationName: string): GameCharacter {
    const character = GameCharacter.create(name, 1, '');
    character.owner = owner;
    character.location.name = locationName;
    return character;
  }

  beforeEach(async () => {
    panelStub = { open: vi.fn(), openLazy: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [OwnedCharacterListPanelComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
    TestBed.overrideProvider(PanelService, { useValue: panelStub });
    fixture = TestBed.createComponent(OwnedCharacterListPanelComponent);
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

  it('自分が所有するキャラだけを並べる', () => {
    const mine = makeCharacter('自分のPC', 'me', 'table');
    makeCharacter('他人のPC', 'other', 'table');
    makeCharacter('墓場のPC', 'me', 'graveyard');

    expect(component.characters()).toEqual([mine]);
  });

  it('テーブル上のキャラだけカメラを寄せられる', () => {
    const onTable = makeCharacter('卓上', 'me', 'table');
    const offTable = makeCharacter('手元', 'me', 'common');
    const protectedComponent = component as unknown as { canFocus: (c: GameCharacter) => boolean };

    expect(protectedComponent.canFocus(onTable)).toBe(true);
    expect(protectedComponent.canFocus(offTable)).toBe(false);
  });

  it('focusToKoma でコマの座標へ視点を移す', () => {
    const character = makeCharacter('卓上', 'me', 'table');
    character.location.x = 320;
    character.location.y = 240;
    const selection = TestBed.inject(SelectionSignalService);

    (component as unknown as { focusToKoma: (c: GameCharacter) => void }).focusToKoma(character);

    expect(selection.focusCoordinate()).toEqual(expect.objectContaining({ x: 320, y: 240 }));
  });

  it('テーブル外のキャラでは視点を動かさない', () => {
    const character = makeCharacter('手元', 'me', 'common');
    const selection = TestBed.inject(SelectionSignalService);
    const before = selection.focusCoordinate();

    (component as unknown as { focusToKoma: (c: GameCharacter) => void }).focusToKoma(character);

    expect(selection.focusCoordinate()).toBe(before);
  });

  it('openChatPalette / openSheet でパネルを開く', () => {
    const character = makeCharacter('自分のPC', 'me', 'table');
    const actions = component as unknown as {
      openChatPalette: (c: GameCharacter) => void;
      openSheet: (c: GameCharacter) => void;
    };

    actions.openChatPalette(character);
    actions.openSheet(character);

    expect(panelStub.openLazy).toHaveBeenCalledTimes(2);
    expect(panelStub.openLazy.mock.calls[0][1]).toEqual(expect.objectContaining({ width: 760, height: 500 }));
    expect(panelStub.openLazy.mock.calls[1][1]).toEqual(expect.objectContaining({ width: 800, height: 600 }));
  });
});
