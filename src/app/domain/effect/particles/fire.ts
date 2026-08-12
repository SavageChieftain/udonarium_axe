import {
  clamp01,
  type ColorRamp,
  easeOutQuad,
  type EffectParticle,
  fadeInOut,
  flameColor,
} from '@axe/domain/effect/particles/shared';

/**
 * 燃えるもの。
 *
 * 炎・爆発・呑み込む炎・きのこ雲。白熱から煙へ落としていく。
 */

/** 立ち上る炎。根元が白熱し、上へ行くほど細く赤く、最後は煙になる。 */
export function emitFlame(
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
export function emitExplosion(
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
export function emitMushroom(
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
