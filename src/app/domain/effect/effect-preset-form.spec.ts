import { EFFECT_KINDS } from '@axe/domain/effect/effect-kind';
import {
  duplicatedEffectName,
  needsCaster,
  usesImpactKindField,
  usesProjectileFields,
  usesShotFields,
  usesSlashFields,
  usesTargetLimit,
} from '@axe/domain/effect/effect-preset-form';

describe('which fields mean anything to which kind', () => {
  it('gives a look, a count of shots and a landing to a projectile alone', () => {
    for (const kind of EFFECT_KINDS) {
      const expected = kind === 'projectile';
      expect(usesProjectileFields(kind)).toBe(expected);
      expect(usesShotFields(kind)).toBe(expected);
      expect(usesImpactKindField(kind)).toBe(expected);
    }
  });

  it('gives a form to a cut alone', () => {
    expect(usesSlashFields('slash')).toBe(true);
    expect(usesSlashFields('burst')).toBe(false);
  });

  it('lists the kinds that need somewhere to fire from', () => {
    // The ones whose direction is undecided until a caster is chosen.
    for (const kind of ['projectile', 'beam', 'breath', 'drain', 'arc'] as const) {
      expect(needsCaster(kind)).toBe(true);
    }
    for (const kind of ['burst', 'heal', 'aura'] as const) {
      expect(needsCaster(kind)).toBe(false);
    }
  });

  it('lets the limit be edited only for something that takes several targets', () => {
    expect(usesTargetLimit('multi')).toBe(true);
    expect(usesTargetLimit('single')).toBe(false);
    expect(usesTargetLimit('self')).toBe(false);
  });
});

describe('duplicatedEffectName()', () => {
  it('keeps a name that clashes with none', () => {
    expect(duplicatedEffectName('爆炎', ['斬撃'])).toBe('爆炎');
  });

  it('numbers one that does', () => {
    expect(duplicatedEffectName('爆炎', ['爆炎'])).toBe('爆炎 (2)');
    expect(duplicatedEffectName('爆炎', ['爆炎', '爆炎 (2)'])).toBe('爆炎 (3)');
  });

  it('falls back to the default for an empty name', () => {
    expect(duplicatedEffectName('   ', [])).toBe('無題');
  });
});
