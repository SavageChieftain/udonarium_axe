import { TestBed } from '@angular/core/testing';
import { ActiveChatTabService } from '@axe/application/chat/active-chat-tab.service';
import { ChatMessageService } from '@axe/application/chat/chat-message.service';
import { DiceRollService } from '@axe/application/dice/dice-roll.service';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { ChatMessage } from '@axe/domain/chat/chat-message';
import { ChatTab } from '@axe/domain/chat/chat-tab';
import { DiceSymbol, DiceType } from '@axe/domain/dice/dice-symbol';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('DiceRollService', () => {
  let service: DiceRollService;
  let sendSystemMessage: ReturnType<typeof vi.fn>;
  const created: { destroy(): void }[] = [];

  function makeDice(name: string, type = DiceType.D6): DiceSymbol {
    const dice = DiceSymbol.create(name, type, 1);
    dice.location.name = 'table';
    created.push(dice);
    return dice;
  }

  beforeEach(() => {
    PeerCursor.createMyCursor();
    PeerCursor.myCursor.userId = 'me';
    PeerCursor.myCursor.name = 'わたし';
    TestBed.configureTestingModule({ providers: [...TEST_PROVIDERS] });
    service = TestBed.inject(DiceRollService);
    sendSystemMessage = vi
      .spyOn(TestBed.inject(ChatMessageService), 'sendSystemMessage')
      .mockReturnValue(null as unknown as ChatMessage) as unknown as ReturnType<typeof vi.fn>;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    for (const object of created.splice(0)) object.destroy();
    for (const cursor of ObjectStore.instance.getObjects<PeerCursor>(PeerCursor)) cursor.destroy();
  });

  it('leaves the result on the die', () => {
    const dice = makeDice('ダイスA');

    const [rolled] = service.roll([dice]);

    expect(dice.faces).toContain(rolled.face);
    expect(dice.face).toBe(rolled.face);
  });

  it('says what one die showed', () => {
    const dice = makeDice('ダイスA');

    service.roll([dice]);

    expect(sendSystemMessage).toHaveBeenCalledOnce();
    const text = sendSystemMessage.mock.calls[0][0] as string;
    expect(text).toContain('わたし');
    expect(text).toContain('ダイスA');
    expect(text).toContain(dice.face);
  });

  it('gathers a handful into one line', () => {
    const dice = [makeDice('A'), makeDice('B'), makeDice('C', DiceType.D20)];

    const rolled = service.roll(dice);

    expect(rolled).toHaveLength(3);
    expect(sendSystemMessage).toHaveBeenCalledOnce();
    const text = sendSystemMessage.mock.calls[0][0] as string;
    for (const die of dice) expect(text).toContain(die.face);
  });

  it('adds the faces up in that line', () => {
    const dice = [makeDice('A'), makeDice('B')];

    const rolled = service.roll(dice);

    const total = rolled.reduce((sum, die) => sum + Number(die.face), 0);
    expect(sendSystemMessage.mock.calls[0][0] as string).toContain(String(total));
  });

  it('throws nothing it cannot see', () => {
    // Somebody else's hidden die keeps its face, and says nothing.
    const mine = makeDice('わたしの');
    const theirs = makeDice('ひとの');
    theirs.owner = 'somebody-else';
    const before = theirs.face;

    const rolled = service.roll([mine, theirs]);

    expect(rolled).toHaveLength(1);
    expect(theirs.face).toBe(before);
  });

  it('says nothing when there is nothing to throw', () => {
    const theirs = makeDice('ひとの');
    theirs.owner = 'somebody-else';

    expect(service.roll([theirs])).toEqual([]);
    expect(sendSystemMessage).not.toHaveBeenCalled();
  });

  describe('where the result goes', () => {
    it('reports into the tab being read', () => {
      // A die on the table is a die like any other, and its result is of no use in a tab nobody is reading.
      const tab = new ChatTab();
      tab.name = '雑談';
      tab.initialize();
      created.push(tab);
      TestBed.inject(ActiveChatTabService).set(tab.identifier);
      const toTab = vi
        .spyOn(TestBed.inject(ChatMessageService), 'sendSystemMessageToTab')
        .mockReturnValue(null as unknown as ChatMessage);

      service.roll([makeDice('ダイスA')]);

      expect(toTab).toHaveBeenCalledOnce();
      expect(toTab.mock.calls[0][0]).toBe(tab);
      expect(sendSystemMessage).not.toHaveBeenCalled();
    });

    it('falls back to the old destination with no window open', () => {
      service.roll([makeDice('ダイスA')]);

      expect(sendSystemMessage).toHaveBeenCalledOnce();
    });

    it('signs the result with whoever threw it', () => {
      const tab = new ChatTab();
      tab.initialize();
      created.push(tab);
      TestBed.inject(ActiveChatTabService).set(tab.identifier);
      const toTab = vi
        .spyOn(TestBed.inject(ChatMessageService), 'sendSystemMessageToTab')
        .mockReturnValue(null as unknown as ChatMessage);

      service.roll([makeDice('ダイスA')]);

      expect(toTab.mock.calls[0][3]).toBe('me');
    });
  });

  it('starts the die rolling on the screen of whoever threw it', () => {
    // A network send does not come back, so the one who threw it would otherwise see nothing.
    const rolled: string[] = [];
    TestBed.inject(ObjectChangeService).rollDiceSymbol$.subscribe((event) => rolled.push(event.identifier));
    const dice = makeDice('ダイスA');

    service.roll([dice]);

    expect(rolled).toEqual([dice.identifier]);
  });
});
