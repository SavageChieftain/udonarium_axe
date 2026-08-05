import { EffectKind } from '@axe/domain/effect/effect-kind';
import { EffectPreset } from '@axe/domain/effect/effect-preset';
import { projectileTiming, slashHits } from '@axe/domain/effect/effect-timeline';

/**
 * 板ポリ面内で完結するパーティクル。canvas に加算合成で重ねて発光を作る。
 *
 * 座標は対象の足元を原点とした px で、canvas と同じく y は下方向が正。
 * 経過時間から毎回まるごと計算し直す純関数なので、フレームが飛んでも見た目がずれない。
 */

export type ParticleShape = 'glow' | 'streak' | 'smoke' | 'chunk';

export interface EffectParticle {
  x: number;
  y: number;
  size: number;
  /** streak のときだけ使う。進行方向のラジアン。 */
  angle: number;
  /** streak の伸び。1 で正円。 */
  stretch: number;
  color: string;
  alpha: number;
  shape: ParticleShape;
}

export interface EffectParticleLayer {
  /** canvas の大きさ(px)。 */
  width: number;
  height: number;
  /** canvas 内で対象の足元が来る位置(px)。 */
  originX: number;
  originY: number;
  particles: EffectParticle[];
}

/** 白熱 → 明色 → 暗色へ落ちる色ランプ。明度差が視線を引くので白を必ず通す。 */
export interface ColorRamp {
  hot: string;
  mid: string;
  cool: string;
}

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

function emitKind(
  kind: EffectKind,
  particles: EffectParticle[],
  random: () => number,
  progress: number,
  base: number,
  ramp: ColorRamp
): void {
  switch (kind) {
    case 'flame':
      emitFlame(particles, random, progress, base, ramp);
      break;
    case 'slash':
      emitSlash(particles, random, progress, base, ramp);
      break;
    case 'heal':
      emitHeal(particles, random, progress, base, ramp);
      break;
    case 'impact':
      emitImpact(particles, random, progress, base, ramp);
      break;
    case 'bolt':
      emitBolt(particles, random, progress, base, ramp);
      break;
    case 'frost':
      emitFrost(particles, random, progress, base, ramp);
      break;
    case 'nova':
      emitExplosion(particles, random, progress, base, ramp, 2, true);
      break;
    case 'mushroom':
      emitMushroom(particles, random, progress, base, ramp);
      break;
    case 'rubble':
      emitRubble(particles, random, progress, base, ramp);
      break;
    case 'upheaval':
      emitUpheaval(particles, random, progress, base, ramp);
      break;
    case 'vortex':
      emitVortex(particles, random, progress, base, ramp);
      break;
    case 'miasma':
      emitMiasma(particles, random, progress, base, ramp);
      break;
    case 'aura':
      emitAura(particles, random, progress, base, ramp);
      break;
    case 'breath':
      emitBreath(particles, random, progress, base, ramp);
      break;
    case 'barrier':
      emitBarrier(particles, random, progress, base, ramp);
      break;
    case 'drain':
      emitDrain(particles, random, progress, base, ramp);
      break;
    case 'warp':
      emitWarp(particles, random, progress, base, ramp);
      break;
    case 'gravity':
      emitGravity(particles, random, progress, base, ramp);
      break;
    case 'arc':
      // 走った先で弾ける。放電そのものは線として描く。
      emitBolt(particles, random, progress, base, ramp);
      break;
    case 'bash':
      emitBash(particles, random, progress, base, ramp);
      break;
    case 'curse':
      emitMiasma(particles, random, progress, base * 0.8, ramp);
      break;
    case 'beam':
      emitBeam(particles, random, progress, base, ramp);
      break;
    default:
      emitExplosion(particles, random, progress, base, ramp, 1, false);
      break;
  }
}

/** 立ち上る炎。根元が白熱し、上へ行くほど細く赤く、最後は煙になる。 */
function emitFlame(
  particles: EffectParticle[],
  random: () => number,
  progress: number,
  base: number,
  ramp: ColorRamp
): void {
  const life = fadeInOut(progress, 0.18);
  if (life <= 0) return;

  for (let index = 0; index < 46; index++) {
    const phase = random();
    const spread = (random() - 0.5) * base * 0.9;
    const speed = 0.55 + random() * 0.45;
    const swayPhase = random() * Math.PI * 2;

    const local = (progress * 2.6 + phase) % 1;
    const rise = easeOutQuad(local);
    const sway = Math.sin(swayPhase + local * Math.PI * 2.4) * base * 0.16 * local;

    particles.push({
      x: spread * (1 - local * 0.55) + sway,
      y: -base * (0.1 + rise * 2.1 * speed),
      size: base * (0.5 + random() * 0.22) * (1 - local * 0.55),
      angle: 0,
      stretch: 1.35 - local * 0.4,
      color: flameColor(local, ramp),
      alpha: life * (1 - local) * 0.85,
      shape: 'glow',
    });
  }

  for (let index = 0; index < 14; index++) {
    const phase = random();
    const spread = (random() - 0.5) * base * 1.1;
    const local = (progress * 1.7 + phase) % 1;
    particles.push({
      x: spread + Math.sin(local * Math.PI * 3 + phase * 6) * base * 0.28,
      y: -base * (0.3 + local * 3.4),
      size: base * 0.1 * (1 - local * 0.4),
      angle: 0,
      stretch: 1,
      color: local < 0.5 ? ramp.hot : ramp.mid,
      alpha: life * (1 - local) * 0.95,
      shape: 'glow',
    });
  }

  for (let index = 0; index < 8; index++) {
    const phase = random();
    const local = (progress * 1.1 + phase) % 1;
    particles.push({
      x: (random() - 0.5) * base * 0.8 + Math.sin(local * Math.PI * 2 + phase * 5) * base * 0.5,
      y: -base * (1.6 + local * 3),
      size: base * (0.7 + local * 1.1),
      angle: 0,
      stretch: 1,
      color: '#2a2320',
      alpha: life * (1 - local) * 0.3 * local,
      shape: 'smoke',
    });
  }
}

