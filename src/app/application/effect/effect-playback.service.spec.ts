import { TestBed } from '@angular/core/testing';
import { EffectPlaybackService } from '@axe/application/effect/effect-playback.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { EffectPreset } from '@axe/domain/effect/effect-preset';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('EffectPlaybackService', () => {
  let service: EffectPlaybackService;
  let preset: EffectPreset;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...TEST_PROVIDERS] });
    service = TestBed.inject(EffectPlaybackService);

    preset = new EffectPreset();
    preset.durationMs = 600;
    ObjectStore.instance.add(preset, false);
  });

  afterEach(() => {
    ObjectStore.instance.remove(preset);
  });

  function cast(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      presetIdentifier: preset.identifier,
      targets: [{ identifier: 'char', x: 0, y: 0, z: 0 }],
      seed: 1,
      ...overrides,
    };
  }

  it('受け取った発火を再生中リストに積むこと', () => {
    expect(service.play(cast())).not.toBeNull();
    expect(service.activeCasts()).toHaveLength(1);
    expect(service.activeCasts()[0].preset).toBe(preset);
  });

  it('壊れた発火を無視すること', () => {
    expect(service.play(null)).toBeNull();
    expect(service.play({ targets: [] })).toBeNull();
    expect(service.activeCasts()).toHaveLength(0);
  });

  it('知らないプリセットの発火を無視すること', () => {
    expect(service.play(cast({ presetIdentifier: 'unknown' }))).toBeNull();
    expect(service.activeCasts()).toHaveLength(0);
  });

  it('同時再生数を 12 までに抑えること', () => {
    for (let count = 0; count < 20; count++) service.play(cast());

    expect(service.activeCasts()).toHaveLength(12);
  });

  it('衝撃のある演出だけ画面を揺らすこと', () => {
    preset.kind = 'burst';
    preset.grade = 3;
    service.play(cast());

    expect(service.shake()).toBe('hard');
  });

  it('回復では揺らさないこと', () => {
    preset.kind = 'heal';
    preset.grade = 3;
    service.play(cast());

    // 何が起きても揺れると、衝撃の意味が無くなる。
    expect(service.shake()).toBe('');
    expect(service.flash()).toBe('');
  });

  it('続けて撃たれたら強いほうを採ること', () => {
    preset.kind = 'burst';
    preset.grade = 2;
    service.play(cast());
    expect(service.shake()).toBe('soft');

    preset.grade = 3;
    service.play(cast());

    expect(service.shake()).toBe('hard');
  });
});
