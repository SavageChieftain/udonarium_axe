import { ObjectStore } from '@axe/core/sync/object-store';
import { EffectPreset } from '@axe/domain/effect/effect-preset';
import { EffectPresetSet } from '@axe/domain/effect/effect-preset-set';

describe('EffectPresetSet', () => {
  afterEach(() => {
    for (const preset of ObjectStore.instance.getObjects<EffectPreset>(EffectPreset)) {
      ObjectStore.instance.remove(preset);
    }
  });

  function makePreset(name: string): EffectPreset {
    const preset = new EffectPreset();
    preset.name = name;
    preset.initialize();
    return preset;
  }

  it('writes every effect there is out', () => {
    makePreset('爆炎');
    makePreset('斬撃');

    const xml = new EffectPresetSet().innerXml();

    expect(xml).toContain('爆炎');
    expect(xml).toContain('斬撃');
  });

  it('leaves the holder itself behind', () => {
    const set = new EffectPresetSet();
    set.initialize();

    // It need only exist across the export and the import, so it stays out of the room data.
    expect(ObjectStore.instance.get(set.identifier)).toBeNull();
  });

  it('adds what it reads', () => {
    makePreset('元からある');
    const xml = new EffectPresetSet().innerXml();
    const element = new DOMParser().parseFromString(
      `<effect-preset-set>${xml}</effect-preset-set>`,
      'text/xml'
    ).documentElement;
    for (const preset of ObjectStore.instance.getObjects<EffectPreset>(EffectPreset)) {
      ObjectStore.instance.remove(preset);
    }

    new EffectPresetSet().parseInnerXml(element);

    expect(ObjectStore.instance.getObjects<EffectPreset>(EffectPreset).map((preset) => preset.name)).toEqual([
      '元からある',
    ]);
  });

  function parse(xml: string): void {
    const element = new DOMParser().parseFromString(
      `<effect-preset-set>${xml}</effect-preset-set>`,
      'text/xml'
    ).documentElement;
    new EffectPresetSet().parseInnerXml(element);
  }

  function names(): string[] {
    return ObjectStore.instance
      .getObjects<EffectPreset>(EffectPreset)
      .map((preset) => preset.name)
      .sort();
  }

  describe('carrying one effect', () => {
    it('writes out the one it was given', () => {
      const chosen = makePreset('爆炎');
      makePreset('斬撃');

      const xml = EffectPresetSet.of([chosen]).innerXml();

      expect(xml).toContain('爆炎');
      expect(xml).not.toContain('斬撃');
    });

    it('writes out the whole shelf when it was given nothing', () => {
      makePreset('爆炎');
      makePreset('斬撃');

      const xml = new EffectPresetSet().innerXml();

      expect(xml).toContain('爆炎');
      expect(xml).toContain('斬撃');
    });
  });

  describe('reading them back into a shelf that is not empty', () => {
    it('leaves one of each name however often the same file is read', () => {
      // The identifier is not written into the file, so keying on it would add a copy every time.
      const xml = EffectPresetSet.of([makePreset('爆炎')]).innerXml();

      parse(xml);
      parse(xml);

      expect(names()).toEqual(['爆炎']);
    });

    it('lands on the effect of that name rather than beside it', () => {
      const source = makePreset('爆炎');
      source.colorPrimary = '#00ff00';
      source.durationMs = 1234;
      const xml = EffectPresetSet.of([source]).innerXml();
      source.destroy();
      const mine = makePreset('爆炎');
      mine.colorPrimary = '#ff0000';

      parse(xml);

      expect(names()).toEqual(['爆炎']);
      const [kept] = ObjectStore.instance.getObjects<EffectPreset>(EffectPreset);
      expect(kept.identifier).toBe(mine.identifier);
      expect(kept.colorPrimary).toBe('#00ff00');
      expect(kept.durationMs).toBe(1234);
    });

    it('adds one of a name the shelf does not have', () => {
      const xml = EffectPresetSet.of([makePreset('新しい演出')]).innerXml();
      for (const preset of ObjectStore.instance.getObjects<EffectPreset>(EffectPreset)) preset.destroy();
      ObjectStore.instance.clearDeleteHistory();
      makePreset('元からある');

      parse(xml);

      expect(names()).toEqual(['元からある', '新しい演出']);
    });

    it('leaves what was already there alone', () => {
      const xml = EffectPresetSet.of([makePreset('爆炎')]).innerXml();
      makePreset('斬撃');

      parse(xml);

      expect(names()).toContain('斬撃');
    });

    it('carries a run built of stages across whole', () => {
      const source = makePreset('多段');
      source.stages = JSON.stringify([
        { role: 'travel', kind: 'projectile', durationMs: 400 },
        { role: 'impact', kind: 'frost', durationMs: 300 },
      ]);
      const xml = EffectPresetSet.of([source]).innerXml();
      source.destroy();
      makePreset('多段');

      parse(xml);

      const [kept] = ObjectStore.instance.getObjects<EffectPreset>(EffectPreset);
      expect(kept.stageList.map((stage) => stage.kind)).toEqual(['projectile', 'frost']);
    });
  });

  describe('an effect handed on and handed back', () => {
    it('comes back as the effect it left as', () => {
      const source = makePreset('爆炎');
      const identifier = source.identifier;
      const xml = EffectPresetSet.of([source]).innerXml();
      source.name = '改名した爆炎';

      parse(xml);

      const presets = ObjectStore.instance.getObjects<EffectPreset>(EffectPreset);
      expect(presets).toHaveLength(1);
      expect(presets[0].identifier).toBe(identifier);
      expect(presets[0].name).toBe('爆炎');
    });

    it('lands on itself even where the name has moved on', () => {
      // Renaming it here does not make the one coming back a different effect, and the name
      // it left under, now answered to by something else, is not taken back off it.
      const mine = makePreset('わたしの演出');
      const identifier = mine.identifier;
      const xml = EffectPresetSet.of([mine]).innerXml();
      mine.name = '別の名前';
      const other = makePreset('わたしの演出');

      parse(xml);

      expect(ObjectStore.instance.getObjects<EffectPreset>(EffectPreset)).toHaveLength(2);
      expect(ObjectStore.instance.get<EffectPreset>(identifier)?.name).toBe('わたしの演出 (2)');
      expect(other.name).toBe('わたしの演出');
    });

    it('comes back once where it was thrown away here', () => {
      const gone = makePreset('捨てた演出');
      const identifier = gone.identifier;
      const xml = EffectPresetSet.of([gone]).innerXml();
      gone.destroy();

      parse(xml);

      const presets = ObjectStore.instance.getObjects<EffectPreset>(EffectPreset);
      expect(presets.map((preset) => preset.identifier)).toEqual([identifier]);
    });

    it('carries the identifier in what it writes', () => {
      const preset = makePreset('爆炎');

      expect(EffectPresetSet.of([preset]).innerXml()).toContain(preset.identifier);
    });
  });
});
