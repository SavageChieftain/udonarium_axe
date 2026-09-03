import { GameCharacter } from '@axe/domain/character/game-character';
import { findSlotActor } from '@axe/features/hotbar/hotbar-actor';

describe('finding the piece a slot acts as', () => {
  function character(name: string, owner: string): GameCharacter {
    const held = GameCharacter.create(name, 1, '');
    held.owner = owner;
    held.location.name = 'table';
    return held;
  }

  it('takes the piece the slot names', () => {
    const mine = character('術者', 'me');
    const other = character('術者', 'me');
    other.name = '別人';

    const found = findSlotActor({ characterIdentifier: mine.identifier, characterName: '術者' }, [mine, other], 'me');

    expect(found?.character).toBe(mine);
    expect(found?.renamed).toBe(false);
  });

  it('finds it again by name where the identifier means nothing here', () => {
    const mine = character('術者', 'me');

    const found = findSlotActor({ characterIdentifier: 'from-another-room', characterName: '術者' }, [mine], 'me');

    expect(found?.character).toBe(mine);
    expect(found?.renamed).toBe(true);
  });

  it('takes nobody where two pieces go by that name', () => {
    const first = character('術者', 'me');
    const second = character('術者', 'me');

    expect(findSlotActor({ characterIdentifier: 'gone', characterName: '術者' }, [first, second], 'me')).toBeNull();
  });

  it('takes nobody else’s piece, by name or otherwise', () => {
    const theirs = character('術者', 'someone-else');

    expect(findSlotActor({ characterIdentifier: theirs.identifier, characterName: '術者' }, [theirs], 'me')).toBeNull();
  });

  it('takes nobody for a slot that names none', () => {
    const mine = character('術者', 'me');

    expect(findSlotActor({ characterIdentifier: '', characterName: '' }, [mine], 'me')).toBeNull();
  });
});
