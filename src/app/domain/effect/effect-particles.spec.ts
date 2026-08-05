import { EFFECT_KINDS, EffectKind } from '@axe/domain/effect/effect-kind';
import { effectParticles, seededRandom } from '@axe/domain/effect/effect-particles';
import { EffectPreset } from '@axe/domain/effect/effect-preset';

describe('effectParticles()', () => {
  function makePreset(kind: EffectKind): EffectPreset {
    const preset = new EffectPreset('preset');
    preset.kind = kind;
    preset.durationMs = 1000;
    preset.colorPrimary = '#ffd27f';
    preset.colorSecondary = '#ff5a33';
    return preset;
  }

  const base = 50;

  it('どの種類でも山場のあいだは粒子を返すこと', () => {
    // 飛翔体とレーザーは届くまで対象側に何も出さないので別で確かめる。
    const flying: EffectKind[] = ['projectile', 'beam'];
    for (const kind of EFFECT_KINDS.filter((candidate) => !flying.includes(candidate))) {
      for (const progress of [0.3, 0.6]) {
        const layer = effectParticles(makePreset(kind), 7, progress, base);
        expect(layer.particles.length).toBeGreaterThan(0);
      }
    }
  });

  it('煙で画面を沈めないこと', () => {
    // 煙は canvas 全体へ広がるので、規模なりに大きく濃くすると画面そのものが暗く落ちる。
    // 対象が複数いれば canvas も重なるため、1 枚あたりの暗さを抑えておく必要がある。
    const darkestSmoke = (kind: EffectKind, scale: number): number => {
      const preset = makePreset(kind);
      preset.grade = 3;
      preset.scale = scale;
      let worst = 0;
      for (let step = 1; step < 20; step++) {
        const layer = effectParticles(preset, 7, step / 20, base * scale);
        const covered = layer.particles
          .filter((particle) => particle.shape === 'smoke')
          .reduce((sum, particle) => sum + Math.PI * (particle.size / 2) ** 2 * particle.alpha, 0);
        worst = Math.max(worst, covered / (layer.width * layer.height));
      }
      return worst;
    };

    // 爆発は閃光が主役。煙で覆うものではない。
    expect(darkestSmoke('nova', 1.8)).toBeLessThan(0.2);
    expect(darkestSmoke('burst', 1.4)).toBeLessThan(0.2);
    // 煙そのものが主役の種類でも、覆いきらない範囲に収める。
    for (const kind of EFFECT_KINDS) expect(darkestSmoke(kind, 1.9)).toBeLessThan(0.45);
  });

  it('ブレスは届くまで対象側に何も出さないこと', () => {
    // 吹き付ける前から燃えていると嘘になる。
    expect(effectParticles(makePreset('breath'), 7, 0.1, base).particles).toHaveLength(0);
    expect(effectParticles(makePreset('breath'), 7, 0.5, base).particles.length).toBeGreaterThan(0);
  });

  it('レーザーは届くまで対象側に何も出さないこと', () => {
    // この層は対象の上にある。溜めているあいだに出すと、撃つ前から着弾していることになる。
    expect(effectParticles(makePreset('beam'), 7, 0.15, base).particles).toHaveLength(0);
    expect(effectParticles(makePreset('beam'), 7, 0.6, base).particles.length).toBeGreaterThan(0);
  });

  it('対象の足元が canvas の内側に来ること', () => {
    const layer = effectParticles(makePreset('flame'), 7, 0.5, base);

    expect(layer.originX).toBeGreaterThan(0);
    expect(layer.originX).toBeLessThan(layer.width);
    expect(layer.originY).toBeGreaterThan(0);
    expect(layer.originY).toBeLessThan(layer.height);
  });

  it('同じ種から同じ粒子を返すこと', () => {
    for (const kind of EFFECT_KINDS) {
      const first = effectParticles(makePreset(kind), 11, 0.4, base);
      const second = effectParticles(makePreset(kind), 11, 0.4, base);

      expect(first).toEqual(second);
    }
  });

  it('種が違えば配置も変わること', () => {
    const first = effectParticles(makePreset('burst'), 1, 0.4, base);
    const second = effectParticles(makePreset('burst'), 2, 0.4, base);

    expect(first.particles).not.toEqual(second.particles);
  });

  it('不透明度を 0 以上 1 以下に収めること', () => {
    for (const kind of EFFECT_KINDS) {
      for (const progress of [0.02, 0.5, 0.99]) {
        for (const particle of effectParticles(makePreset(kind), 3, progress, base).particles) {
          expect(particle.alpha).toBeGreaterThanOrEqual(0);
          expect(particle.alpha).toBeLessThanOrEqual(1);
          expect(particle.size).toBeGreaterThan(0);
        }
      }
    }
  });

  it('炎は根元が白熱し、上へ行くほど暗くなること', () => {
    const layer = effectParticles(makePreset('flame'), 5, 0.5, base);
    const glows = layer.particles.filter((particle) => particle.shape === 'glow');
    const hottest = glows.filter((particle) => particle.color === '#ffffff');

    expect(hottest.length).toBeGreaterThan(0);
    // 白熱している粒の平均高さは、赤い粒より下（y が大きい）にある。
    const meanY = (list: typeof glows) => list.reduce((sum, particle) => sum + particle.y, 0) / list.length;
    const cool = glows.filter((particle) => particle.color === '#ff5a33');
    expect(meanY(hottest)).toBeGreaterThan(meanY(cool));
  });

  it('爆発の火花は時間とともに広がること', () => {
    const spreadAt = (progress: number) => {
      const layer = effectParticles(makePreset('burst'), 9, progress, base);
      const streaks = layer.particles.filter((particle) => particle.shape === 'streak');
      return Math.max(...streaks.map((particle) => Math.abs(particle.x)));
    };

    expect(spreadAt(0.6)).toBeGreaterThan(spreadAt(0.15));
  });

  it('飛翔体は着弾してから粒子を出すこと', () => {
    const preset = makePreset('projectile');

    expect(effectParticles(preset, 7, 0.2, base).particles).toHaveLength(0);
    expect(effectParticles(preset, 7, 0.7, base).particles.length).toBeGreaterThan(0);
  });

  it('飛翔体の着弾演出を属性で差し替えられること', () => {
    const preset = makePreset('projectile');
    preset.impactKind = 'rubble';

    // 岩が砕ける着弾なら、実体として描く岩片が混ざる。
    expect(effectParticles(preset, 7, 0.8, base).particles.some((particle) => particle.shape === 'chunk')).toBe(true);
  });

  it('連撃は太刀ごとに火花を散らすこと', () => {
    const preset = makePreset('slash');
    preset.slashStyle = 'combo';

    // 5 連撃のあいだ、どの時点でも火花が出ている。
    for (const progress of [0.1, 0.35, 0.6, 0.85]) {
      expect(effectParticles(preset, 7, progress, base).particles.length).toBeGreaterThan(0);
    }
  });

  it('煙は通常合成用に別の形として返すこと', () => {
    const layer = effectParticles(makePreset('flame'), 5, 0.6, base);

    expect(layer.particles.some((particle) => particle.shape === 'smoke')).toBe(true);
  });
});

describe('seededRandom()', () => {
  it('同じ種から同じ列を返すこと', () => {
    const first = seededRandom(99);
    const second = seededRandom(99);

    expect([first(), first(), first()]).toEqual([second(), second(), second()]);
  });
});