/** 爆発。短い白熱の芯と、抵抗を受けて減速する火花・膨らむ火球・後から出る煙。 */
function emitExplosion(
  particles: EffectParticle[],
  random: () => number,
  progress: number,
  base: number,
  ramp: ColorRamp,
  power: number,
  engulf: boolean
): void {
  if (engulf) emitEngulf(particles, random, progress, base, ramp, power);

  const flash = clamp01(progress / 0.12);
  if (flash < 1) {
    particles.push({
      x: 0,
      y: -base * 0.6,
      size: base * (1.6 + flash * 2.4) * power,
      angle: 0,
      stretch: 1,
      color: ramp.hot,
      alpha: (1 - flash) * 0.95,
      shape: 'glow',
    });
  }

  const puffs = Math.round(20 * power);
  for (let index = 0; index < puffs; index++) {
    const angle = random() * Math.PI * 2;
    const reach = base * (0.3 + random() * 1.1) * power;
    const born = random() * 0.16;
    const local = clamp01((progress - born) / 0.62);
    if (local <= 0 || local >= 1) continue;
    const distance = reach * easeOutQuad(local);
    particles.push({
      x: Math.cos(angle) * distance,
      y: -base * 0.6 + Math.sin(angle) * distance * 0.7 - base * local * 0.5,
      size: base * (0.75 + random() * 0.5) * power * (0.6 + local * 0.9),
      angle: 0,
      stretch: 1,
      color: flameColor(local, ramp),
      alpha: (1 - local) * 0.85,
      shape: 'glow',
    });
  }

  const sparks = Math.round(30 * power);
  for (let index = 0; index < sparks; index++) {
    const angle = random() * Math.PI * 2;
    const speed = base * (1.6 + random() * 2.6) * power;
    const born = random() * 0.1;
    const local = clamp01((progress - born) / 0.75);
    if (local <= 0 || local >= 1) continue;
    // 抵抗で失速させ、重力で落とす。等速直線だと花火に見えない。
    const travel = speed * (1 - Math.pow(1 - local, 2.2));
    const drop = base * 1.9 * local * local * power;
    particles.push({
      x: Math.cos(angle) * travel,
      y: -base * 0.6 + Math.sin(angle) * travel * 0.72 + drop,
      size: base * 0.13 * (1 - local * 0.4),
      angle,
      stretch: 3.2 + local * 3,
      color: local < 0.35 ? ramp.hot : ramp.mid,
      alpha: (1 - local) * 0.95,
      shape: 'streak',
    });
  }

  // 煙は爆発を大きく見せるが、濃さと大きさを規模なりに増やすと画面そのものが暗く沈む。
  // 数と広がりだけを規模で増やし、1 粒の濃さは規模に依らず薄いままにする。
  const smokes = Math.round(9 * power);
  for (let index = 0; index < smokes; index++) {
    const angle = random() * Math.PI * 2;
    const born = 0.12 + random() * 0.25;
    const local = clamp01((progress - born) / 0.7);
    if (local <= 0 || local >= 1) continue;
    particles.push({
      x: Math.cos(angle) * base * (0.4 + local * 1.5) * power,
      y: -base * 0.6 + Math.sin(angle) * base * 0.5 - base * local * 1.6 * power,
      size: base * (0.7 + local * 1.1) * (0.75 + power * 0.25),
      angle: 0,
      stretch: 1,
      color: '#453a32',
      alpha: fadeInOut(local, 0.3) * 0.11,
      shape: 'smoke',
    });
  }
}

/** 斬撃。刃そのものは SVG 側で描き、ここでは着弾の閃光と飛散だけを持つ。 */
function emitSlash(
  particles: EffectParticle[],
  random: () => number,
  progress: number,
  base: number,
  ramp: ColorRamp
): void {
  const flash = clamp01(progress / 0.22);
  if (flash < 1) {
    particles.push({
      x: 0,
      y: -base * 0.55,
      size: base * (1 + flash * 1.6),
      angle: 0,
      stretch: 1,
      color: ramp.hot,
      alpha: (1 - flash) * 0.9,
      shape: 'glow',
    });
  }

  for (let index = 0; index < 26; index++) {
    const angle = random() * Math.PI * 2;
    const speed = base * (1.2 + random() * 2.4);
    const born = random() * 0.14;
    const local = clamp01((progress - born) / 0.7);
    if (local <= 0 || local >= 1) continue;
    const travel = speed * (1 - Math.pow(1 - local, 2.4));
    particles.push({
      x: Math.cos(angle) * travel,
      y: -base * 0.55 + Math.sin(angle) * travel * 0.7 + base * 1.4 * local * local,
      size: base * 0.1 * (1 - local * 0.35),
      angle,
      stretch: 4 + local * 4,
      color: local < 0.4 ? ramp.hot : ramp.mid,
      alpha: (1 - local) * 0.95,
      shape: 'streak',
    });
  }
}

