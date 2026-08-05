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

describe('種類ごとに意味を持つ項目', () => {
  it('飛翔体だけが見た目・弾数・着弾演出を持つこと', () => {
    for (const kind of EFFECT_KINDS) {
      const expected = kind === 'projectile';
      expect(usesProjectileFields(kind)).toBe(expected);
      expect(usesShotFields(kind)).toBe(expected);
      expect(usesImpactKindField(kind)).toBe(expected);
    }
  });

  it('斬撃だけが型を持つこと', () => {
    expect(usesSlashFields('slash')).toBe(true);
    expect(usesSlashFields('burst')).toBe(false);
  });

  it('発射元が要る種類を挙げること', () => {
    // 撃ち手を選ばないと向きが決まらないもの。
    for (const kind of ['projectile', 'beam', 'breath', 'drain', 'arc'] as const) {
      expect(needsCaster(kind)).toBe(true);
    }
    for (const kind of ['burst', 'heal', 'aura'] as const) {
      expect(needsCaster(kind)).toBe(false);
    }
  });

  it('複数対象のときだけ上限を編集させること', () => {
    expect(usesTargetLimit('multi')).toBe(true);
    expect(usesTargetLimit('single')).toBe(false);
    expect(usesTargetLimit('self')).toBe(false);
  });
});

describe('duplicatedEffectName()', () => {
  it('重ならなければそのままの名前を使うこと', () => {
    expect(duplicatedEffectName('爆炎', ['斬撃'])).toBe('爆炎');
  });

  it('重なったら連番を付けること', () => {
    expect(duplicatedEffectName('爆炎', ['爆炎'])).toBe('爆炎 (2)');
    expect(duplicatedEffectName('爆炎', ['爆炎', '爆炎 (2)'])).toBe('爆炎 (3)');
  });

  it('名前が空なら既定の名前を使うこと', () => {
    expect(duplicatedEffectName('   ', [])).toBe('無題');
  });
});
