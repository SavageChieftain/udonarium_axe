import { TestBed } from '@angular/core/testing';
import { EffectFieldService } from '@axe/application/effect/effect-field.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { EffectPreset } from '@axe/domain/effect/effect-preset';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('EffectFieldService', () => {
  let service: EffectFieldService;
  let preset: EffectPreset;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...TEST_PROVIDERS] });
    service = TestBed.inject(EffectFieldService);

    preset = new EffectPreset();
    preset.name = '毒沼';
    preset.kind = 'miasma';
    preset.durationMs = 1000;
    preset.initialize();
  });

  afterEach(() => {
    for (const object of ObjectStore.instance.getObjects()) ObjectStore.instance.delete(object, false);
    ObjectStore.instance.clearDeleteHistory();
  });

  it('置いた場を盤面に残すこと', () => {
    const field = service.place(preset, 100, 200, 0);

    expect(service.fields()).toEqual([field]);
    expect(service.presetOf(field)).toBe(preset);
    expect(field.isVisibleOnTable).toBe(true);
  });

  it('尺で折り返して繰り返すこと', () => {
    service.place(preset, 0, 0, 0);

    const early = service.renderables(100)[0];
    const wrapped = service.renderables(1100)[0];

    // 終わりが来ない演出なので、経過は尺の中へ畳んで返す。
    expect(early.elapsed).toBeLessThan(preset.duration);
    expect(wrapped.elapsed).toBeCloseTo(early.elapsed);
  });

  it('並べても同じ動きにならないこと', () => {
    service.place(preset, 0, 0, 0);
    service.place(preset, 100, 0, 0);

    const [first, second] = service.renderables(0);

    expect(first.elapsed).not.toBe(second.elapsed);
  });

  it('片づけたら消えること', () => {
    const field = service.place(preset, 0, 0, 0);

    service.remove(field);

    expect(service.fields()).toHaveLength(0);
    expect(service.renderables(0)).toHaveLength(0);
  });

  it('プリセットを消したら描かないこと', () => {
    service.place(preset, 0, 0, 0);
    ObjectStore.instance.remove(preset);

    expect(service.renderables(0)).toHaveLength(0);
  });

  it('視差効果を減らす設定では描かないこと', () => {
    service.place(preset, 0, 0, 0);
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({ matches: query.includes('reduce') })) as never;

    try {
      // 場は消えないので、描き続けると設定を無視したままになる。
      expect(service.renderables(0)).toHaveLength(0);
    } finally {
      window.matchMedia = original;
    }
  });
});