/** 回復。下から湧いて立ち上る光の粒と、包み込む柔らかい光。 */
function emitHeal(
  particles: EffectParticle[],
  random: () => number,
  progress: number,
  base: number,
  ramp: ColorRamp
): void {
  const life = fadeInOut(progress, 0.2);
  if (life <= 0) return;

  for (let index = 0; index < 34; index++) {
    const phase = random();
    const angle = random() * Math.PI * 2;
    const radius = base * (0.15 + random() * 0.75);
    const local = (progress * 1.5 + phase) % 1;
    const spin = angle + local * 1.6;
    particles.push({
      x: Math.cos(spin) * radius * (1 - local * 0.45),
      y: -base * (0.1 + easeOutQuad(local) * 2.6),
      size: base * (0.12 + random() * 0.1),
      angle: 0,
      stretch: 1,
      color: local < 0.4 ? ramp.hot : ramp.mid,
      alpha: life * fadeInOut(local, 0.2) * 0.95,
      shape: 'glow',
    });
  }

  for (let index = 0; index < 10; index++) {
    const local = (progress * 1.1 + random()) % 1;
    particles.push({
      x: (random() - 0.5) * base * 1.2,
      y: -base * (0.3 + local * 1.8),
      size: base * (0.9 + random() * 0.6),
      angle: 0,
      stretch: 1,
      color: ramp.cool,
      alpha: life * fadeInOut(local, 0.35) * 0.32,
      shape: 'glow',
    });
  }
}

/** 着弾。舞い上がる土煙と、跳ねる小さな破片。 */
function emitImpact(
  particles: EffectParticle[],
  random: () => number,
  progress: number,
  base: number,
  ramp: ColorRamp
): void {
  const flash = clamp01(progress / 0.14);
  if (flash < 1) {
    particles.push({
      x: 0,
      y: -base * 0.2,
      size: base * (1.4 + flash * 2),
      angle: 0,
      stretch: 1,
      color: ramp.hot,
      alpha: (1 - flash) * 0.85,
      shape: 'glow',
    });
  }

  for (let index = 0; index < 18; index++) {
    const angle = random() * Math.PI * 2;
    const born = random() * 0.2;
    const local = clamp01((progress - born) / 0.75);
    if (local <= 0 || local >= 1) continue;
    const distance = base * (0.6 + random() * 2.2) * easeOutQuad(local);
    particles.push({
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance * 0.5 - base * (0.1 + local * 0.7),
      size: base * (0.7 + local * 1.2),
      angle: 0,
      stretch: 1,
      color: '#6a5c4e',
      alpha: fadeInOut(local, 0.25) * 0.34,
      shape: 'smoke',
    });
  }

  for (let index = 0; index < 16; index++) {
    const angle = random() * Math.PI * 2;
    const speed = base * (1 + random() * 1.8);
    const local = clamp01(progress / 0.7);
    if (local <= 0 || local >= 1) continue;
    const travel = speed * (1 - Math.pow(1 - local, 2.2));
    particles.push({
      x: Math.cos(angle) * travel,
      y: Math.sin(angle) * travel * 0.45 - base * 0.9 * Math.sin(local * Math.PI),
      size: base * 0.09,
      angle,
      stretch: 2.4,
      color: ramp.mid,
      alpha: (1 - local) * 0.8,
      shape: 'streak',
    });
  }
}

/** 落雷。稲妻は SVG 側。ここは着弾の白熱と跳ねる放電。 */
function emitBolt(
  particles: EffectParticle[],
  random: () => number,
  progress: number,
  base: number,
  ramp: ColorRamp
): void {
  const flash = clamp01(progress / 0.2);
  if (flash < 1) {
    particles.push({
      x: 0,
      y: -base * 0.5,
      size: base * (2 + flash * 3),
      angle: 0,
      stretch: 1,
      color: ramp.hot,
      alpha: (1 - flash) * 0.95,
      shape: 'glow',
    });
  }

  for (let index = 0; index < 24; index++) {
    const angle = random() * Math.PI * 2;
    const speed = base * (1.2 + random() * 2.2);
    const born = random() * 0.18;
    const local = clamp01((progress - born) / 0.6);
    if (local <= 0 || local >= 1) continue;
    const travel = speed * (1 - Math.pow(1 - local, 2.6));
    // 放電は明滅させる。連続的に薄くするより電気らしい。
    const flicker = Math.floor(progress * 40 + index) % 3 === 0 ? 0.35 : 1;
    particles.push({
      x: Math.cos(angle) * travel,
      y: Math.sin(angle) * travel * 0.5 - base * 0.2,
      size: base * 0.1,
      angle,
      stretch: 3.4,
      color: local < 0.5 ? ramp.hot : ramp.mid,
      alpha: (1 - local) * flicker * 0.9,
      shape: 'streak',
    });
  }
}

/** 氷結。結晶は SVG 側。ここは白い冷気と細かいきらめき。 */
function emitFrost(
  particles: EffectParticle[],
  random: () => number,
  progress: number,
  base: number,
  ramp: ColorRamp
): void {
  const life = fadeInOut(progress, 0.22);
  if (life <= 0) return;

  for (let index = 0; index < 20; index++) {
    const angle = random() * Math.PI * 2;
    const born = random() * 0.3;
    const local = clamp01((progress - born) / 0.7);
    if (local <= 0 || local >= 1) continue;
    const radius = base * (2 - easeOutQuad(local) * 1.6);
    particles.push({
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius * 0.55 - base * (0.2 + local * 0.5),
      size: base * (0.6 + local * 0.7),
      angle: 0,
      stretch: 1,
      color: ramp.cool,
      alpha: fadeInOut(local, 0.3) * 0.3,
      shape: 'smoke',
    });
  }

  for (let index = 0; index < 26; index++) {
    const phase = random();
    const angle = random() * Math.PI * 2;
    const radius = base * (0.2 + random() * 1.1);
    const local = (progress * 1.6 + phase) % 1;
    // きらめきは点滅させる。氷の反射に見える。
    const twinkle = Math.sin(local * Math.PI) * (0.5 + 0.5 * Math.sin(phase * 30 + progress * 40));
    particles.push({
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius * 0.5 - base * (0.2 + local * 1.4),
      size: base * 0.11,
      angle: 0,
      stretch: 1,
      color: local < 0.5 ? ramp.hot : ramp.mid,
      alpha: life * Math.max(0, twinkle) * 0.9,
      shape: 'glow',
    });
  }
}

