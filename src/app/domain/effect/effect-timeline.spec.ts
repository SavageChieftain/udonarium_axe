import { EffectCast } from '@axe/domain/effect/effect-cast';
import { EFFECT_KINDS, EffectKind } from '@axe/domain/effect/effect-kind';
import { EffectPreset } from '@axe/domain/effect/effect-preset';
import { effectSprites, impactSoundTimes, isEffectFinished, seededRandom } from '@axe/domain/effect/effect-timeline';

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

    function bodyAt(elapsed: number) {
      return breathAt(elapsed).filter((sprite) => /-breath-\d+-body$/.test(sprite.key));
    }

    it('口元から先へ広がる円錐にすること', () => {
      const body = bodyAt(500);
      expect(body.length).toBeGreaterThan(3);

      // 同じ丸を並べると数珠になるので、区間の端は丸めず太さで広がりを出す。
      for (const segment of body) expect(segment.borderRadius).toBe('0');
      for (let index = 1; index < body.length; index++) {
        expect(body[index].height).toBeGreaterThan(body[index - 1].height);
      }
    });

    it('吹き始めは先端まで届いていないこと', () => {
      expect(bodyAt(60).length).toBeLessThan(bodyAt(500).length);
    });

    it('息が切れると口元から消えること', () => {
      const mouthSide = (elapsed: number) =>
        bodyAt(elapsed).filter((sprite) => sprite.x < breathCast.origin!.x / 2).length;

      expect(mouthSide(500)).toBeGreaterThan(0);
      expect(mouthSide(980)).toBe(0);
      expect(bodyAt(980).length).toBeGreaterThan(0);
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
