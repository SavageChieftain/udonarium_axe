import { defeatReactionOf } from '@axe/domain/effect/effect-defeat';
import { EFFECT_KINDS } from '@axe/domain/effect/effect-kind';

describe('defeatReactionOf()', () => {
  it('answers back to the piece itself only for an effect that knocks it down', () => {
    // An effect around it does not read as falling.
    expect(defeatReactionOf('dissolve')).toBe('dissolve');
    expect(defeatReactionOf('bisect')).toBe('bisect');
    expect(defeatReactionOf('gore')).toBe('flinch');
  });

  it('leaves the piece alone otherwise', () => {
    for (const kind of EFFECT_KINDS) {
      if (kind === 'dissolve' || kind === 'bisect' || kind === 'gore') continue;
      expect(defeatReactionOf(kind)).toBe('');
    }
  });
});