/** 竜巻。渦に巻き上げられる砂と、周回する風の筋。 */
function emitVortex(
  particles: EffectParticle[],
  random: () => number,
  progress: number,
  base: number,
  ramp: ColorRamp
): void {
  const life = fadeInOut(progress, 0.16);
  if (life <= 0) return;

  for (let index = 0; index < 44; index++) {
    const phase = random();
    const spinSeed = random() * Math.PI * 2;
    const local = (progress * 1.4 + phase) % 1;
    const height = local;
    const radius = base * (0.3 + height * 1.2);
    const angle = spinSeed + progress * Math.PI * 7 + height * Math.PI * 2;
    const front = Math.sin(angle);
    particles.push({
      x: Math.cos(angle) * radius,
      y: front * radius * 0.24 - base * (0.1 + height * 3.4),
      size: base * (0.3 + random() * 0.25) * (1 - height * 0.35),
      angle: angle + Math.PI / 2,
      stretch: 2.6,
      // 手前に来た粒だけ明るくすると、平面ではなく筒に見える。
      alpha: life * Math.max(0.04, 0.35 + front * 0.4) * (1 - height * 0.35),
      color: front > 0 ? ramp.mid : ramp.cool,
      shape: 'streak',
    });
  }

  for (let index = 0; index < 14; index++) {
    const phase = random();
    const local = (progress * 1.2 + phase) % 1;
    const angle = random() * Math.PI * 2 + progress * 8;
    const radius = base * (0.9 + random() * 0.9);
    particles.push({
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius * 0.3 - base * 0.1,
      size: base * (0.6 + local * 0.8),
      angle: 0,
      stretch: 1,
      color: '#7a7168',
      alpha: life * (1 - local) * 0.3,
      shape: 'smoke',
    });
  }
}

/** 毒霧。低く滞留する霧と、浮かび上がる泡。 */
function emitMiasma(
  particles: EffectParticle[],
  random: () => number,
  progress: number,
  base: number,
  ramp: ColorRamp
): void {
  const life = fadeInOut(progress, 0.24);
  if (life <= 0) return;

  for (let index = 0; index < 26; index++) {
    const phase = random();
    const angle = random() * Math.PI * 2;
    const radius = base * (0.3 + random() * 1.3);
    const drift = progress * 1.4 + phase * Math.PI * 2;
    particles.push({
      x: Math.cos(angle + drift * 0.35) * radius,
      y: Math.sin(angle + drift * 0.35) * radius * 0.42 - base * (0.15 + Math.sin(drift) * 0.18 + random() * 0.35),
      size: base * (0.9 + random() * 0.9),
      angle: 0,
      stretch: 1,
      color: ramp.cool,
      alpha: life * 0.34,
      shape: 'smoke',
    });
  }

  for (let index = 0; index < 16; index++) {
    const phase = random();
    const local = (progress * 1.3 + phase) % 1;
    particles.push({
      x: (random() - 0.5) * base * 1.6,
      y: -base * (0.1 + local * 1.9),
      size: base * (0.1 + random() * 0.08),
      angle: 0,
      stretch: 1,
      color: local < 0.5 ? ramp.mid : ramp.hot,
      alpha: life * fadeInOut(local, 0.25) * 0.85,
      shape: 'glow',
    });
  }
}

/** 闘気。足元から吹き上がる気と、周回する光。 */
function emitAura(
  particles: EffectParticle[],
  random: () => number,
  progress: number,
  base: number,
  ramp: ColorRamp
): void {
  const life = fadeInOut(progress, 0.26);
  if (life <= 0) return;

  for (let index = 0; index < 36; index++) {
    const phase = random();
    const angle = random() * Math.PI * 2;
    const radius = base * (0.35 + random() * 0.55);
    const local = (progress * 1.8 + phase) % 1;
    const spin = angle + progress * 6;
    particles.push({
      x: Math.cos(spin) * radius * (1 - local * 0.5),
      y: -base * (0.05 + easeOutQuad(local) * 2.4),
      size: base * (0.14 + random() * 0.12),
      angle: Math.PI / 2,
      stretch: 2.2 + local * 2,
      color: local < 0.45 ? ramp.hot : ramp.mid,
      alpha: life * (1 - local) * 0.9,
      shape: 'streak',
    });
  }

  for (let index = 0; index < 12; index++) {
    const phase = random();
    const local = (progress * 1.2 + phase) % 1;
    particles.push({
      x: (random() - 0.5) * base * 1.1,
      y: -base * (0.2 + local * 1.5),
      size: base * (0.7 + local * 0.7),
      angle: 0,
      stretch: 1,
      color: ramp.cool,
      alpha: life * fadeInOut(local, 0.3) * 0.28,
      shape: 'glow',
    });
  }
}

