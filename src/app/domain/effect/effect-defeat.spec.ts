import { defeatReactionOf } from '@axe/domain/effect/effect-defeat';
import { EFFECT_KINDS } from '@axe/domain/effect/effect-kind';

describe('defeatReactionOf()', () => {
  it('倒れる演出だけコマ本体に反応を返すこと', () => {
    // 周りに演出を出すだけでは「倒れた」ことにならない。
    expect(defeatReactionOf('dissolve')).toBe('dissolve');
    expect(defeatReactionOf('bisect')).toBe('bisect');
    expect(defeatReactionOf('gore')).toBe('flinch');
  });

  it('それ以外はコマに触らないこと', () => {
    for (const kind of EFFECT_KINDS) {
      if (kind === 'dissolve' || kind === 'bisect' || kind === 'gore') continue;
      expect(defeatReactionOf(kind)).toBe('');
    }
  });
});
