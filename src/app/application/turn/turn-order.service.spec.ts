import { TestBed } from '@angular/core/testing';
import { ChatMessageService } from '@axe/application/chat/chat-message.service';
import { GameObjectInventoryService } from '@axe/application/inventory/game-object-inventory.service';
import { TurnOrderService } from '@axe/application/turn/turn-order.service';
import { GameCharacter } from '@axe/domain/character/game-character';
import { TurnState } from '@axe/domain/tabletop/turn-state';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('TurnOrderService', () => {
  let service: TurnOrderService;
  let turnState: TurnState;
  let chars: GameCharacter[];
  let orderedSpy: ReturnType<typeof vi.spyOn>;
  let sendSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...TEST_PROVIDERS] });

    turnState = TestBed.inject(TurnState);
    turnState.currentIdentifier = '';
    turnState.round = 0;
    turnState.phase = 'idle';

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
