import { type EffectKind } from '@axe/domain/effect/effect-kind';
import { type EffectPreset } from '@axe/domain/effect/effect-preset';
import {
  ARROW_RAIN_FALL,
  BALLISTIC_DIVE_END,
  EXCALIBUR_SWING_END,
  projectileTiming,
  slashHits,
} from '@axe/domain/effect/effect-timeline';
import {
  emitAura,
  emitBarrier,
  emitBolt,
  emitFrost,
  emitHeal,
  emitMiasma,
  emitVortex,
  emitWarp,
} from '@axe/domain/effect/particles/arcane';
import { emitBeam } from '@axe/domain/effect/particles/beam';
import { emitBisect, emitSlash } from '@axe/domain/effect/particles/blade';
import { emitDissolve, emitGore } from '@axe/domain/effect/particles/body';
import { emitBreath, emitDrain } from '@axe/domain/effect/particles/breath';
import { emitExplosion, emitFlame, emitMushroom } from '@axe/domain/effect/particles/fire';
import { emitBash, emitGravity, emitImpact, emitRubble, emitUpheaval } from '@axe/domain/effect/particles/ground';
import {
  clamp01,
  type ColorRamp,
  type EffectParticle,
  type EffectParticleLayer,
  seededRandom,
} from '@axe/domain/effect/particles/shared';

/**
 * 板ポリ面内で完結するパーティクル。canvas に加算合成で重ねて発光を作る。
 *
 * 座標は対象の足元を原点とした px で、canvas と同じく y は下方向が正。
 * 経過時間から毎回まるごと計算し直す純関数なので、フレームが飛んでも見た目がずれない。
 *
 * 粒の出し方そのものは `particles/` 配下に家族ごとに置く。ここは**どれを呼ぶか**だけを持つ。
 */

export {
  type ColorRamp,
  type EffectParticle,
  type EffectParticleLayer,
  type ParticleShape,
  seededRandom,
} from '@axe/domain/effect/particles/shared';

const HOT = '#ffffff';

export function effectParticles(
  preset: EffectPreset,
  seed: number,
  progress: number,
  base: number
): EffectParticleLayer {
  const ramp: ColorRamp = { hot: HOT, mid: preset.colorPrimary, cool: preset.colorSecondary };
  const particles: EffectParticle[] = [];

  emitFor(preset, seededRandom(seed), progress, base, ramp, particles);
  // 上級はもう一組重ねて濃くする。初級は間引いて地味にする。
  if (preset.gradeLevel === 3) emitFor(preset, seededRandom(seed + 104729), progress, base, ramp, particles);
  const graded = preset.gradeLevel === 1 ? particles.filter((_unused, index) => index % 2 === 0) : particles;

  const width = base * 9;
  const height = base * 9;
  return { width, height, originX: width / 2, originY: height * 0.72, particles: graded };
}

function emitFor(
  preset: EffectPreset,
  random: () => number,
  progress: number,
  base: number,
  ramp: ColorRamp,
  particles: EffectParticle[]
): void {
  if (preset.effectKind === 'slash') {
    // 太刀ごとに火花を散らす。まとめて 1 回出すと、連撃でも 1 回斬ったように見える。
    for (const hit of slashHits(preset.slashLook)) {
      const local = clamp01((progress - hit.at) / hit.span);
      if (local <= 0 || local >= 1) continue;
      emitSlash(particles, random, local, base, ramp);
      // 上級の一撃は土煙と破片まで跳ねる。火花だけだと軽い。
      // 力任せの型だけ土煙と破片まで跳ねる。居合は斬り口だけで見せる。
      if (preset.slashLook === 'wide' || preset.slashLook === 'heavy') {
        emitSlash(particles, random, local, base * 1.4, ramp);
        emitImpact(particles, random, local, base, ramp);
      }
    }
    return;
  }
  if (preset.effectKind === 'skyblade') {
    // 振り下ろした先で弾ける。全体の進みで出すと、刃が立ち上る前に的が爆ぜる。
    const burst = clamp01((progress - EXCALIBUR_SWING_END) / (1 - EXCALIBUR_SWING_END));
    if (burst > 0 && burst < 1) emitKind(preset.impactEffectKind, particles, random, burst, base, ramp);
    return;
  }
  if (preset.effectKind === 'ballistic') {
    // 落ちてきてから弾ける。打ち上げているあいだに出すと、撃つ前に的が爆ぜる。
    const burst = clamp01((progress - BALLISTIC_DIVE_END) / (1 - BALLISTIC_DIVE_END));
    if (burst > 0 && burst < 1) emitKind(preset.impactEffectKind, particles, random, burst, base * 1.2, ramp);
    return;
  }
  if (preset.effectKind === 'arrowrain') {
    // 1 本目が刺さってから土埃。降り始める前に出すと、当たる前に地面が爆ぜる。
    const local = clamp01((progress - ARROW_RAIN_FALL) / (1 - ARROW_RAIN_FALL));
    if (local > 0 && local < 1) emitImpact(particles, random, local, base * 0.7, ramp);
    return;
  }
  if (preset.effectKind === 'projectile') {
    // 飛翔中は canvas を使わない。着弾した弾から順に、指定された属性の演出で爆ぜる。
    for (const shot of projectileTiming(preset).shots) {
      const local = clamp01((progress - shot.land) / (1 - shot.land));
      if (local > 0 && local < 1) emitKind(preset.impactEffectKind, particles, random, local, base * 0.85, ramp);
    }
    return;
  }
  emitKind(preset.effectKind, particles, random, progress, base, ramp);
}

/** 種類ごとの粒の出し方。表に無い種類は弾けさせる。 */
const EMITTERS: Partial<Record<EffectKind, ParticleEmitter>> = {
  flame: emitFlame,
  slash: emitSlash,
  heal: emitHeal,
  impact: emitImpact,
  bolt: emitBolt,
  frost: emitFrost,
  nova: (particles, random, progress, base, ramp) => emitExplosion(particles, random, progress, base, ramp, 2, true),
  mushroom: emitMushroom,
  rubble: emitRubble,
  upheaval: emitUpheaval,
  vortex: emitVortex,
  miasma: emitMiasma,
  aura: emitAura,
  breath: emitBreath,
  barrier: emitBarrier,
  drain: emitDrain,
  warp: emitWarp,
  gravity: emitGravity,
  // 魔法陣から伸びる稲妻。雷と同じ出し方で足りる。
  arc: emitBolt,
  bash: emitBash,
  // 呪いは瘴気を細く。同じ濃さだと、範囲攻撃と見分けが付かない。
  curse: (particles, random, progress, base, ramp) => emitMiasma(particles, random, progress, base * 0.8, ramp),
  beam: emitBeam,
  dissolve: emitDissolve,
  gore: emitGore,
  bisect: emitBisect,
};

/** 粒を出せる種類。 */
export const PARTICLE_EFFECT_KINDS: readonly EffectKind[] = Object.keys(EMITTERS) as EffectKind[];

type ParticleEmitter = (
  particles: EffectParticle[],
  random: () => number,
  progress: number,
  base: number,
  ramp: ColorRamp
) => void;

function emitKind(
  kind: EffectKind,
  particles: EffectParticle[],
  random: () => number,
  progress: number,
  base: number,
  ramp: ColorRamp
): void {
  const emit = EMITTERS[kind];
  if (emit) {
    emit(particles, random, progress, base, ramp);
    return;
  }
  emitExplosion(particles, random, progress, base, ramp, 1, false);
}