/**
 * 対象を飲み込む段。爆発の前に周囲の炎を吸い寄せ、そのあと火球でコマを覆う。
 * 外へ散るだけだと「その場で爆ぜた」で終わり、飲まれた感じが出ない。
 */
function emitEngulf(
  particles: EffectParticle[],
  random: () => number,
  progress: number,
  base: number,
  ramp: ColorRamp,
  power: number
): void {
  const bodyY = -base * 0.9;

  // 吸い込み。溜めがあると次の膨張が強く見える。
  const suck = clamp01(progress / 0.14);
  if (suck < 1) {
    for (let index = 0; index < 18; index++) {
      const angle = random() * Math.PI * 2;
      const radius = base * (2.6 + random() * 1.4) * (1 - easeOutQuad(suck));
      particles.push({
        x: Math.cos(angle) * radius,
        y: bodyY + Math.sin(angle) * radius * 0.55,
        size: base * 0.28,
        angle,
        stretch: 2.6 + suck * 4,
        color: ramp.mid,
        alpha: suck * 0.8,
        shape: 'streak',
      });
    }
  }

  // コマを覆う火球。しばらく濃いまま留めてから崩す。
  const swallow = clamp01((progress - 0.08) / 0.5);
  if (swallow > 0 && swallow < 1) {
    const hold = swallow < 0.45 ? 1 : 1 - (swallow - 0.45) / 0.55;
    for (let index = 0; index < 10; index++) {
      const angle = random() * Math.PI * 2;
      const radius = base * random() * 0.7 * power;
      particles.push({
        x: Math.cos(angle) * radius,
        y: bodyY + Math.sin(angle) * radius * 0.7 - base * swallow * 0.5,
        size: base * (2.2 + random() * 1.1) * power * (0.55 + swallow * 0.7),
        angle: 0,
        stretch: 1,
        color: swallow < 0.3 ? ramp.hot : flameColor(swallow, ramp),
        alpha: hold * 0.75,
        shape: 'glow',
      });
    }

    // 火球を包む煙。輪郭が出ることで「覆われている」ことが読める。
    // 規模なりに大きく黒くすると、包むのを通り越して画面が沈む。
    for (let index = 0; index < 8; index++) {
      const angle = random() * Math.PI * 2;
      const radius = base * (0.9 + random() * 0.7) * power * (0.6 + swallow * 0.8);
      particles.push({
        x: Math.cos(angle) * radius,
        y: bodyY + Math.sin(angle) * radius * 0.6,
        size: base * (1.1 + random() * 0.6) * (0.8 + power * 0.3),
        angle: 0,
        stretch: 1,
        color: '#3b2f28',
        alpha: hold * 0.24 * swallow,
        shape: 'smoke',
      });
    }
  }
}

/** 最上級の爆発。柱が立ち上がり、上端で笠が巻きながら広がる。 */
function emitMushroom(
  particles: EffectParticle[],
  random: () => number,
  progress: number,
  base: number,
  ramp: ColorRamp
): void {
  const flash = clamp01(progress / 0.08);
  if (flash < 1) {
    particles.push({
      x: 0,
      y: -base * 0.8,
      size: base * (3 + flash * 4),
      angle: 0,
      stretch: 1,
      color: ramp.hot,
      alpha: (1 - flash) * 0.98,
      shape: 'glow',
    });
  }

  // 火柱。下ほど太く白熱し、上へ行くほど細く暗くなる。
  for (let index = 0; index < 40; index++) {
    const phase = random();
    const local = clamp01((progress - phase * 0.3) / 0.55);
    if (local <= 0 || local >= 1) continue;
    const height = easeOutQuad(local);
    const radius = base * (0.5 + random() * 0.4) * (1 - height * 0.35);
    const angle = random() * Math.PI * 2;
    particles.push({
      x: Math.cos(angle) * radius,
      y: -base * (0.6 + height * 3.4),
      size: base * (1 + random() * 0.6) * (1 - height * 0.3),
      angle: 0,
      stretch: 1,
      color: flameColor(height, ramp),
      alpha: (1 - local * 0.7) * 0.7,
      shape: 'glow',
    });
  }

  // 笠。ドーナツ状に巻き上がりながら外へ広がる。
  const cap = clamp01((progress - 0.28) / 0.72);
  if (cap > 0) {
    for (let index = 0; index < 44; index++) {
      const around = random() * Math.PI * 2;
      const roll = random() * Math.PI * 2 + cap * Math.PI * 1.6;
      const ringRadius = base * (0.6 + easeOutQuad(cap) * 3.2);
      const tube = base * (0.7 + random() * 0.5) * (0.6 + cap * 0.8);
      particles.push({
        x: Math.cos(around) * (ringRadius + Math.cos(roll) * tube),
        y: -base * (3.6 + cap * 1.4) + Math.sin(around) * ringRadius * 0.4 + Math.sin(roll) * tube * 0.7,
        size: base * (1 + random() * 0.7),
        angle: 0,
        stretch: 1,
        color: cap < 0.35 ? flameColor(cap + 0.2, ramp) : '#4a3a30',
        alpha: (1 - cap * 0.85) * (cap < 0.3 ? 0.55 : 0.2),
        shape: cap < 0.3 ? 'glow' : 'smoke',
      });
    }
  }

  // 裾。地面を這って広がる衝撃の煙。
  const skirt = clamp01((progress - 0.1) / 0.6);
  if (skirt > 0 && skirt < 1) {
    for (let index = 0; index < 20; index++) {
      const angle = random() * Math.PI * 2;
      const distance = base * (1 + random() * 2.4) * easeOutQuad(skirt);
      particles.push({
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance * 0.4 - base * 0.2,
        size: base * (0.8 + skirt * 1.2),
        angle: 0,
        stretch: 1,
        color: '#5a4a3e',
        alpha: fadeInOut(skirt, 0.25) * 0.16,
        shape: 'smoke',
      });
    }
  }
}

