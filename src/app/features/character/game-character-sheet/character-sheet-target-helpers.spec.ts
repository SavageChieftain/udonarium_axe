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
 * happy-dom の DOMParser は属性名のドットを許容しないため `source.clone()` (内部で
 * toXml → DOMParser を経由) を実環境では動かせない。代わりに各クラスのプロトタイプの
 * `clone` をモックし、cloneTabletopObject の分岐ロジック（owner/isLock 解除・SoundEffect 発火）
 * のみを検証する。
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

  it('クローン位置は元の座標 + 既定 50px ずらす', () => {
    const source = new GameCharacter();
    source.location.x = 100;
    source.location.y = 200;
    let cloned: GameCharacter | null = null;
    restoreClone = stubClone(source, () => (cloned = new GameCharacter()));

    cloneTabletopObject(source);

    expect(cloned!.location.x).toBe(150);
    expect(cloned!.location.y).toBe(250);
  });

  it('offsetPx を渡せばずらし量を変えられる', () => {
    const source = new GameCharacter();
    let cloned: GameCharacter | null = null;
    restoreClone = stubClone(source, () => (cloned = new GameCharacter()));

    cloneTabletopObject(source, 25);

    expect(cloned!.location.x).toBe(25);
    expect(cloned!.location.y).toBe(25);
  });

  it('Terrain は isLocked を解除し SoundEffect を 1 回鳴らす', () => {
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

  it('Card は owner / isLock を解除し SoundEffect を 1 回鳴らす', () => {
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

  it('CardStack は owner / isLock を解除し SoundEffect を 1 回鳴らす', () => {
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

  it('GameTableMask は isLock を解除し SoundEffect を 1 回鳴らす', () => {
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

  it('TextNote は SoundEffect を 1 回鳴らす', () => {
    const source = new TextNote();
    restoreClone = stubClone(source, () => new TextNote());

    cloneTabletopObject(source);

    expect(playSpy).toHaveBeenCalledTimes(1);
  });

  it('DiceSymbol は SoundEffect を 2 回鳴らす (dicePut + piecePut)', () => {
    const source = new DiceSymbol();
    restoreClone = stubClone(source, () => new DiceSymbol());

    cloneTabletopObject(source);

    expect(playSpy).toHaveBeenCalledTimes(2);
  });

  it('GameCharacter は SoundEffect を 1 回鳴らす (デフォルト分岐)', () => {
    const source = new GameCharacter();
    restoreClone = stubClone(source, () => new GameCharacter());

    cloneTabletopObject(source);

    expect(playSpy).toHaveBeenCalledTimes(1);
  });
});
