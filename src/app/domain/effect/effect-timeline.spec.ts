import { EffectCast } from '@axe/domain/effect/effect-cast';
import { EFFECT_KINDS, EffectKind } from '@axe/domain/effect/effect-kind';
import { EffectPreset } from '@axe/domain/effect/effect-preset';
import {
  effectSprites,
  impactSoundTimes,
  isEffectFinished,
  launchSoundTimes,
  seededRandom,
  swingTiltOf,
} from '@axe/domain/effect/effect-timeline';

describe('effectSprites()', () => {
  interface PresetOverrides {
    staggerMs?: number;
    scale?: number;
  }

  function makePreset(kind: EffectKind, overrides: PresetOverrides = {}): EffectPreset {
    const preset = new EffectPreset('preset');
    preset.kind = kind;
    preset.durationMs = 1000;
    preset.staggerMs = overrides.staggerMs ?? 0;
    preset.scale = overrides.scale ?? 1;
    return preset;
  }

  function makeCast(targetCount = 1): EffectCast {
    return {
      presetIdentifier: 'preset',
      casterIdentifier: '',
      origin: null,
      seed: 7,
      targets: Array.from({ length: targetCount }, (_unused, index) => ({
        identifier: `char${index}`,
        x: index * 100,
        y: 0,
        z: 0,
      })),
    };
  }

  const options = { baseSize: 50 };

  it('再生前と再生後は何も描かないこと', () => {
    const preset = makePreset('burst');
    const cast = makeCast();

    expect(effectSprites(preset, cast, -1, options)).toHaveLength(0);
    expect(effectSprites(preset, cast, 1001, options)).toHaveLength(0);
  });

  it('再生中はどの種類でもスプライトを返すこと', () => {
    const cast = makeCast();

    // 終盤だけ canvas の粒子に任せる種類（きのこ雲の笠など）があるので、山場までを見る。
    for (const kind of EFFECT_KINDS) {
      for (const elapsed of [1, 300, 600]) {
        expect(effectSprites(makePreset(kind), cast, elapsed, options).length).toBeGreaterThan(0);
      }
    }
  });

  it('どの種類でも経過時間で粒子の位置が飛ばないこと', () => {
    const cast = makeCast();

    for (const kind of EFFECT_KINDS) {
      const preset = makePreset(kind);
      const before = effectSprites(preset, cast, 500, options);
      const after = effectSprites(preset, cast, 505, options);
      const shared = after.filter((sprite) => before.some((old) => old.key === sprite.key));

      for (const sprite of shared) {
        const old = before.find((candidate) => candidate.key === sprite.key)!;
        expect(Math.abs(sprite.x + sprite.offsetX - (old.x + old.offsetX))).toBeLessThan(options.baseSize);
        expect(Math.abs(sprite.y - old.y)).toBeLessThan(options.baseSize);
        expect(Math.abs(sprite.offsetY - old.offsetY)).toBeLessThan(options.baseSize);
      }
    }
  });

  it('CSS アニメーションを持つ部品は指定が毎フレーム変わらないこと', () => {
    const cast = makeCast();

    for (const kind of EFFECT_KINDS) {
      const preset = makePreset(kind);
      const before = effectSprites(preset, cast, 300, options).filter((sprite) => sprite.animation.length > 0);
      const after = effectSprites(preset, cast, 420, options);

      for (const sprite of before) {
        const later = after.find((candidate) => candidate.key === sprite.key);
        // 途中で animation 文字列が変わるとアニメーションが巻き戻る。
        if (later) expect(later.animation).toBe(sprite.animation);
      }
    }
  });

  it('SVG の中身は経過時間で変わらないこと', () => {
    const cast = makeCast();

    for (const kind of EFFECT_KINDS) {
      const preset = makePreset(kind);
      const before = effectSprites(preset, cast, 300, options).filter((sprite) => sprite.svg.length > 0);
      const after = effectSprites(preset, cast, 420, options);

      for (const sprite of before) {
        const later = after.find((candidate) => candidate.key === sprite.key);
        // 毎フレーム変わると innerHTML を組み直すことになり、CSS アニメーションも巻き戻る。
        if (later) expect(later.svg).toBe(sprite.svg);
      }
    }
  });

  it('稲妻を一本に繋がった折れ線として組むこと', () => {
    const sprites = effectSprites(makePreset('bolt'), makeCast(), 100, options);
    const channel = sprites.find((sprite) => sprite.key.endsWith('-channel'));

    expect(channel?.svg).toContain('<path');
    expect(channel?.svg.match(/M[\d.]+ [\d.]+/g)?.length).toBeGreaterThan(1);
    expect(channel?.animation).toContain('effectBoltStrike');
  });

  it('連射は弾が順に発射され、まとめて出ないこと', () => {
    const preset = makePreset('projectile');
    preset.projectileStyle = 'bullet';
    preset.shots = 6;
    const cast: EffectCast = { ...makeCast(), origin: { x: -400, y: 0, z: 0 } };
    const flyingAt = (elapsed: number) =>
      effectSprites(preset, cast, elapsed, options).filter((sprite) => sprite.key.endsWith('-shot')).length;

    // 弾は速いので、空中にあるのは常に 1〜2 発。撃ち終わるまで途切れない。
    expect(flyingAt(20)).toBe(1);
    expect(flyingAt(400)).toBeGreaterThan(0);
    // 終端では最後の 1 発が着弾する直前まで来ている。
    expect(flyingAt(999)).toBe(1);
  });

  it('連射は弾ごとに着弾すること', () => {
    const preset = makePreset('projectile');
    preset.shots = 5;
    const cast: EffectCast = { ...makeCast(), origin: { x: -400, y: 0, z: 0 } };
    const impacts = (elapsed: number) =>
      new Set(
        effectSprites(preset, cast, elapsed, options)
          .filter((sprite) => sprite.key.includes('-impact-'))
          .map((sprite) => sprite.key.split('-impact-')[0])
      ).size;

    expect(impacts(400)).toBeGreaterThan(0);
    expect(impacts(900)).toBeGreaterThan(impacts(400));
  });

  it('飛翔体が発射元から対象へ飛ぶこと', () => {
    const preset = makePreset('projectile');
    const cast: EffectCast = { ...makeCast(), origin: { x: -400, y: 0, z: 0 } };
    const headAt = (elapsed: number) =>
      effectSprites(preset, cast, elapsed, options).find((sprite) => sprite.key.endsWith('-core'))!;

    const early = headAt(60);
    const late = headAt(280);

    expect(early.x).toBeLessThan(0);
    expect(late.x).toBeGreaterThan(early.x);
    // 着弾点は対象。行き過ぎない。
    expect(late.x).toBeLessThanOrEqual(0);
  });

  it('飛翔体は着弾してから輪を出すこと', () => {
    const preset = makePreset('projectile');
    const cast: EffectCast = { ...makeCast(), origin: { x: -400, y: 0, z: 0 } };
    const impactAt = (elapsed: number) =>
      effectSprites(preset, cast, elapsed, options).some((sprite) => sprite.key.includes('-impact-'));

    expect(impactAt(150)).toBe(false);
    expect(impactAt(700)).toBe(true);
  });

  it('矢と銃弾は光らない実体として飛ぶこと', () => {
    const cast: EffectCast = { ...makeCast(), origin: { x: -400, y: -400, z: 0 } };

    for (const style of ['arrow', 'bullet']) {
      const preset = makePreset('projectile');
      preset.projectileStyle = style;
      const shot = effectSprites(preset, cast, 120, options).find((sprite) => sprite.key.endsWith('-shot'))!;

      expect(shot.svg).toContain('<svg');
      // カメラに正対させたうえで、画面上の進行方向へ回す。
      expect(shot.flat).toBe(false);
      expect(Number.isFinite(shot.rotate)).toBe(true);
      expect(shot.shadow).toBe('');
    }
  });

  it('飛翔体は進行方向へ引き伸ばした頭と、繋がった帯を持つこと', () => {
    const cast: EffectCast = { ...makeCast(), origin: { x: -400, y: 0, z: 0 } };
    const spritesFor = (style: string) => {
      const preset = makePreset('projectile');
      preset.projectileStyle = style;
      return effectSprites(preset, cast, 120, options);
    };

    const bolt = spritesFor('bolt');
    const streak = bolt.find((sprite) => sprite.key.endsWith('-streak'))!;
    // 頭は丸ではなく横長。止め絵でも速度が読める。
    expect(streak.width).toBeGreaterThan(streak.height * 2);
    expect(bolt.filter((sprite) => sprite.key.includes('-ribbon-')).length).toBeGreaterThan(3);

    // 帯の節はほぼ同じ向きを向く。バラバラだと軌跡が折れて見える。
    const angles = bolt.filter((sprite) => sprite.key.includes('-ribbon-')).map((sprite) => sprite.rotate);
    expect(Math.max(...angles) - Math.min(...angles)).toBeLessThan(6);

    expect(spritesFor('arrow').some((sprite) => sprite.key.endsWith('-shot'))).toBe(true);
  });

  it('電流は発射元から対象まで途切れず繋がること', () => {
    const preset = makePreset('arc');
    const cast: EffectCast = { ...makeCast(), origin: { x: -400, y: 0, z: 0 } };
    const cores = effectSprites(preset, cast, 100, options).filter((sprite) => sprite.key.endsWith('-core'));

    expect(cores.length).toBeGreaterThan(5);

    // 節は発射元から対象へ順に並ぶ。奥行きが付くので途中のコマと正しく前後する。
    const xs = cores.map((sprite) => sprite.x);
    for (let index = 1; index < xs.length; index++) expect(xs[index]).toBeGreaterThan(xs[index - 1]);
    expect(xs[0]).toBeGreaterThan(-400);
    expect(xs[xs.length - 1]).toBeLessThan(0);
  });

  it('電流はジグザグに折れること', () => {
    const preset = makePreset('arc');
    const cast: EffectCast = { ...makeCast(), origin: { x: -400, y: 0, z: 0 } };
    const angles = effectSprites(preset, cast, 100, options)
      .filter((sprite) => sprite.key.endsWith('-core'))
      .map((sprite) => sprite.rotate);

    // 全部同じ角度だと、ただの直線になってしまう。
    expect(new Set(angles.map((angle) => Math.round(angle))).size).toBeGreaterThan(2);
  });

  it('電流は走り終わったら消えること', () => {
    const preset = makePreset('arc');
    const cast: EffectCast = { ...makeCast(), origin: { x: -400, y: 0, z: 0 } };

    expect(effectSprites(preset, cast, 800, options).some((sprite) => sprite.key.endsWith('-core'))).toBe(false);
  });

  it('着弾演出は属性ごとに差し替えられること', () => {
    const preset = makePreset('projectile');
    preset.impactKind = 'frost';
    const cast: EffectCast = { ...makeCast(), origin: { x: -400, y: 0, z: 0 } };

    const sprites = effectSprites(preset, cast, 700, options);

    expect(sprites.some((sprite) => sprite.key.includes('-impact-frost-ring'))).toBe(true);
  });

  it('発射元が無ければ斜め上から飛んでくること', () => {
    const sprites = effectSprites(makePreset('projectile'), makeCast(), 60, options);
    const head = sprites.find((sprite) => sprite.key.endsWith('-core'))!;

    expect(head.z).toBeGreaterThan(0);
  });

  it('スプライトのキーが重複しないこと', () => {
    const sprites = effectSprites(makePreset('burst'), makeCast(3), 300, options);
    const keys = new Set(sprites.map((sprite) => sprite.key));

    expect(keys.size).toBe(sprites.length);
  });

  it('ずらし時間ぶん後ろの対象の再生を遅らせること', () => {
    const preset = makePreset('burst', { staggerMs: 400 });
    const cast = makeCast(2);

    const early = effectSprites(preset, cast, 100, options);
    expect(early.every((sprite) => sprite.key.startsWith('0-'))).toBe(true);

    const late = effectSprites(preset, cast, 500, options);
    expect(late.some((sprite) => sprite.key.startsWith('1-'))).toBe(true);
  });

  it('隠されている対象を描かないこと', () => {
    const sprites = effectSprites(makePreset('burst'), makeCast(2), 300, {
      ...options,
      hiddenIdentifiers: new Set(['char0']),
    });

    expect(sprites.every((sprite) => sprite.key.startsWith('1-'))).toBe(true);
  });

  it('追従指定なら解決した現在位置に描くこと', () => {
    const sprites = effectSprites(makePreset('burst'), makeCast(), 100, {
      ...options,
      resolvePosition: () => ({ x: 640, y: 480, z: 0 }),
    });

    expect(sprites[0].x).toBe(640);
    expect(sprites[0].y).toBe(480);
  });

  it('追従しない指定なら発火時の座標に描くこと', () => {
    const preset = makePreset('burst');
    preset.followTarget = false;
    const sprites = effectSprites(preset, makeCast(), 100, {
      ...options,
      resolvePosition: () => ({ x: 640, y: 480, z: 0 }),
    });

    expect(sprites[0].x).toBe(0);
  });

  it('同じ種から同じ配置を作ること', () => {
    const preset = makePreset('burst');
    const first = effectSprites(preset, makeCast(), 400, options);
    const second = effectSprites(preset, makeCast(), 400, options);

    expect(first).toEqual(second);
  });

  it('衝撃波の輪は盤面に寝かせて描くこと', () => {
    const sprites = effectSprites(makePreset('impact'), makeCast(), 200, options);
    const shocks = sprites.filter((sprite) => sprite.key.includes('-shock-'));

    expect(shocks.length).toBeGreaterThan(0);
    expect(shocks.every((sprite) => sprite.flat)).toBe(true);
  });

  describe('極太ビーム', () => {
    const beamCast: EffectCast = {
      presetIdentifier: 'preset',
      casterIdentifier: 'caster',
      origin: { x: -600, y: 0, z: 0 },
      seed: 7,
      targets: [{ identifier: 'char0', x: 0, y: 0, z: 0 }],
    };

    function beamAt(elapsed: number) {
      return effectSprites(makePreset('beam'), beamCast, elapsed, options);
    }

    function segmentsAt(elapsed: number) {
      return beamAt(elapsed).filter((sprite) => /-beam-\d+-core$/.test(sprite.key));
    }

    it('溜めのあいだは柱を出さず、砲口で光を溜めること', () => {
      const charging = beamAt(150);

      expect(segmentsAt(150)).toHaveLength(0);
      expect(charging.some((sprite) => sprite.key.endsWith('-beam-charge'))).toBe(true);
    });

    it('撃つ直前に溜めた光を潰すこと', () => {
      const swollen = beamAt(200).find((sprite) => sprite.key.endsWith('-beam-charge'))!;
      const snapped = beamAt(275).find((sprite) => sprite.key.endsWith('-beam-charge'))!;

      // 膨らみきったところで一度小さくする。この溜めが無いと発射が唐突に見える。
      expect(snapped.width).toBeLessThan(swollen.width * 0.5);
    });

    it('柱を数珠つなぎにしないこと', () => {
      const segments = segmentsAt(600);
      expect(segments.length).toBeGreaterThan(1);

      for (const segment of segments) {
        // 区間ごとに端を丸めると、粒を並べたように見えてしまう。
        expect(segment.borderRadius).toBe('0');
      }
      for (let index = 1; index < segments.length; index++) {
        const step = Math.abs(segments[index].height - segments[index - 1].height);
        expect(step).toBeLessThan(segments[index - 1].height * 0.1);
      }
    });

    it('外へ向かって太く淡い層を重ねること', () => {
      const sprites = beamAt(600);
      const core = sprites.find((sprite) => sprite.key === '0-beam-5-core')!;
      const halo = sprites.find((sprite) => sprite.key === '0-beam-5-halo')!;

      expect(halo.height).toBeGreaterThan(core.height * 3);
      expect(halo.opacity).toBeLessThan(core.opacity);
    });

    it('撃ち終わりは根元から引き上がること', () => {
      const muzzleSide = (elapsed: number) =>
        segmentsAt(elapsed).filter((sprite) => sprite.x < beamCast.origin!.x / 2).length;

      expect(muzzleSide(600)).toBeGreaterThan(0);
      // 一様に薄くするのではなく、根元から順に消して力尽きたように見せる。
      expect(muzzleSide(960)).toBe(0);
      expect(segmentsAt(960).length).toBeGreaterThan(0);
    });

    it('着弾側に跳ね返りを出すこと', () => {
      const sprites = beamAt(600);

      expect(sprites.some((sprite) => sprite.key.endsWith('-beam-splash-0'))).toBe(true);
      expect(sprites.some((sprite) => sprite.key.endsWith('-beam-helix-0-0'))).toBe(true);
    });
  });

  describe('ブレス', () => {
    const breathCast: EffectCast = {
      presetIdentifier: 'preset',
      casterIdentifier: 'caster',
      origin: { x: -400, y: 0, z: 0 },
      seed: 7,
      targets: [{ identifier: 'char0', x: 0, y: 0, z: 0 }],
    };

    function breathAt(elapsed: number) {
      return effectSprites(makePreset('breath'), breathCast, elapsed, options);
    }

    function coneAt(elapsed: number) {
      return breathAt(elapsed).filter((sprite) => sprite.key.includes('-breath-cone-'));
    }

    it('円錐を 1 枚で描くこと', () => {
      const cone = coneAt(500);

      // 区間に割ると、区間ごとの太さと濃さの差が縦縞の継ぎ目になって出る。
      expect(cone).toHaveLength(3);
      for (const layer of cone) {
        expect(layer.svg.length).toBeGreaterThan(0);
        expect(layer.background).toBe('');
      }
    });

    it('層ごとに違う輪郭を重ねること', () => {
      const [haze, body, core] = coneAt(500);

      expect(haze.height).toBeGreaterThan(body.height);
      expect(body.height).toBeGreaterThan(core.height);
      expect(new Set(coneAt(500).map((layer) => layer.svg)).size).toBe(3);
    });

    it('吹き始めは先端まで届いていないこと', () => {
      expect(coneAt(60)[0].width).toBeLessThan(coneAt(500)[0].width);
    });

    it('吹き終わりは薄れながら散ること', () => {
      const sustained = coneAt(500)[0];
      const fading = coneAt(980)[0];

      expect(fading.opacity).toBeLessThan(sustained.opacity * 0.5);
      expect(fading.height).toBeGreaterThan(sustained.height);
    });

    it('尺が変わっても流れの速さを揃えること', () => {
      // 再生位置で回すと、尺の長いブレスほど中身がゆっくり動いて勢いが死ぬ。
      const shortPreset = makePreset('breath');
      shortPreset.durationMs = 1000;
      const longPreset = makePreset('breath');
      longPreset.durationMs = 3000;

      const streaksOf = (preset: EffectPreset, elapsed: number) =>
        effectSprites(preset, breathCast, elapsed, options)
          .filter((sprite) => sprite.key.includes('-breath-streak-'))
          .map((sprite) => [Math.round(sprite.x * 1000) || 0, Math.round(sprite.y * 1000) || 0]);

      // 同じ実時間には同じ位置まで流れているのが正しい。
      expect(streaksOf(shortPreset, 520)).toEqual(streaksOf(longPreset, 520));
      expect(streaksOf(shortPreset, 640)).toEqual(streaksOf(longPreset, 640));
      expect(streaksOf(shortPreset, 520)).not.toEqual(streaksOf(shortPreset, 640));
    });

    it('属性ごとに違う粒を道中へ散らすこと', () => {
      const moteAt = (tagName: string) => {
        const preset = makePreset('breath');
        preset.tagName = tagName;
        return effectSprites(preset, breathCast, 500, options).filter((sprite) => sprite.key.includes('-breath-mote-'));
      };

      // 形と色だけだと、どの属性でも同じ物が色違いで飛んでいるように見える。
      expect(moteAt('氷').some((mote) => mote.svg.length > 0)).toBe(true);
      expect(moteAt('雷').some((mote) => mote.svg.length > 0)).toBe(true);
      expect(moteAt('炎').every((mote) => mote.svg.length < 1)).toBe(true);
      expect(moteAt('風')[0].borderRadius).toBe('60% 0 60% 0');
      expect(moteAt('闇')[0].background).toContain('#120c18');
    });

    it('粒を出さない指定に従うこと', () => {
      const preset = makePreset('breath');
      preset.moteStyle = 'none';

      const sprites = effectSprites(preset, breathCast, 500, options);

      expect(sprites.some((sprite) => sprite.key.includes('-breath-mote-'))).toBe(false);
    });

    it('縁に渦と、当たった面の巻き返しを出すこと', () => {
      const sprites = breathAt(500);

      expect(sprites.some((sprite) => sprite.key.endsWith('-breath-lobe-0'))).toBe(true);
      expect(sprites.some((sprite) => sprite.key.endsWith('-breath-splash-0'))).toBe(true);
    });
  });

  it('吸収の膨らみを経路と直交させること', () => {
    // 発射元が対象の真上（画面の縦方向）にいる場合。
    const cast: EffectCast = {
      presetIdentifier: 'preset',
      casterIdentifier: 'caster',
      origin: { x: 0, y: -400, z: 0 },
      seed: 7,
      targets: [{ identifier: 'char0', x: 0, y: 0, z: 0 }],
    };
    const motes = effectSprites(makePreset('drain'), cast, 400, options).filter((sprite) =>
      /-drain-\d+$/.test(sprite.key)
    );

    // ワールドの y でずらすと、この向きでは経路に沿って前後するだけになる。
    expect(motes.some((mote) => Math.abs(mote.offsetX) > 1)).toBe(true);
  });

  describe('倒れる演出', () => {
    function defeatSprites(kind: EffectKind, elapsed: number, image = 'blob:token') {
      return effectSprites(makePreset(kind), makeCast(), elapsed, { ...options, resolveImage: () => image });
    }

    it('崩壊はコマの絵を切り分けて散らすこと', () => {
      const pieces = defeatSprites('dissolve', 600).filter((sprite) => sprite.key.includes('-dissolve-piece-'));

      // 光の粒だけでは「消えた」にしかならない。絵そのものが割れている必要がある。
      expect(pieces.length).toBeGreaterThan(8);
      for (const piece of pieces) {
        expect(piece.background).toContain('blob:token');
        expect(piece.clipPath).toContain('inset(');
      }
      // 破片は同じ場所に留まらない。
      expect(new Set(pieces.map((piece) => `${piece.offsetX}/${piece.offsetY}`)).size).toBe(pieces.length);
    });

    it('絵の無いコマでも光の欠片で崩れること', () => {
      const sprites = defeatSprites('dissolve', 600, '');

      expect(sprites.some((sprite) => sprite.key.includes('-dissolve-piece-'))).toBe(false);
      expect(sprites.some((sprite) => sprite.key.includes('-dissolve-shard-'))).toBe(true);
    });

    it('両断はコマを 2 枚に分けてずらすこと', () => {
      const halves = defeatSprites('bisect', 700).filter((sprite) => /-bisect-(upper|lower)$/.test(sprite.key));

      expect(halves).toHaveLength(2);
      expect(halves[0].clipPath).toContain('polygon(');
      // 互いに逆へ滑る。
      expect(Math.sign(halves[0].offsetX)).not.toBe(Math.sign(halves[1].offsetX));
    });

    it('両断は斬り口から血が噴くこと', () => {
      const sprites = defeatSprites('bisect', 700);

      expect(sprites.some((sprite) => sprite.key.includes('-bisect-gush-'))).toBe(true);
      expect(sprites.some((sprite) => sprite.key.endsWith('-bisect-seam'))).toBe(true);
    });

    it('血しぶきは脈打って噴き出すこと', () => {
      const early = defeatSprites('gore', 120).filter((sprite) => sprite.key.includes('-gore-jet-')).length;
      const later = defeatSprites('gore', 420).filter((sprite) => sprite.key.includes('-gore-jet-')).length;

      // 一度で終わらず、心拍で突き上げる。
      expect(later).toBeGreaterThan(early);
    });

    it('血の跡を真円のにじみにしないこと', () => {
      const stains = defeatSprites('gore', 600).filter((sprite) => sprite.key.includes('-gore-stain-'));

      expect(stains.length).toBeGreaterThan(4);
      expect(new Set(stains.map((stain) => Math.round(stain.width))).size).toBeGreaterThan(1);
    });
  });

  it('縦に伸ばす演出を足元へ揃えること', () => {
    const column = effectSprites(makePreset('warp'), makeCast(), 300, options).find((sprite) =>
      sprite.key.endsWith('-warp-column')
    )!;

    // ワールドの z で持ち上げると、盤面を傾けたぶん足元の陣とずれる。
    // 板ポリ面内で持ち上げ、柱の下端が対象の足元に来るようにする。
    expect(column.flat).toBe(false);
    expect(column.z).toBe(0);
    expect(column.offsetY).toBeCloseTo(-column.height / 2);
  });

  it('型ごとに太刀の手数が変わること', () => {
    const bladesFor = (style: string) => {
      const preset = makePreset('slash');
      preset.slashStyle = style;
      return effectSprites(preset, makeCast(), 300, options).filter((sprite) => sprite.key.includes('-blade-'));
    };

    // 連撃は 5 太刀、それ以外は一太刀。等級ではなく型で決まる。
    expect(bladesFor('single')).toHaveLength(1);
    expect(bladesFor('combo')).toHaveLength(5);
    expect(bladesFor('iai')).toHaveLength(1);
    expect(bladesFor('wide')).toHaveLength(1);
    expect(bladesFor('heavy')).toHaveLength(1);
  });

  it('型ごとに太刀筋が違うこと', () => {
    const bladeFor = (style: string) => {
      const preset = makePreset('slash');
      preset.slashStyle = style;
      return effectSprites(preset, makeCast(), 600, options).find((sprite) => sprite.key.endsWith('-blade-0'))!;
    };

    // 薙ぎ払いは横へ、唐竹割りは縦へ。使い回しだと同じ値になる。
    expect(Math.abs(bladeFor('wide').rotate)).toBeLessThan(30);
    expect(Math.abs(bladeFor('heavy').rotate)).toBeGreaterThan(60);
    // 居合は最も細く長い。
    expect(bladeFor('iai').width).toBeGreaterThan(bladeFor('heavy').width);
    expect(bladeFor('iai').height).toBeLessThan(bladeFor('heavy').height);
  });

  it('居合は溜めのあいだ斬らず、一瞬で閃くこと', () => {
    const preset = makePreset('slash');
    preset.slashStyle = 'iai';
    const keysAt = (elapsed: number) => effectSprites(preset, makeCast(), elapsed, options).map((sprite) => sprite.key);

    // 前半は鞘元の光だけ。斬るのは一瞬で、地面は割らない。
    expect(keysAt(300).some((key) => key.includes('-iai-glint'))).toBe(true);
    expect(keysAt(300).some((key) => key.includes('-flare-'))).toBe(false);
    expect(keysAt(580).some((key) => key.includes('-flare-'))).toBe(true);
    expect(keysAt(900).some((key) => key.includes('-cut'))).toBe(true);
    expect(keysAt(900).some((key) => key.includes('-slash-crack'))).toBe(false);
  });

  it('唐竹割りは地面を一本に割ること', () => {
    const preset = makePreset('slash');
    preset.slashStyle = 'heavy';
    const keys = effectSprites(preset, makeCast(), 900, options).map((sprite) => sprite.key);

    expect(keys.some((key) => key.includes('-slash-split'))).toBe(true);
    expect(keys.some((key) => key.includes('-slash-crack'))).toBe(false);
  });

  it('打撃は星形と集中線で当たった瞬間を作ること', () => {
    const preset = makePreset('bash');
    const keysAt = (elapsed: number) => effectSprites(preset, makeCast(), elapsed, options).map((s) => s.key);

    // 当たった瞬間に白飛び・星・集中線が揃う。
    expect(keysAt(60).some((key) => key.includes('-bash-flash'))).toBe(true);
    expect(keysAt(200).some((key) => key.includes('-bash-star'))).toBe(true);
    expect(keysAt(200).some((key) => key.includes('-bash-lines'))).toBe(true);
    // 星は残さず、輪だけが広がって終わる。
    expect(keysAt(700).some((key) => key.includes('-bash-star'))).toBe(false);
    expect(keysAt(700).some((key) => key.includes('-bash-shock'))).toBe(true);
  });

  it('力任せの型は溜めてから斬り、斬り口が残ること', () => {
    const preset = makePreset('slash');
    preset.slashStyle = 'wide';
    const at = (elapsed: number) => effectSprites(preset, makeCast(), elapsed, options).map((sprite) => sprite.key);

    // 溜め → 斬撃 → 余韻。
    expect(at(150).some((key) => key.includes('-charge'))).toBe(true);
    expect(at(150).some((key) => key.includes('-cut'))).toBe(false);
    expect(at(900).some((key) => key.includes('-cut'))).toBe(true);
    expect(at(900).some((key) => key.includes('-slash-shock'))).toBe(true);
    expect(at(900).some((key) => key.includes('-slash-crack'))).toBe(true);
  });

  it('連撃は 1 太刀ずつ間を空けて出ること', () => {
    const preset = makePreset('slash');
    preset.slashStyle = 'combo';
    const blades = effectSprites(preset, makeCast(), 300, options).filter((sprite) => sprite.key.includes('-blade-'));
    const delays = blades.map((blade) => Number(blade.animation.match(/([\d.]+)ms both/)?.[1] ?? -1));

    // 同時に出ると 1 回斬ったようにしか見えない。
    expect(new Set(delays).size).toBe(delays.length);
    for (let index = 1; index < delays.length; index++) expect(delays[index]).toBeGreaterThan(delays[index - 1]);
  });

  it('連撃は太刀ごとに角度と位置を変えること', () => {
    const preset = makePreset('slash');
    preset.slashStyle = 'combo';
    const blades = effectSprites(preset, makeCast(), 300, options).filter((sprite) => sprite.key.includes('-blade-'));

    expect(new Set(blades.map((blade) => blade.rotate)).size).toBe(blades.length);
    expect(new Set(blades.map((blade) => blade.offsetX)).size).toBeGreaterThan(1);
  });

  it('斬撃はカメラに正対させて描くこと', () => {
    const sprites = effectSprites(makePreset('slash'), makeCast(), 200, options);

    expect(sprites.every((sprite) => !sprite.flat)).toBe(true);
  });

  it('倍率を上げるとスプライトも大きくなること', () => {
    const normal = effectSprites(makePreset('burst'), makeCast(), 300, options);
    const large = effectSprites(makePreset('burst', { scale: 2 }), makeCast(), 300, options);

    expect(large[0].width).toBeCloseTo(normal[0].width * 2);
  });
});

