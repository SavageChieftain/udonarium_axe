import { ObjectStore } from '@axe/core/sync/object-store';
import {
  createDefaultEffectPresets,
  createEffectPreset,
  DEFAULT_EFFECT_PRESET_SEEDS,
} from '@axe/domain/effect/builtin-effect-presets';
import { EFFECT_KINDS } from '@axe/domain/effect/effect-kind';
import { EffectPreset } from '@axe/domain/effect/effect-preset';
import { PresetSound } from '@axe/domain/media/sound-effect';

describe('既定エフェクトプリセット', () => {
  it('内蔵アニメを 1 つ以上のプリセットで使い切ること', () => {
    const used = new Set(DEFAULT_EFFECT_PRESET_SEEDS.map((seed) => seed.kind));

    for (const kind of EFFECT_KINDS) expect(used.has(kind)).toBe(true);
  });

  it('同じ系統に初級から上級まで揃えること', () => {
    const gradesOf = (kinds: string[]) =>
      DEFAULT_EFFECT_PRESET_SEEDS.filter((seed) => kinds.includes(seed.kind))
        .map((seed) => seed.grade)
        .sort();

    for (const family of [
      ['flame', 'burst', 'nova', 'mushroom'],
      ['impact', 'rubble', 'upheaval'],
      ['bolt'],
      ['frost'],
      ['heal'],
      ['slash'],
    ]) {
      expect(new Set(gradesOf(family))).toEqual(new Set([1, 2, 3]));
    }
  });

  it('上級ほど大きいこと', () => {
    for (const kind of ['bolt', 'frost', 'heal', 'slash']) {
      // 同じ等級が複数あってもよいので、等級ごとの最大値どうしで比べる。
      const largestOf = (grade: number) =>
        Math.max(
          ...DEFAULT_EFFECT_PRESET_SEEDS.filter((seed) => seed.kind === kind && seed.grade === grade).map(
            (seed) => seed.scale
          )
        );

      expect(largestOf(2)).toBeGreaterThan(largestOf(1));
      expect(largestOf(3)).toBeGreaterThan(largestOf(2));
    }
  });

  it('演出の尺を音の長さに合わせること', () => {
    for (const seed of DEFAULT_EFFECT_PRESET_SEEDS) {
      const preset = createEffectPreset(seed);
      try {
        // 音より短く終わると、絵が消えたあとに音だけ残って間延びする。
        // 飛ぶものだけは弾が遅くなるので、明示した尺を使う。
        expect(preset.duration).toBe(Math.min(Math.max(seed.durationMs ?? seed.soundMs, 400), 6000));
      } finally {
        ObjectStore.instance.remove(preset);
      }
    }
  });

  it('飛ぶものは発射音と着弾音を分けること', () => {
    const flying = DEFAULT_EFFECT_PRESET_SEEDS.filter((seed) => seed.kind === 'projectile' || seed.kind === 'arc');

    expect(flying.length).toBeGreaterThan(0);
    for (const seed of flying) {
      // 発射だけだと当たった感じが出ず、着弾だけだと撃った感じが出ない。
      expect(seed.impactSoundKey).toBeDefined();
      expect(seed.durationMs).toBeDefined();
    }
  });

  it('炎の最上級をきのこ雲にすること', () => {
    const top = DEFAULT_EFFECT_PRESET_SEEDS.find((seed) => seed.kind === 'mushroom');

    expect(top?.name).toBe('業火');
    expect(top?.grade).toBe(3);
  });

  it('系統ごとに違う音を割り当てること', () => {
    const soundOf = (kind: string) =>
      new Set(DEFAULT_EFFECT_PRESET_SEEDS.filter((seed) => seed.kind === kind).map((seed) => seed.soundKey));

    // 氷と雷が同じ音だと、何が起きたか音で区別できない。
    expect([...soundOf('frost')].some((sound) => [...soundOf('bolt')].includes(sound))).toBe(false);
    expect(DEFAULT_EFFECT_PRESET_SEEDS.every((seed) => seed.soundKey.length > 0)).toBe(true);
  });

  it('固定 identifier を持ち重複しないこと', () => {
    const identifiers = DEFAULT_EFFECT_PRESET_SEEDS.map((seed) => seed.identifier);

    expect(new Set(identifiers).size).toBe(identifiers.length);
    expect(identifiers.every((identifier) => identifier.startsWith('EffectPreset_'))).toBe(true);
  });

  it('生成したプリセットを固定 identifier で登録し、SE を割り当てること', () => {
    PresetSound.slashSmall = 'se-slash-small';
    const created = createDefaultEffectPresets();

    try {
      expect(created.map((preset) => preset.identifier)).toEqual(
        DEFAULT_EFFECT_PRESET_SEEDS.map((seed) => seed.identifier)
      );
      const slash = ObjectStore.instance.get<EffectPreset>('EffectPreset_slash_1');
      expect(slash?.name).toBe('斬撃');
      expect(slash?.soundIdentifier).toBe('se-slash-small');
    } finally {
      for (const preset of created) ObjectStore.instance.remove(preset);
      PresetSound.slashSmall = '';
    }
  });
});
