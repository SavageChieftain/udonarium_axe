import { Card } from '@axe/domain/card/card';
import { CardStack } from '@axe/domain/card/card-stack';
import { GameCharacter } from '@axe/domain/character/game-character';
import { DiceSymbol } from '@axe/domain/dice/dice-symbol';
import { SoundEffect } from '@axe/domain/media/sound-effect';
import { CharacterSheetTarget } from '@axe/domain/tabletop/character-sheet-target';
import { GameTableMask } from '@axe/domain/tabletop/game-table-mask';
import { TabletopLocation } from '@axe/domain/tabletop/tabletop-object';
import { Terrain } from '@axe/domain/tabletop/terrain';
import { TextNote } from '@axe/domain/tabletop/text-note';
import { cloneTabletopObject } from '@axe/features/character/game-character-sheet/character-sheet-target-helpers';

/**
 * The parser of happy-dom refuses a dot in an attribute name, so a real clone, which goes
 * through xml and that parser, cannot run here. The clone on each prototype is mocked
 * instead, leaving only the branching to check: clearing the owner and the lock, and the
 * sound it makes.
 */
function stubClone<T extends CharacterSheetTarget>(source: T, factory: () => T): () => void {
  const proto = Object.getPrototypeOf(source) as { clone?: () => T };
  const original = proto.clone;
  proto.clone = function clone(this: T): T {
    const cloned = factory();
    cloned.location = { ...(this.location as TabletopLocation) };
    return cloned;
  };
  return () => {
    if (original) proto.clone = original;
  };
}

describe('cloneTabletopObject', () => {
  let playSpy: ReturnType<typeof vi.spyOn>;
  let restoreClone: (() => void) | null = null;

  beforeEach(() => {
    playSpy = vi.spyOn(SoundEffect, 'play').mockImplementation(() => {});
  });

  afterEach(() => {
    playSpy.mockRestore();
    restoreClone?.();
    restoreClone = null;
  });

  it('puts a copy fifty pixels from the original', () => {
    const source = new GameCharacter();
    source.location.x = 100;
    source.location.y = 200;
    let cloned: GameCharacter | null = null;
    restoreClone = stubClone(source, () => (cloned = new GameCharacter()));

    cloneTabletopObject(source);

    expect(cloned!.location.x).toBe(150);
    expect(cloned!.location.y).toBe(250);
  });

  it('takes any offset it is given', () => {
    const source = new GameCharacter();
    let cloned: GameCharacter | null = null;
    restoreClone = stubClone(source, () => (cloned = new GameCharacter()));

    cloneTabletopObject(source, 25);

    expect(cloned!.location.x).toBe(25);
    expect(cloned!.location.y).toBe(25);
  });

  it('unlocks a copied terrain and makes one sound', () => {
    const source = new Terrain();
    source.isLocked = true;
    let cloned: Terrain | null = null;
    restoreClone = stubClone(source, () => {
      const t = new Terrain();
      t.isLocked = true;
      cloned = t;
      return t;
    });

    cloneTabletopObject(source);

    expect(cloned!.isLocked).toBe(false);
    expect(playSpy).toHaveBeenCalledTimes(1);
  });

  it('clears the owner and the lock of a card and makes one sound', () => {
    const source = new Card();
    let cloned: Card | null = null;
    restoreClone = stubClone(source, () => {
      const c = new Card();
      c.owner = 'somebody';
      c.isLock = true;
      cloned = c;
      return c;
    });

    cloneTabletopObject(source);

    expect(cloned!.owner).toBe('');
    expect(cloned!.isLock).toBe(false);
    expect(playSpy).toHaveBeenCalledTimes(1);
  });

  it('does the same for a deck', () => {
    const source = new CardStack();
    let cloned: CardStack | null = null;
    restoreClone = stubClone(source, () => {
      const s = new CardStack();
      s.owner = 'somebody';
      s.isLock = true;
      cloned = s;
      return s;
    });

    cloneTabletopObject(source);

    expect(cloned!.owner).toBe('');
    expect(cloned!.isLock).toBe(false);
    expect(playSpy).toHaveBeenCalledTimes(1);
  });

  it('unlocks a mask and makes one sound', () => {
    const source = new GameTableMask();
    let cloned: GameTableMask | null = null;
    restoreClone = stubClone(source, () => {
      const m = new GameTableMask();
      m.isLock = true;
      cloned = m;
      return m;
    });

    cloneTabletopObject(source);

    expect(cloned!.isLock).toBe(false);
    expect(playSpy).toHaveBeenCalledTimes(1);
  });

  it('makes one sound for a note', () => {
    const source = new TextNote();
    restoreClone = stubClone(source, () => new TextNote());

    cloneTabletopObject(source);

    expect(playSpy).toHaveBeenCalledTimes(1);
  });

  it('makes two for a die, one for the die and one for the piece', () => {
    const source = new DiceSymbol();
    restoreClone = stubClone(source, () => new DiceSymbol());

    cloneTabletopObject(source);

    expect(playSpy).toHaveBeenCalledTimes(2);
  });

  it('makes one for a character, as anything else does', () => {
    const source = new GameCharacter();
    restoreClone = stubClone(source, () => new GameCharacter());

    cloneTabletopObject(source);

    expect(playSpy).toHaveBeenCalledTimes(1);
  });
});
