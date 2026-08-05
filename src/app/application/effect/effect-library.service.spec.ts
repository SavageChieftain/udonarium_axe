import { TestBed } from '@angular/core/testing';
import { EffectLibraryService } from '@axe/application/effect/effect-library.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { DEFAULT_EFFECT_PRESET_SEEDS } from '@axe/domain/effect/builtin-effect-presets';
import { EffectPreset } from '@axe/domain/effect/effect-preset';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { PeerRole } from '@axe/domain/peer/peer-role';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('EffectLibraryService', () => {
  let service: EffectLibraryService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...TEST_PROVIDERS] });
    service = TestBed.inject(EffectLibraryService);
  });

  afterEach(() => {
    for (const preset of ObjectStore.instance.getObjects<EffectPreset>(EffectPreset)) {
      ObjectStore.instance.remove(preset);
    }
  });

  it('空なら既定を全部作ること', () => {
    const result = service.restoreDefaults();

    expect(result.added).toBe(DEFAULT_EFFECT_PRESET_SEEDS.length);
    expect(result.updated).toBe(0);
    expect(service.presets()).toHaveLength(DEFAULT_EFFECT_PRESET_SEEDS.length);
  });

  it('既にあるものは作り直さず値を入れ直すこと', () => {
    service.restoreDefaults();
    const seed = DEFAULT_EFFECT_PRESET_SEEDS[0];
    const preset = service.get(seed.identifier)!;
    preset.name = '書き換えた名前';
    preset.scale = 99;

    const result = service.restoreDefaults();

    // 固定 identifier のプリセットは入室時に作り直せないので、
    // ここで入れ直さないと古い値のまま取り残される。
    expect(result.added).toBe(0);
    expect(result.updated).toBe(DEFAULT_EFFECT_PRESET_SEEDS.length);
    expect(service.presets()).toHaveLength(DEFAULT_EFFECT_PRESET_SEEDS.length);
    expect(service.get(seed.identifier)?.name).toBe(seed.name);
    expect(service.get(seed.identifier)?.scale).toBe(seed.scale);
  });

  it('消されたものを作り直せること', () => {
    service.restoreDefaults();
    const seed = DEFAULT_EFFECT_PRESET_SEEDS[0];
    service.get(seed.identifier)!.destroy();

    const result = service.restoreDefaults();

    expect(result.added).toBe(1);
    expect(service.presets().some((preset) => preset.name === seed.name)).toBe(true);
  });

  it('白紙から作れること', () => {
    const preset = service.create('新しいエフェクト');

    expect(service.get(preset.identifier)).toBe(preset);
    expect(preset.name).toBe('新しいエフェクト');
  });

  it('複製で名前が重ならないこと', () => {
    const source = service.create('爆炎');
    source.scale = 2.5;
    source.kind = 'flame';

    const copy = service.duplicate(source);

    expect(copy.identifier).not.toBe(source.identifier);
    expect(copy.name).toBe('爆炎 (2)');
    expect(copy.kind).toBe('flame');
    expect(copy.scale).toBe(2.5);
    expect(service.duplicate(source).name).toBe('爆炎 (3)');
  });

  it('削除すると一覧から消えること', () => {
    const preset = service.create('消すもの');

    service.remove(preset);

    expect(service.get(preset.identifier)).toBeNull();
  });

  it('GM 専用は名前でも PL に渡さないこと', () => {
    PeerCursor.createMyCursor();
    PeerCursor.myCursor.role = PeerRole.Player;
    const secret = service.create('伏せ札の演出');
    secret.gmOnly = true;

    // 一覧に出さないだけでは、名前を知っていればチャット記法から撃ててしまう。
    expect(service.findByName('伏せ札の演出')).toBeNull();

    PeerCursor.myCursor.role = PeerRole.GameMaster;
    expect(service.findByName('伏せ札の演出')).toBe(secret);
  });
});