describe('impactSoundTimes()', () => {
  function makePreset(kind: EffectKind, duration: number): EffectPreset {
    const preset = new EffectPreset('preset');
    preset.kind = kind;
    preset.durationMs = duration;
    preset.impactSoundIdentifier = 'se-impact';
    return preset;
  }

  it('着弾音が無ければ鳴らさないこと', () => {
    const preset = makePreset('projectile', 1000);
    preset.impactSoundIdentifier = '';

    expect(impactSoundTimes(preset)).toEqual([]);
  });

  it('単発は着弾の 1 回だけ鳴らすこと', () => {
    expect(impactSoundTimes(makePreset('projectile', 1000))).toEqual([340]);
  });

  it('弾速は尺ではなく実時間で決まること', () => {
    const quick = makePreset('projectile', 800);
    const long = makePreset('projectile', 4000);

    // 尺が 5 倍でも、着弾までの実時間は変わらない。
    expect(impactSoundTimes(quick)[0]).toBe(impactSoundTimes(long)[0]);
  });

  it('連射は指定した間隔で撃ち切ること', () => {
    const preset = makePreset('projectile', 3000);
    preset.projectileStyle = 'bullet';
    preset.shots = 10;
    preset.shotInterval = 90;
    const times = impactSoundTimes(preset);

    // 90ms 刻みで 10 発。尺が 3 秒でも、撃ち終わりは 1 秒足らず。
    expect(times).toHaveLength(10);
    expect(times[1] - times[0]).toBe(90);
    expect(times[times.length - 1]).toBeLessThan(1100);
  });

  it('間隔が尺に収まらなければ詰めること', () => {
    const preset = makePreset('projectile', 600);
    preset.projectileStyle = 'bullet';
    preset.shots = 10;
    preset.shotInterval = 400;
    const times = impactSoundTimes(preset);

    // 指定どおりだと尺からはみ出るので、収まるところまで詰める。
    expect(times[times.length - 1]).toBeLessThanOrEqual(600);
  });

  it('銃弾は魔法弾より速いこと', () => {
    const bolt = makePreset('projectile', 1000);
    const bullet = makePreset('projectile', 1000);
    bullet.projectileStyle = 'bullet';

    expect(impactSoundTimes(bullet)[0]).toBeLessThan(impactSoundTimes(bolt)[0]);
  });

  it('連射は弾ごとに鳴らすこと', () => {
    const preset = makePreset('projectile', 2000);
    preset.shots = 5;

    // 弾幕なのに着弾が 1 発では音が足りない。
    expect(impactSoundTimes(preset)).toHaveLength(5);
  });

  it('刻みが細かすぎるぶんは間引くこと', () => {
    const preset = makePreset('projectile', 600);
    preset.shots = 20;
    const times = impactSoundTimes(preset);

    // 同じ音が重なって潰し合わないよう、最短間隔を空ける。
    for (let index = 1; index < times.length; index++) {
      expect(times[index] - times[index - 1]).toBeGreaterThanOrEqual(70);
    }
    expect(times.length).toBeLessThan(20);
  });

  it('飛ばないものは 1 回だけ鳴らすこと', () => {
    expect(impactSoundTimes(makePreset('bash', 1000))).toHaveLength(1);
  });
});