/** 岩石破砕。砕けた岩が飛び散り、粉塵が残る。 */
function emitRubble(
  particles: EffectParticle[],
  random: () => number,
  progress: number,
  base: number,
  ramp: ColorRamp
): void {
  for (let index = 0; index < 24; index++) {
    const angle = random() * Math.PI * 2;
    const speed = base * (1 + random() * 2.2);
    const born = random() * 0.12;
    const local = clamp01((progress - born) / 0.8);
    if (local <= 0 || local >= 1) continue;
    const travel = speed * (1 - Math.pow(1 - local, 2));
    // 放り上げてから落とす。放物線があるだけで石らしくなる。
    const lift = base * 2.2 * Math.sin(Math.PI * Math.min(local * 1.1, 1));
    particles.push({
      x: Math.cos(angle) * travel,
      y: Math.sin(angle) * travel * 0.45 - lift,
      size: base * (0.16 + random() * 0.22),
      angle: angle + local * 6,
      stretch: 1,
      color: index % 3 === 0 ? ramp.mid : '#6d5a49',
      alpha: (1 - local * 0.5) * 0.95,
      shape: 'chunk',
    });
  }

  for (let index = 0; index < 16; index++) {
    const angle = random() * Math.PI * 2;
    const born = random() * 0.2;
    const local = clamp01((progress - born) / 0.85);
    if (local <= 0 || local >= 1) continue;
    const distance = base * (0.5 + random() * 2) * easeOutQuad(local);
    particles.push({
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance * 0.45 - base * (0.1 + local * 0.9),
      size: base * (0.8 + local * 1.5),
      angle: 0,
      stretch: 1,
      color: '#7d6a58',
      alpha: fadeInOut(local, 0.2) * 0.38,
      shape: 'smoke',
    });
  }

  const flash = clamp01(progress / 0.16);
  if (flash < 1) {
    particles.push({
      x: 0,
      y: -base * 0.3,
      size: base * (1.2 + flash * 1.6),
      angle: 0,
      stretch: 1,
      color: ramp.mid,
      alpha: (1 - flash) * 0.7,
      shape: 'glow',
    });
  }
}

/** 地面隆起。せり上がる土煙と、崩れ落ちる土塊。 */
function emitUpheaval(
  particles: EffectParticle[],
  random: () => number,
  progress: number,
  base: number,
  ramp: ColorRamp
): void {
  // せり上がりに合わせて土煙が持ち上がる。
  const rise = clamp01(progress / 0.45);
  for (let index = 0; index < 26; index++) {
    const angle = random() * Math.PI * 2;
    const radius = base * (0.4 + random() * 1.1);
    const local = clamp01((progress - random() * 0.25) / 0.75);
    if (local <= 0 || local >= 1) continue;
    particles.push({
      x: Math.cos(angle) * radius * (1 + local * 0.6),
      y: Math.sin(angle) * radius * 0.4 - base * (0.2 + easeOutQuad(rise) * 1.6 + local * 0.8),
      size: base * (0.9 + local * 1.4),
      angle: 0,
      stretch: 1,
      color: '#6f5c4a',
      alpha: fadeInOut(local, 0.25) * 0.4,
      shape: 'smoke',
    });
  }

  // 割れて跳ね上がる土塊。落下は隆起より遅れて始まる。
  for (let index = 0; index < 18; index++) {
    const angle = random() * Math.PI * 2;
    const born = random() * 0.25;
    const local = clamp01((progress - born) / 0.75);
    if (local <= 0 || local >= 1) continue;
    const radius = base * (0.6 + random() * 1.2);
    const lift = base * (2.4 * Math.sin(Math.PI * Math.min(local * 1.15, 1)));
    particles.push({
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius * 0.4 - lift,
      size: base * (0.2 + random() * 0.26),
      angle: angle + local * 4,
      stretch: 1,
      color: index % 4 === 0 ? ramp.mid : '#5f4d3d',
      alpha: 0.95,
      shape: 'chunk',
    });
  }

  const glow = clamp01((progress - 0.05) / 0.5);
  if (glow > 0 && glow < 1) {
    for (let index = 0; index < 8; index++) {
      const angle = random() * Math.PI * 2;
      const radius = base * (0.3 + random() * 0.9);
      particles.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius * 0.4 - base * 0.1,
        size: base * (0.5 + random() * 0.5),
        angle: 0,
        stretch: 1,
        color: ramp.mid,
        alpha: fadeInOut(glow, 0.3) * 0.6,
        shape: 'glow',
      });
    }
  }
}

