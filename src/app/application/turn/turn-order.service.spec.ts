import { TestBed } from '@angular/core/testing';
import { ChatMessageService } from '@axe/application/chat/chat-message.service';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { GameObjectInventoryService } from '@axe/application/inventory/game-object-inventory.service';
import { TurnOrderService } from '@axe/application/turn/turn-order.service';
import { GameCharacter } from '@axe/domain/character/game-character';
import { DataElement } from '@axe/domain/data/data-element';
import { TurnState } from '@axe/domain/tabletop/turn-state';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('TurnOrderService', () => {
  let service: TurnOrderService;
  let turnState: TurnState;
  let chars: GameCharacter[];
  let orderedSpy: ReturnType<typeof vi.spyOn>;
  let sendSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...TEST_PROVIDERS, { provide: TRANSLATE_FN, useValue: (key: string) => key }],
    });

    turnState = TestBed.inject(TurnState);
    turnState.currentIdentifier = '';
    turnState.round = 0;
    turnState.phase = 'idle';
    turnState.buffDecay = true;
    turnState.actedIdentifiers = [];
    turnState.history = '[]';

    chars = [new GameCharacter(), new GameCharacter(), new GameCharacter()];
    chars.forEach((c) => c.initialize());

    service = TestBed.inject(TurnOrderService);
    orderedSpy = vi.spyOn(service, 'orderedCharacters').mockReturnValue(chars);
    sendSpy = vi
      .spyOn(TestBed.inject(ChatMessageService), 'sendSystemMessageToMainTab')
      .mockReturnValue(undefined as never);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('orderedCharacters excludes inventory-hidden characters', () => {
    orderedSpy.mockRestore();
    const inventory = TestBed.inject(GameObjectInventoryService);
    const [visible, hidden] = [new GameCharacter(), new GameCharacter()];
    [visible, hidden].forEach((c) => c.initialize());
    hidden.hideInventory = true;
    vi.spyOn(inventory.tableInventory, 'tabletopObjects', 'get').mockReturnValue([visible, hidden]);
    expect(service.orderedCharacters()).toEqual([visible]);
  });

  it('next from idle begins round 1 without a character', () => {
    service.next();
    expect(turnState.round).toBe(1);
    expect(turnState.phase).toBe('roundStart');
    expect(turnState.currentIdentifier).toBe('');
    expect(sendSpy).toHaveBeenCalledTimes(1);
  });

  it('next walks round start, each character, round end, then the next round', () => {
    service.next(); // round 1 begins
    service.next(); // first character
    expect(turnState.phase).toBe('acting');
    expect(turnState.currentIdentifier).toBe(chars[0].identifier);
    service.next(); // second character
    expect(turnState.currentIdentifier).toBe(chars[1].identifier);
    service.next(); // last character
    expect(turnState.currentIdentifier).toBe(chars[2].identifier);
    service.next(); // round 1 ends
    expect(turnState.phase).toBe('roundEnd');
    expect(turnState.currentIdentifier).toBe('');
    expect(turnState.round).toBe(1);
    service.next(); // round 2 begins
    expect(turnState.phase).toBe('roundStart');
    expect(turnState.round).toBe(2);
  });

  it('setCurrent jumps straight to a character in the acting phase', () => {
    service.setCurrent(chars[1].identifier);
    expect(turnState.phase).toBe('acting');
    expect(turnState.currentIdentifier).toBe(chars[1].identifier);
    expect(turnState.round).toBe(1);
  });

  it('prev reverses the sequence back to idle', () => {
    service.next(); // round 1 begins
    service.next(); // first character
    service.prev(); // back to round start
    expect(turnState.phase).toBe('roundStart');
    expect(turnState.currentIdentifier).toBe('');
    service.prev(); // round 1 start -> idle
    expect(turnState.phase).toBe('idle');
    expect(turnState.round).toBe(0);
  });

  describe('buff decay', () => {
    let buffed: GameCharacter[];

    function buffsOf(character: GameCharacter): readonly DataElement[] {
      return character.buffDataElement?.children[0]?.children ?? [];
    }

    function advanceToRoundEnd(): void {
      service.next(); // round begins
      for (let i = 0; i <= buffed.length; i++) service.next();
    }

    beforeEach(() => {
      buffed = [GameCharacter.create('クリフトン', 1, ''), GameCharacter.create('アーサー', 1, '')];
      buffed.forEach((character) => {
        character.addExtendData();
        character.buffs.addRound('猛攻撃', '', 1);
      });
      orderedSpy.mockReturnValue(buffed);
    });

    it('counts buffs down at the end of a round and announces what expired', () => {
      buffed[0].buffs.addRound('加速', '', 3);
      sendSpy.mockClear();

      advanceToRoundEnd();

      expect(buffsOf(buffed[0]).map((buff: DataElement) => buff.name)).toEqual(['加速']);
      expect(buffsOf(buffed[0])[0].value).toBe(2);
      expect(buffsOf(buffed[1])).toHaveLength(0);
      const announced = sendSpy.mock.calls.map((call: unknown[]) => String(call[0]));
      expect(announced.some((text: string) => text.includes('feature.turnOrder.buffExpired'))).toBe(true);
    });

    it('leaves buffs alone while the toggle is off', () => {
      service.setBuffDecay(false);

      advanceToRoundEnd();

      expect(buffsOf(buffed[0])).toHaveLength(1);
      expect(buffsOf(buffed[0])[0].value).toBe(1);
    });

    it('does not count down when stepping backwards through a round', () => {
      service.next(); // round 1 begins
      service.next(); // first character
      service.prev(); // back to round start
      service.prev(); // round 1 start -> idle

      expect(buffsOf(buffed[0])[0].value).toBe(1);
    });

    it('puts back a buff that ran out in the step it undoes', () => {
      buffed[0].buffs.addRound('加速', '', 2);

      advanceToRoundEnd();
      expect(buffsOf(buffed[0]).map((buff: DataElement) => buff.name)).toEqual(['加速']);

      service.prev();

      expect(buffsOf(buffed[0]).map((buff: DataElement) => buff.name)).toEqual(['猛攻撃', '加速']);
      expect(buffsOf(buffed[0])[0].value).toBe(1);
      expect(buffsOf(buffed[0])[1].value).toBe(2);
      expect(buffsOf(buffed[1]).map((buff: DataElement) => buff.name)).toEqual(['猛攻撃']);
    });

    it("counts a buff down as its trigger's turn opens, and leaves the rest alone", () => {
      // A Sword World enhancement runs out as the caster comes round again, not with the round.
      const [caster, target] = buffed;
      target.buffs.addRound('練技', '', 1, { timing: 'turnStart', trigger: caster.identifier });
      sendSpy.mockClear();

      service.next(); // round 1 begins
      expect(buffsOf(target).map((buff: DataElement) => buff.name)).toContain('練技');

      service.next(); // the caster takes the first turn

      expect(buffsOf(target).map((buff: DataElement) => buff.name)).not.toContain('練技');
      expect(buffsOf(target).map((buff: DataElement) => buff.name)).toContain('猛攻撃');
    });

    it('waits for the bearer where the buff names no trigger', () => {
      const second = buffed[1];
      second.buffs.addRound('集中', '', 1, { timing: 'turnStart' });

      service.next(); // round 1 begins
      service.next(); // the first character acts
      expect(buffsOf(second).map((buff: DataElement) => buff.name)).toContain('集中');

      service.next(); // the bearer acts

      expect(buffsOf(second).map((buff: DataElement) => buff.name)).not.toContain('集中');
    });

    it('counts a turn-end buff down as its bearer finishes acting', () => {
      const [first] = buffed;
      first.buffs.addRound('残心', '', 1, { timing: 'turnEnd' });

      service.next(); // round 1 begins
      service.next(); // the bearer acts
      expect(buffsOf(first).map((buff: DataElement) => buff.name)).toContain('残心');

      service.next(); // the bearer's turn closes

      expect(buffsOf(first).map((buff: DataElement) => buff.name)).not.toContain('残心');
    });

    it('leaves a buff pinned to a turn out of the round-end sweep', () => {
      const [, target] = buffed;
      target.buffs.addRound('祝福', '', 1, { timing: 'turnStart', trigger: '居ない人' });
      sendSpy.mockClear();

      advanceToRoundEnd();

      expect(buffsOf(target).map((buff: DataElement) => buff.name)).toContain('祝福');
      expect(buffsOf(target)[0].value).toBe(1);
    });

    it('says nothing when no buff expired', () => {
      buffed.forEach((character) => character.buffs.delete('猛攻撃'));
      buffed[0].buffs.addRound('長い', '', 5);
      sendSpy.mockClear();

      advanceToRoundEnd();

      const announced = sendSpy.mock.calls.map((call: unknown[]) => String(call[0]));
      expect(announced.some((text: string) => text.includes('feature.turnOrder.buffExpired'))).toBe(false);
      expect(buffsOf(buffed[0])[0].value).toBe(4);
    });
  });

  describe('pieces that have acted', () => {
    it('marks whoever was up as having acted when the turn is handed on', () => {
      service.next(); // round 1 begins
      service.next(); // first character

      expect(service.isActed(chars[0].identifier)).toBe(false);
      service.next();
      expect(service.isActed(chars[0].identifier)).toBe(true);
    });

    it('hands the turn to the earliest piece that has not acted yet', () => {
      service.next(); // round 1 begins
      // The turn is forced onto the last of them, which is what clicking a piece does.
      service.setCurrent(chars[2].identifier);

      service.next();
      expect(service.isActed(chars[2].identifier)).toBe(true);
      expect(turnState.currentIdentifier).toBe(chars[0].identifier);

      // And it keeps going down the order rather than handing the turn back round again.
      service.next();
      expect(turnState.currentIdentifier).toBe(chars[1].identifier);
    });

    it('ends the round once everybody has acted', () => {
      service.next(); // round 1 begins
      service.setCurrent(chars[0].identifier);
      service.next(); // chars[1]
      service.next(); // chars[2]
      service.next(); // nobody left

      expect(turnState.phase).toBe('roundEnd');
    });

    it('clears what was acted when a round opens', () => {
      service.next(); // round 1 begins
      service.next(); // first character
      service.next(); // marks the first as acted

      service.advanceRound();

      expect(turnState.actedIdentifiers).toEqual([]);
    });
  });

  it('keeps a piece that takes no turn out of the order', () => {
    orderedSpy.mockRestore();
    const inventory = TestBed.inject(GameObjectInventoryService);
    const [acting, watching] = [new GameCharacter(), new GameCharacter()];
    [acting, watching].forEach((c) => c.initialize());
    watching.noTurn = true;
    vi.spyOn(inventory.tableInventory, 'tabletopObjects', 'get').mockReturnValue([acting, watching]);

    expect(service.orderedCharacters()).toEqual([acting]);
  });

  describe('advancing the round itself', () => {
    it('closes the round it is in and opens the next one', () => {
      service.next(); // round 1 begins
      service.next(); // first character

      service.advanceRound();

      expect(turnState.round).toBe(2);
      expect(turnState.phase).toBe('roundStart');
      expect(turnState.currentIdentifier).toBe('');
      const announced = sendSpy.mock.calls.map((call: unknown[]) => String(call[0]));
      expect(announced).toContain('feature.turnOrder.roundEnd');
      expect(announced).toContain('feature.turnOrder.roundStart');
    });

    it('takes the round back to where the one before it left off', () => {
      service.next(); // round 1 begins
      service.next(); // chars[0] is up
      service.advanceRound(); // round 2 begins

      service.retreatRound();

      expect(turnState.round).toBe(1);
      expect(turnState.currentIdentifier).toBe(chars[0].identifier);
    });

    it('opens the first round from idle without closing one that never began', () => {
      service.advanceRound();

      expect(turnState.round).toBe(1);
      expect(turnState.phase).toBe('roundStart');
      expect(sendSpy.mock.calls.map((call: unknown[]) => String(call[0]))).not.toContain('feature.turnOrder.roundEnd');
    });
  });

  describe('stepping the round back', () => {
    it('puts the acted list back as it was', () => {
      service.next(); // round 1 begins
      service.next(); // first character
      service.next(); // first character has acted

      service.prev();

      expect(turnState.actedIdentifiers).toEqual([]);
      expect(turnState.currentIdentifier).toBe(chars[0].identifier);
    });

    it('puts back the buffs a whole round took away', () => {
      const bearer = GameCharacter.create('ラウンド戻し', 1, '');
      bearer.addExtendData();
      bearer.buffs.addRound('祝福', '', 1);
      orderedSpy.mockReturnValue([bearer]);

      service.next(); // round 1 begins
      service.next(); // the bearer is up
      service.advanceRound(); // the round ends and 祝福 runs out

      expect(bearer.buffDataElement?.children[0]?.children ?? []).toHaveLength(0);

      service.retreatRound();

      const left = bearer.buffDataElement?.children[0]?.children ?? [];
      expect(left.map((buff) => buff.name)).toEqual(['祝福']);
      expect(left[0].value).toBe(1);
    });

    it('does nothing once there is nothing left to go back to', () => {
      service.prev();

      expect(turnState.phase).toBe('idle');
      expect(turnState.round).toBe(0);
    });
  });

  it('reset clears the state and announces it', () => {
    service.setCurrent(chars[1].identifier);
    sendSpy.mockClear();
    service.reset();
    expect(turnState.currentIdentifier).toBe('');
    expect(turnState.round).toBe(0);
    expect(turnState.phase).toBe('idle');
    expect(sendSpy).toHaveBeenCalledTimes(1);
  });
});