describe('isEffectFinished()', () => {
  it('全対象の再生が終わってから完了とすること', () => {
    const preset = new EffectPreset('preset');
    preset.durationMs = 500;
    preset.staggerMs = 200;
    const cast: EffectCast = {
      presetIdentifier: 'preset',
      casterIdentifier: '',
      origin: null,
      seed: 0,
      targets: [
        { identifier: 'a', x: 0, y: 0, z: 0 },
        { identifier: 'b', x: 0, y: 0, z: 0 },
      ],
    };

    expect(isEffectFinished(preset, cast, 600)).toBe(false);
    expect(isEffectFinished(preset, cast, 700)).toBe(true);
  });
});

describe('seededRandom()', () => {
  it('同じ種から同じ列を返すこと', () => {
    const first = seededRandom(99);
    const second = seededRandom(99);

    expect([first(), first(), first()]).toEqual([second(), second(), second()]);
  });

  it('0 以上 1 未満を返すこと', () => {
    const random = seededRandom(0);

    for (let count = 0; count < 50; count++) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('launchSoundTimes()', () => {
  function preset(overrides: Partial<Record<string, unknown>> = {}): EffectPreset {
    const made = new EffectPreset('launch-sound-test');
    Object.assign(made, {
      kind: 'projectile',
      projectileStyle: 'blaster',
      durationMs: 1200,
      soundIdentifier: 'shot',
      impactSoundIdentifier: 'hit',
      shots: 1,
      shotInterval: 0,
      ...overrides,
    });
    return made;
  }

  it('弾ごとに鳴らすこと', () => {
    const times = launchSoundTimes(preset({ shots: 6, shotInterval: 110 }));

    expect(times).toHaveLength(6);
    expect(times[0]).toBe(0);
    expect(times.every((at, index) => index === 0 || at > times[index - 1])).toBe(true);
  });

  it('単発なら 1 回だけ鳴らすこと', () => {
    expect(launchSoundTimes(preset())).toEqual([0]);
  });

  it('詰まりすぎた発射は間引くこと', () => {
    const times = launchSoundTimes(preset({ shots: 40, shotInterval: 1, durationMs: 300 }));
    expect(times.length).toBeLessThan(40);
  });

  it('飛ばないものは撃ち始めに 1 回だけ鳴らすこと', () => {
    expect(launchSoundTimes(preset({ kind: 'raybeam' }))).toEqual([0]);
  });

  it('鳴らす音が無ければ何も返さないこと', () => {
    expect(launchSoundTimes(preset({ soundIdentifier: '' }))).toEqual([]);
  });
});

describe('まっすぐ飛ぶ弾の尾', () => {
  function shotSprites(style: string, elapsedMs: number) {
    const preset = new EffectPreset('trail-test');
    Object.assign(preset, {
      kind: 'projectile',
      projectileStyle: style,
      durationMs: 1000,
      shots: 1,
      shotInterval: 0,
      colorPrimary: '#ffffff',
      colorSecondary: '#ff0000',
    });
    const cast: EffectCast = {
      presetIdentifier: 'trail-test',
      casterIdentifier: '',
      origin: { x: -300, y: 0, z: 0 },
      seed: 3,
      targets: [{ identifier: 'char0', x: 300, y: 0, z: 0 }],
    };
    return effectSprites(preset, cast, elapsedMs, { baseSize: 50 });
  }

  it('銃弾・光線・曳光は尾を 1 本にすること', () => {
    for (const style of ['bullet', 'blaster', 'tracer']) {
      const keys = shotSprites(style, 60).map((sprite) => sprite.key);
      expect(keys.filter((key) => key.includes('-ribbon-'))).toHaveLength(0);
      expect(keys.filter((key) => key.includes('-trail')).length).toBeLessThanOrEqual(1);
    }
  });

  it('飛ぶ斬撃も尾を 1 本にすること', () => {
    const keys = shotSprites('crescent', 60).map((sprite) => sprite.key);
    expect(keys.filter((key) => key.includes('-ribbon-'))).toHaveLength(0);
  });

  /** 撃ち出しと的を結ぶ直線から、どれだけ持ち上がっているか。 */
  function riseAboveLine(style: string, elapsedMs: number): number {
    const shot = shotSprites(style, elapsedMs).find((sprite) => sprite.key.includes('-shot'));
    if (!shot) return Number.NaN;
    const along = (shot.x - -300) / 600;
    return shot.z - 30 * along;
  }

  it('刃と光り物はまっすぐ飛ぶこと', () => {
    for (const style of ['crescent', 'blaster', 'tracer']) {
      expect(riseAboveLine(style, 40)).toBeCloseTo(0, 6);
    }
  });

  it('矢は山なりに飛ぶこと', () => {
    expect(riseAboveLine('arrow', 130)).toBeGreaterThan(1);
  });

  it('魔法弾は今までどおり粒を連ねること', () => {
    const keys = shotSprites('bolt', 160).map((sprite) => sprite.key);
    expect(keys.filter((key) => key.includes('-ribbon-')).length).toBeGreaterThan(1);
  });
});

describe('光の大剣', () => {
  function bladeSprites(elapsedMs: number) {
    const preset = new EffectPreset('excalibur-test');
    Object.assign(preset, { kind: 'skyblade', durationMs: 3000, colorPrimary: '#fff', colorSecondary: '#fa0' });
    const cast: EffectCast = {
      presetIdentifier: 'excalibur-test',
      casterIdentifier: 'caster',
      origin: { x: -400, y: 0, z: 0 },
      seed: 5,
      targets: [{ identifier: 'char0', x: 400, y: 0, z: 0 }],
    };
    return effectSprites(preset, cast, elapsedMs, { baseSize: 50 });
  }

  function blade(elapsedMs: number) {
    return bladeSprites(elapsedMs).find((sprite) => sprite.key.endsWith('-excalibur-blade-2'));
  }

  it('まず足元から光が立ち上ること', () => {
    const rising = bladeSprites(300).filter((sprite) => sprite.key.includes('-excalibur-rise-'));

    expect(rising.length).toBeGreaterThan(1);
    expect(rising.every((sprite) => sprite.x === -400)).toBe(true);
    expect(rising.some((sprite) => sprite.offsetY < 0)).toBe(true);
  });

  it('刃が伸び切ってから振り下ろされること', () => {
    const forming = blade(900)!;
    const formed = blade(1450)!;

    expect(formed.height).toBeGreaterThan(forming.height);
    expect(formed.rotate).toBeCloseTo(0, 5);
  });

  it('振り下ろしても根元が撃ち手の足元から動かないこと', () => {
    const rootOf = (sprite: { offsetX: number; offsetY: number; height: number; rotate: number }) => {
      const radians = (sprite.rotate * Math.PI) / 180;
      return {
        x: sprite.offsetX - (sprite.height / 2) * Math.sin(radians),
        y: sprite.offsetY + (sprite.height / 2) * Math.cos(radians),
      };
    };

    const standing = rootOf(blade(1450)!);
    const swung = rootOf(blade(2000)!);

    expect(swung.x).toBeCloseTo(standing.x, 5);
    expect(swung.y).toBeCloseTo(standing.y, 5);
  });

  it('振り切ったら対象の側が光ること', () => {
    const flash = bladeSprites(2400).find((sprite) => sprite.key.includes('-excalibur-burst'));

    expect(flash).toBeDefined();
    expect(flash!.x).toBe(400);
  });

  it('立ち上っているうちは弾けないこと', () => {
    expect(bladeSprites(300).filter((sprite) => sprite.key.includes('-excalibur-burst'))).toHaveLength(0);
  });
});

describe('swingTiltOf()', () => {
  it('どの向きでも盤面の下をくぐらないこと', () => {
    for (let heading = -360; heading <= 360; heading += 5) {
      expect(Math.abs(swingTiltOf(heading))).toBeLessThanOrEqual(100);
    }
  });

  it('撃ち手が対象より上にいても真下を向かないこと', () => {
    expect(Math.abs(swingTiltOf(90))).toBeLessThan(180);
    expect(Math.abs(swingTiltOf(95))).toBeLessThan(180);
    expect(Math.abs(swingTiltOf(-95))).toBeLessThan(180);
  });

  it('横に並んでいるなら水平まで振ること', () => {
    expect(swingTiltOf(0)).toBeCloseTo(90, 5);
    expect(swingTiltOf(180)).toBeCloseTo(-90, 5);
  });

  it('近いほうへ回すこと', () => {
    expect(swingTiltOf(-90)).toBeCloseTo(0, 5);
  });
});

describe('ミサイル', () => {
  function missileSprites(style: string, elapsedMs: number) {
    const preset = new EffectPreset('missile-test');
    Object.assign(preset, {
      kind: 'projectile',
      projectileStyle: style,
      durationMs: 2000,
      shots: 4,
      shotInterval: 130,
      colorPrimary: '#ffffff',
      colorSecondary: '#ff6a2b',
    });
    const cast: EffectCast = {
      presetIdentifier: 'missile-test',
      casterIdentifier: '',
      origin: { x: -300, y: 0, z: 0 },
      seed: 11,
      targets: [{ identifier: 'char0', x: 300, y: 0, z: 0 }],
    };
    return effectSprites(preset, cast, elapsedMs, { baseSize: 50 });
  }

  /** 撃ち出しと的を結ぶ直線から、横へどれだけ外れているか。 */
  function sideOffset(style: string, elapsedMs: number, shot: number): number {
    const head = missileSprites(style, elapsedMs).find((sprite) => sprite.key === `0-s${shot}-shot`);
    return head ? head.y : Number.NaN;
  }

  it('弾ごとに違う側へ膨らんでから食い付くこと', () => {
    const first = sideOffset('missile', 300, 0);
    const second = sideOffset('missile', 300, 1);

    expect(Math.abs(first)).toBeGreaterThan(1);
    expect(Math.sign(first)).not.toBe(Math.sign(second));
  });

  it('誘導弾はミサイルより大きく回り込むこと', () => {
    const missile = Math.abs(sideOffset('missile', 300, 0));
    const cruise = Math.abs(sideOffset('cruise', 300, 0));

    expect(cruise).toBeGreaterThan(missile);
  });

  it('着弾する頃には的へ戻ってくること', () => {
    const middle = Math.abs(sideOffset('cruise', 450, 0));
    const arriving = Math.abs(sideOffset('cruise', 880, 0));

    expect(arriving).toBeLessThan(middle * 0.2);
  });

  it('後ろに推進炎を引くこと', () => {
    const thrust = missileSprites('missile', 300).find((sprite) => sprite.key === '0-s0-thrust');
    const head = missileSprites('missile', 300).find((sprite) => sprite.key === '0-s0-shot');

    expect(thrust).toBeDefined();
    expect(thrust!.x).toBeLessThan(head!.x);
  });

  it('推進炎が弾から離れないこと', () => {
    const gapAt = (elapsedMs: number) => {
      const sprites = missileSprites('missile', elapsedMs);
      const head = sprites.find((sprite) => sprite.key === '0-s0-shot')!;
      const thrust = sprites.find((sprite) => sprite.key === '0-s0-thrust')!;
      return Math.hypot(head.x - thrust.x, head.y - thrust.y, head.z - thrust.z);
    };

    // 弾の長さぶんだけ後ろ。飛ぶ速さで離れ方が変わると、置いていかれたように見える。
    expect(gapAt(300)).toBeCloseTo(gapAt(200), 5);
  });

  it('噴煙が経路に沿うこと', () => {
    const sprites = missileSprites('cruise', 300);
    const head = sprites.find((sprite) => sprite.key === '0-s0-shot')!;
    const smoke = sprites.filter((sprite) => sprite.key.startsWith('0-s0-smoke-'));

    // 弦 1 本で結ぶと、回り込んでいる間だけ弾と尾の向きがずれる。
    expect(smoke.length).toBeGreaterThan(3);
    expect(sprites.filter((sprite) => sprite.key.includes('-trail'))).toHaveLength(0);
    expect(Math.abs(smoke[0].rotate - head.rotate)).toBeLessThan(6);
  });
});

describe('アローレイン', () => {
  function rainSprites(elapsedMs: number) {
    const preset = new EffectPreset('rain-test');
    Object.assign(preset, {
      kind: 'arrowrain',
      durationMs: 2400,
      colorPrimary: '#ffffff',
      colorSecondary: '#8a6a3c',
    });
    const cast: EffectCast = {
      presetIdentifier: 'rain-test',
      casterIdentifier: '',
      origin: null,
      seed: 7,
      targets: [{ identifier: 'char0', x: 0, y: 0, z: 0 }],
    };
    return effectSprites(preset, cast, elapsedMs, { baseSize: 50 });
  }

  function keysAt(elapsedMs: number, part: string) {
    return rainSprites(elapsedMs).filter((sprite) => sprite.key.includes(part));
  }

  it('落ちてくる前に地面へ予告を出すこと', () => {
    expect(keysAt(30, '-rain-mark-').length).toBeGreaterThan(0);
    expect(keysAt(30, '-rain-arrow-')).toHaveLength(0);
  });

  it('矢が上から落ちてくること', () => {
    const early = keysAt(300, '-rain-arrow-');
    const late = keysAt(400, '-rain-arrow-');

    expect(early.length).toBeGreaterThan(0);
    expect(late.length).toBeGreaterThan(0);
    expect(Math.min(...late.map((sprite) => sprite.z))).toBeLessThan(Math.max(...early.map((sprite) => sprite.z)));
  });

  it('中心のまわりに散らして刺さること', () => {
    const stuck = keysAt(2000, '-rain-stuck-');

    expect(stuck.length).toBeGreaterThan(4);
    expect(new Set(stuck.map((sprite) => `${sprite.x},${sprite.y}`)).size).toBe(stuck.length);
    expect(stuck.every((sprite) => Math.hypot(sprite.x, sprite.y) <= 50 * 2.1)).toBe(true);
  });

  it('毎フレーム同じ場所へ落ちること', () => {
    const once = keysAt(800, '-rain-mark-').map((sprite) => `${sprite.x},${sprite.y}`);
    const twice = keysAt(800, '-rain-mark-').map((sprite) => `${sprite.x},${sprite.y}`);

    expect(once).toEqual(twice);
  });
});