/** ブレスの吹き付け。対象の周りで渦を巻いて散る。 */
function emitBreath(
  particles: EffectParticle[],
  random: () => number,
  progress: number,
  base: number,
  ramp: ColorRamp
): void {
  // この層は対象の上にある。届く前から出すと、吹き付ける前に燃えていることになる。
  if (progress < 0.12) return;

  const life = progress > 0.74 ? 1 - (progress - 0.74) / 0.26 : 1;

  // 当たった面で割れて外へ噴き散る。ゆっくり漂わせると、そよ風に見えてしまう。
  for (let index = 0; index < 38; index++) {
    const phase = random();
    const angle = random() * Math.PI * 2;
    const local = (progress * 4.2 + phase) % 1;
    const speed = 0.7 + random() * 0.6;
    const blast = base * (0.3 + easeOutQuad(local) * 2.6 * speed);
    particles.push({
      x: Math.cos(angle) * blast,
      y: Math.sin(angle) * blast * 0.55 - base * (0.25 + local * local * 1.7),
      size: base * (0.4 + random() * 0.45) * (1 - local * 0.3),
      angle,
      // 進む向きへ引き伸ばす。丸のままだと速さが読めない。
      stretch: 1.6 + local * 2.4,
      color: flameColor(local, ramp),
      alpha: life * (1 - local) * 0.8,
      shape: local < 0.5 ? 'streak' : 'glow',
    });
  }

  for (let index = 0; index < 10; index++) {
    const local = (progress * 1.6 + random()) % 1;
    particles.push({
      x: (random() - 0.5) * base * 2.6,
      y: -base * (0.9 + local * 2.4),
      size: base * (0.8 + local * 1.3),
      angle: 0,
      stretch: 1,
      color: '#2f2823',
      alpha: life * (1 - local) * 0.22,
      shape: 'smoke',
    });
  }
}

/** 障壁の粒。面に沿って走り、当たった所で弾ける。 */
function emitBarrier(
  particles: EffectParticle[],
  random: () => number,
  progress: number,
  base: number,
  ramp: ColorRamp
): void {
  const life = fadeInOut(progress, 0.18);
  if (life <= 0) return;

  for (let index = 0; index < 24; index++) {
    const phase = random();
    const angle = phase * Math.PI * 2 + progress * 3;
    const radius = base * 0.95;
    particles.push({
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius * 0.85 - base * 0.9,
      size: base * 0.13,
      angle: angle + Math.PI / 2,
      stretch: 2.4,
      color: index % 3 === 0 ? ramp.hot : ramp.mid,
      alpha: life * (0.5 + 0.5 * Math.sin(progress * 12 + phase * 9)) * 0.85,
      shape: 'streak',
    });
  }
}

/** 吸収される生命力。対象から吸い出される粒。 */
function emitDrain(
  particles: EffectParticle[],
  random: () => number,
  progress: number,
  base: number,
  ramp: ColorRamp
): void {
  const life = fadeInOut(progress, 0.2);
  if (life <= 0) return;

  for (let index = 0; index < 26; index++) {
    const phase = random();
    const angle = random() * Math.PI * 2;
    const local = (progress * 2 + phase) % 1;
    // 外から中心へ集める。逆向きにすると回復に見えてしまう。
    const radius = base * (1.5 - local * 1.3);
    particles.push({
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius * 0.55 - base * (0.3 + local * 0.9),
      size: base * (0.12 + random() * 0.08),
      angle: 0,
      stretch: 1,
      color: local > 0.6 ? ramp.hot : ramp.mid,
      alpha: life * fadeInOut(local, 0.2) * 0.9,
      shape: 'glow',
    });
  }
}

/** 転移の粒。足元から巻き上がって消える。 */
function emitWarp(
  particles: EffectParticle[],
  random: () => number,
  progress: number,
  base: number,
  ramp: ColorRamp
): void {
  const life = fadeInOut(progress, 0.22);
  if (life <= 0) return;

  for (let index = 0; index < 34; index++) {
    const phase = random();
    const angle = random() * Math.PI * 2;
    const local = (progress * 1.7 + phase) % 1;
    const radius = base * (0.7 - local * 0.55);
    const spin = angle + local * 4;
    particles.push({
      x: Math.cos(spin) * radius,
      y: Math.sin(spin) * radius * 0.5 - base * (0.1 + easeOutQuad(local) * 2.6),
      size: base * (0.1 + random() * 0.1),
      angle: 0,
      stretch: 1,
      color: local < 0.5 ? ramp.hot : ramp.mid,
      alpha: life * fadeInOut(local, 0.25) * 0.95,
      shape: 'glow',
    });
  }
}

/** 重力に引かれる塵。外から中心へ落ちて潰れる。 */
function emitGravity(
  particles: EffectParticle[],
  random: () => number,
  progress: number,
  base: number,
  ramp: ColorRamp
): void {
  const life = fadeInOut(progress, 0.16);
  if (life <= 0) return;

  for (let index = 0; index < 28; index++) {
    const phase = random();
    const angle = random() * Math.PI * 2;
    const local = (progress * 1.6 + phase) % 1;
    const radius = base * (2 - easeOutQuad(local) * 1.9);
    particles.push({
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius * 0.5 - base * 0.5,
      size: base * (0.1 + random() * 0.1),
      angle,
      stretch: 2 + local * 3,
      color: local > 0.7 ? ramp.hot : ramp.cool,
      alpha: life * (0.3 + local * 0.7) * 0.9,
      shape: 'streak',
    });
  }

  for (let index = 0; index < 8; index++) {
    const angle = random() * Math.PI * 2;
    const local = (progress * 1.3 + random()) % 1;
    const radius = base * (1.6 - local * 1.4);
    particles.push({
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius * 0.5 - base * 0.4,
      size: base * (0.16 + random() * 0.16),
      angle: angle + local * 5,
      stretch: 1,
      color: '#5b5148',
      alpha: life * 0.85,
      shape: 'chunk',
    });
  }
}

