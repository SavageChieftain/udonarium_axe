import {
  applyLightPreset,
  LIGHT_PRESETS,
  LightAnimation,
  LightCategory,
  LightPreset,
  lightSpecFromPreset,
  MutableLightFields,
  VisionType,
} from '@axe/domain/tabletop/vision-types';

describe('vision-types', () => {
  describe('VisionType enum', () => {
    it('5種の視界タイプを持つ', () => {
      expect(VisionType.NORMAL).toBe('normal');
      expect(VisionType.DARKVISION).toBe('darkvision');
      expect(VisionType.TRUESIGHT).toBe('truesight');
      expect(VisionType.BLIND).toBe('blind');
      expect(VisionType.THERMAL).toBe('thermal');
    });
  });

  describe('LIGHT_PRESETS', () => {
    it('CUSTOM 以外の全プリセットを定義する', () => {
      const keys = Object.keys(LIGHT_PRESETS);
      expect(keys).toContain(LightPreset.TORCH);
      expect(keys).toContain(LightPreset.SPOTLIGHT);
      expect(keys).not.toContain(LightPreset.CUSTOM);
    });

    it('spotlight は theatrical・遮蔽無視・全員可視・影あり', () => {
      const def = LIGHT_PRESETS[LightPreset.SPOTLIGHT];
      expect(def.category).toBe(LightCategory.THEATRICAL);
      expect(def.ignoreOcclusion).toBe(true);
      expect(def.revealToAll).toBe(true);
      expect(def.castShadows).toBe(true);
      expect(def.angle).toBeLessThan(360);
    });

    it('neon は NEON アニメーション', () => {
      expect(LIGHT_PRESETS[LightPreset.NEON].animation).toBe(LightAnimation.NEON);
    });

    it('flashlight はコーン（angle<360）', () => {
      expect(LIGHT_PRESETS[LightPreset.FLASHLIGHT].angle).toBeLessThan(360);
    });

    it('円錐プリセットは既定で下向きピッチ、球プリセットはピッチ0', () => {
      expect(LIGHT_PRESETS[LightPreset.FLASHLIGHT].pitch).toBe(-30);
      expect(LIGHT_PRESETS[LightPreset.SPOTLIGHT].pitch).toBe(-30);
      expect(LIGHT_PRESETS[LightPreset.TORCH].pitch).toBe(0);
    });
  });

  describe('lightSpecFromPreset()', () => {
    it('プリセット値を反映した LightSpec を返す', () => {
      const spec = lightSpecFromPreset(LightPreset.TORCH);
      const def = LIGHT_PRESETS[LightPreset.TORCH];
      expect(spec.preset).toBe(LightPreset.TORCH);
      expect(spec.brightRadius).toBe(def.brightRadius);
      expect(spec.dimRadius).toBe(def.dimRadius);
      expect(spec.enabled).toBe(true);
    });

    it('CUSTOM はプリセット既定を適用しない', () => {
      const spec = lightSpecFromPreset(LightPreset.CUSTOM);
      expect(spec.preset).toBe(LightPreset.CUSTOM);
      expect(spec.brightRadius).toBe(0);
      expect(spec.category).toBe(LightCategory.PHYSICAL);
    });

    it('overrides が最優先される', () => {
      const spec = lightSpecFromPreset(LightPreset.TORCH, { brightRadius: 99, color: '#123456' });
      expect(spec.brightRadius).toBe(99);
      expect(spec.color).toBe('#123456');
    });
  });

  describe('applyLightPreset()', () => {
    it('基本フィールドへプリセット値を書き込む', () => {
      const target: MutableLightFields = {
        lightPreset: LightPreset.CUSTOM,
        lightBrightRadius: 0,
        lightDimRadius: 0,
        lightColor: '#000000',
        lightAngle: 360,
        lightAnimation: LightAnimation.NONE,
      };
      applyLightPreset(target, LightPreset.LANTERN);
      const def = LIGHT_PRESETS[LightPreset.LANTERN];
      expect(target.lightPreset).toBe(LightPreset.LANTERN);
      expect(target.lightBrightRadius).toBe(def.brightRadius);
      expect(target.lightDimRadius).toBe(def.dimRadius);
      expect(target.lightColor).toBe(def.color);
    });

    it('上級フィールドを持つ対象にはそれらも書き込む', () => {
      const target: MutableLightFields = {
        lightPreset: LightPreset.CUSTOM,
        lightBrightRadius: 0,
        lightDimRadius: 0,
        lightColor: '#000000',
        lightAngle: 360,
        lightAnimation: LightAnimation.NONE,
        lightCategory: LightCategory.PHYSICAL,
        lightIgnoreOcclusion: false,
        lightRevealToAll: false,
        lightCastShadows: false,
      };
      applyLightPreset(target, LightPreset.SPOTLIGHT);
      expect(target.lightCategory).toBe(LightCategory.THEATRICAL);
      expect(target.lightIgnoreOcclusion).toBe(true);
      expect(target.lightRevealToAll).toBe(true);
      expect(target.lightCastShadows).toBe(true);
    });

    it('CUSTOM 指定では値を上書きしない', () => {
      const target: MutableLightFields = {
        lightPreset: LightPreset.TORCH,
        lightBrightRadius: 4,
        lightDimRadius: 8,
        lightColor: '#ffb36b',
        lightAngle: 360,
        lightAnimation: LightAnimation.FLICKER,
      };
      applyLightPreset(target, LightPreset.CUSTOM);
      expect(target.lightPreset).toBe(LightPreset.CUSTOM);
      expect(target.lightBrightRadius).toBe(4);
    });
  });
});
