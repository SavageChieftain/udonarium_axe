import { normalizeEffectCast } from '@axe/domain/effect/effect-cast';

describe('normalizeEffectCast()', () => {
  it('takes a firing that has both an effect and a target', () => {
    expect(
      normalizeEffectCast({
        presetIdentifier: 'preset',
        casterIdentifier: 'caster',
        origin: { x: 1, y: 2, z: 3 },
        targets: [{ identifier: 'char', x: 10, y: 20, z: 5 }],
        seed: 42,
      })
    ).toEqual({
      presetIdentifier: 'preset',
      casterIdentifier: 'caster',
      origin: { x: 1, y: 2, z: 3 },
      targets: [{ identifier: 'char', x: 10, y: 20, z: 5 }],
      seed: 42,
    });
  });

  it('throws away anything that is not an object', () => {
    expect(normalizeEffectCast(null)).toBeNull();
    expect(normalizeEffectCast('cast')).toBeNull();
  });

  it('throws away one that names no effect', () => {
    expect(normalizeEffectCast({ targets: [{ x: 0, y: 0, z: 0 }] })).toBeNull();
  });

  it('throws away one with nothing to aim at', () => {
    expect(normalizeEffectCast({ presetIdentifier: 'preset', targets: [] })).toBeNull();
    expect(normalizeEffectCast({ presetIdentifier: 'preset', targets: ['broken'] })).toBeNull();
  });

  it('fills a missing position or seed in with nothing', () => {
    expect(normalizeEffectCast({ presetIdentifier: 'preset', targets: [{ identifier: 'char' }] })).toEqual({
      presetIdentifier: 'preset',
      casterIdentifier: '',
      origin: null,
      targets: [{ identifier: 'char', x: 0, y: 0, z: 0 }],
      seed: 0,
    });

    // A broken origin falls back to nothing, so the projectile does not fall over.
    expect(normalizeEffectCast({ presetIdentifier: 'preset', origin: 'broken', targets: [{}] })?.origin).toBeNull();
  });

  it('trims too many targets down to thirty-two', () => {
    const targets = Array.from({ length: 40 }, (_unused, index) => ({ identifier: `char${index}`, x: 0, y: 0, z: 0 }));

    expect(normalizeEffectCast({ presetIdentifier: 'preset', targets })?.targets).toHaveLength(32);
  });
});
