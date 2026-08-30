import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import {
  addBuffRound,
  decreaseBuffRound,
  deleteZeroRoundBuffs,
} from '@axe/features/controller/remote-controller/remote-controller-buff';

describe('the buffs a remote controller works on', () => {
  let store: ObjectStore;

  function character(name: string): GameCharacter {
    const held = GameCharacter.create(name, 1, '');
    held.addExtendData();
    return held;
  }

  beforeEach(() => {
    store = ObjectStore.instance;
  });

  afterEach(() => {
    store.getObjects().forEach((object) => store.delete(object, false));
    store.clearDeleteHistory();
  });

  it('steps every buff down a round and names who it touched', () => {
    const first = character('相手A');
    const second = character('相手B');
    addBuffRound([first, second], '毒', '継続', 3);

    const targets = decreaseBuffRound([first, second]);

    expect(targets).toBe('[相手A][相手B]');
    expect(Number(first.buffs.find('毒')?.value)).toBe(2);
    expect(Number(second.buffs.find('毒')?.value)).toBe(2);
  });

  it('clears the buffs that have run out and names who it touched', () => {
    const held = character('相手');
    addBuffRound([held], '毒', '継続', 1);
    decreaseBuffRound([held]);

    const targets = deleteZeroRoundBuffs([held]);

    expect(targets).toBe('[相手]');
    expect(held.buffs.find('毒')).toBeNull();
  });

  it('names nobody when it was given nobody, so the panel says nothing', () => {
    expect(decreaseBuffRound([])).toBe('');
    expect(deleteZeroRoundBuffs([])).toBe('');
  });
});
