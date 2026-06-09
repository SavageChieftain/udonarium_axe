import { TestBed } from '@angular/core/testing';
import { ObjectSerializer } from '@axe/core/sync/object-serializer';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { LightSource } from '@axe/domain/tabletop/light-source';
import { LightAnimation, LightCategory, LightPreset } from '@axe/domain/tabletop/vision-types';

describe('LightSource', () => {
  let store: ObjectStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = ObjectStore.instance;
    store.getObjects().forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
  });

  afterEach(() => {
    store.getObjects().forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
    vi.clearAllMocks();
  });

  describe('create()', () => {
    it('名前を設定し ObjectStore に追加される', () => {
      const light = LightSource.create('松明');
      expect(light.name).toBe('松明');
      expect(store.get(light.identifier)).toBe(light);
    });

    it('aliasName が "light-source"', () => {
      const light = LightSource.create('test');
      expect(light.aliasName).toBe('light-source');
    });
  });

  describe('SyncVar デフォルト値', () => {
    it('基本の点灯した物理光源', () => {
      const light = LightSource.create('test');
      expect(light.lightEnabled).toBe(true);
      expect(light.lightPreset).toBe(LightPreset.CUSTOM);
      expect(light.lightBrightRadius).toBe(4);
      expect(light.lightDimRadius).toBe(8);
      expect(light.lightAngle).toBe(360);
      expect(light.lightAnimation).toBe(LightAnimation.NONE);
      expect(light.lightCategory).toBe(LightCategory.PHYSICAL);
      expect(light.lightIgnoreOcclusion).toBe(false);
      expect(light.lightRevealToAll).toBe(false);
      expect(light.lightCastShadows).toBe(true);
      expect(light.followingCharacterIdentifier).toBe('');
    });

    it('location のデフォルトが table（卓上に可視）', () => {
      const light = LightSource.create('test');
      expect(light.location.name).toBe('table');
      expect(light.isVisibleOnTable).toBe(true);
    });
  });

  describe('lightSpec getter', () => {
    it('フィールドから LightSpec を組み立てる', () => {
      const light = LightSource.create('test');
      light.lightBrightRadius = 2;
      light.lightDimRadius = 5;
      light.lightColor = '#abcdef';
      light.lightCategory = LightCategory.THEATRICAL;
      light.lightRevealToAll = true;
      const spec = light.lightSpec;
      expect(spec.brightRadius).toBe(2);
      expect(spec.dimRadius).toBe(5);
      expect(spec.color).toBe('#abcdef');
      expect(spec.category).toBe(LightCategory.THEATRICAL);
      expect(spec.revealToAll).toBe(true);
    });
  });

  describe('following()', () => {
    it('対象キャラの中心に光源を移動する', () => {
      const character = GameCharacter.create('対象', 2, '');
      character.location.x = 100;
      character.location.y = 200;
      const light = LightSource.create('追従光');
      light.gridSize = 50;
      light.followingCharacterIdentifier = character.identifier;

      light.following();

      expect(light.location.x).toBe(100 + (50 * 2) / 2);
      expect(light.location.y).toBe(200 + (50 * 2) / 2);
    });

    it('対象が存在しない場合は追従IDをクリアする', () => {
      const light = LightSource.create('test');
      light.followingCharacterIdentifier = 'missing-id';
      light.following();
      expect(light.followingCharacterIdentifier).toBe('');
    });
  });

  describe('XML 復元', () => {
    it('保存された @SyncVar 属性を型変換して復元する', () => {
      const xml = `<light-source owner="" isLock="false" lightEnabled="true" lightPreset="spotlight" lightBrightRadius="7" lightDimRadius="11" lightColor="#ff8800" lightAngle="30" lightAnimation="pulse" lightCategory="theatrical" lightIgnoreOcclusion="true" lightRevealToAll="true" lightCastShadows="true">
        <data name="light-source"><data name="common"><data name="name">保存光</data></data></data>
        </light-source>`;

      const restored = ObjectSerializer.instance.parseXml(xml) as LightSource;

      expect(restored).toBeInstanceOf(LightSource);
      expect(restored.name).toBe('保存光');
      expect(restored.lightPreset).toBe(LightPreset.SPOTLIGHT);
      expect(restored.lightBrightRadius).toBe(7);
      expect(restored.lightDimRadius).toBe(11);
      expect(restored.lightColor).toBe('#ff8800');
      expect(restored.lightAngle).toBe(30);
      expect(restored.lightAnimation).toBe(LightAnimation.PULSE);
      expect(restored.lightCategory).toBe(LightCategory.THEATRICAL);
      expect(restored.lightIgnoreOcclusion).toBe(true);
      expect(restored.lightRevealToAll).toBe(true);
      expect(restored.lightCastShadows).toBe(true);
    });
  });
});