/** 打撃。潰れた点から破片と土煙が真横へ跳ねる。 */
function emitBash(
  particles: EffectParticle[],
  random: () => number,
  progress: number,
  base: number,
  ramp: ColorRamp
): void {
  const flash = clamp01(progress / 0.1);
  if (flash < 1) {
    particles.push({
      x: 0,
      y: -base * 0.6,
      size: base * (1.4 + flash * 1.4),
      angle: 0,
      stretch: 1,
      color: ramp.hot,
      alpha: 1 - flash,
      shape: 'glow',
    });
  }

  // 横へ強く、上へは弱く。真上へ飛ぶと爆発に見えてしまう。
  for (let index = 0; index < 22; index++) {
    const angle = random() * Math.PI * 2;
    const speed = base * (1.4 + random() * 2);
    const local = clamp01(progress / 0.55);
    if (local <= 0 || local >= 1) continue;
    const travel = speed * (1 - Math.pow(1 - local, 2.6));
    particles.push({
      x: Math.cos(angle) * travel,
      y: -base * 0.6 + Math.sin(angle) * travel * 0.35 + base * 0.9 * local * local,
      size: base * 0.12 * (1 - local * 0.4),
      angle,
      stretch: 3.6 + local * 3,
      color: local < 0.4 ? ramp.hot : ramp.mid,
      alpha: (1 - local) * 0.95,
      shape: 'streak',
    });
  }

  for (let index = 0; index < 10; index++) {
    const angle = random() * Math.PI * 2;
    const local = clamp01((progress - random() * 0.15) / 0.8);
    if (local <= 0 || local >= 1) continue;
    const distance = base * (0.5 + random() * 1.6) * easeOutQuad(local);
    particles.push({
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance * 0.4 - base * (0.2 + local * 0.5),
      size: base * (0.6 + local * 1),
      angle: 0,
      stretch: 1,
      color: '#6b5f52',
      alpha: fadeInOut(local, 0.25) * 0.34,
      shape: 'smoke',
    });
  }

  for (let index = 0; index < 6; index++) {
    const angle = random() * Math.PI * 2;
    const local = clamp01(progress / 0.7);
    if (local <= 0 || local >= 1) continue;
    const distance = base * (0.6 + random() * 1.4) * easeOutQuad(local);
    particles.push({
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance * 0.4 - base * (0.4 + Math.sin(local * Math.PI) * 0.8),
      size: base * (0.14 + random() * 0.14),
      angle: angle + local * 6,
      stretch: 1,
      color: '#57503f',
      alpha: 0.9,
      shape: 'chunk',
    });
  }
}

/** レーザーの着弾。柱が当たり続けるので、火花も出続ける。 */
function emitBeam(
  particles: EffectParticle[],
  random: () => number,
  progress: number,
  base: number,
  ramp: ColorRamp
): void {
  // この層は対象の上にある。撃つ前は何も起きていないので、溜めのあいだは出さない。
  const fired = clamp01((progress - 0.28) / 0.72);
  if (fired < 0.09) return;

  const life = fired > 0.8 ? 1 - (fired - 0.8) / 0.2 : 1;

  // 刺さった点で砕けて跳ね返る火花。上へ強く散らして噴き返りに見せる。
  for (let index = 0; index < 40; index++) {
    const angle = random() * Math.PI * 2;
    const speed = base * (1.4 + random() * 2.6);
    const local = (progress * 3.8 + random()) % 1;
    const travel = speed * (1 - Math.pow(1 - local, 2.4));
    particles.push({
      x: Math.cos(angle) * travel,
      y: -base * 0.6 + Math.sin(angle) * travel * 0.55 - travel * 0.42,
      size: base * 0.15 * (1 - local * 0.4),
      angle,
      stretch: 3.4 + local * 4.5,
      color: local < 0.4 ? ramp.hot : ramp.mid,
      alpha: life * (1 - local) * 0.95,
      shape: 'streak',
    });
  }

  // 削れて弾ける破片。光だけだと重さが出ない。
  for (let index = 0; index < 12; index++) {
    const angle = random() * Math.PI * 2;
    const local = (progress * 2.4 + random()) % 1;
    const travel = base * (0.8 + random() * 2.2) * easeOutQuad(local);
    particles.push({
      x: Math.cos(angle) * travel,
      y: -base * 0.4 + Math.sin(angle) * travel * 0.5 - travel * 0.55 + base * local * local * 1.4,
      size: base * (0.1 + random() * 0.1),
      angle: angle + local * 6,
      stretch: 1,
      color: ramp.cool,
      alpha: life * (1 - local) * 0.8,
      shape: 'chunk',
    });
  }

  for (let index = 0; index < 12; index++) {
    const local = (progress * 1.6 + random()) % 1;
    particles.push({
      x: (random() - 0.5) * base * 2.4,
      y: -base * (0.4 + local * 2.6),
      size: base * (0.7 + local * 1.3),
      angle: 0,
      stretch: 1,
      color: '#2f2823',
      alpha: life * (1 - local) * 0.26,
      shape: 'smoke',
    });
  }
}

/** 炎の色。白熱から明色、暗色へ落として最後は煙色に寄せる。 */
function flameColor(local: number, ramp: ColorRamp): string {
  if (local < 0.2) return ramp.hot;
  if (local < 0.55) return ramp.mid;
  return ramp.cool;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), 1);
}

function easeOutQuad(value: number): number {
  const clamped = clamp01(value);
  return 1 - (1 - clamped) * (1 - clamped);
}

function fadeInOut(value: number, rise: number): number {
  const clamped = clamp01(value);
  if (clamped < rise) return clamped / rise;
  return 1 - (clamped - rise) / (1 - rise);
}

export function seededRandom(seed: number): () => number {
  let state = Math.floor(Math.abs(seed)) % 4294967296 || 1;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
