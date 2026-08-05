import { normalizeEffectCast } from '@axe/domain/effect/effect-cast';

describe('normalizeEffectCast()', () => {
  it('プリセットと対象が揃っていれば取り込むこと', () => {
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

  it('オブジェクトでなければ捨てること', () => {
    expect(normalizeEffectCast(null)).toBeNull();
    expect(normalizeEffectCast('cast')).toBeNull();
  });

  it('プリセット指定が無ければ捨てること', () => {
    expect(normalizeEffectCast({ targets: [{ x: 0, y: 0, z: 0 }] })).toBeNull();
  });

  it('対象が 1 つも無ければ捨てること', () => {
    expect(normalizeEffectCast({ presetIdentifier: 'preset', targets: [] })).toBeNull();
    expect(normalizeEffectCast({ presetIdentifier: 'preset', targets: ['broken'] })).toBeNull();
  });

  it('欠けた座標や種を 0 で埋めること', () => {
    expect(normalizeEffectCast({ presetIdentifier: 'preset', targets: [{ identifier: 'char' }] })).toEqual({
      presetIdentifier: 'preset',
      casterIdentifier: '',
      origin: null,
      targets: [{ identifier: 'char', x: 0, y: 0, z: 0 }],
      seed: 0,
    });

    // 発射元が壊れていても飛翔体が落ちないよう null に倒す。
    expect(normalizeEffectCast({ presetIdentifier: 'preset', origin: 'broken', targets: [{}] })?.origin).toBeNull();
  });

  it('対象が多すぎる場合は 32 体までに切り詰めること', () => {
    const targets = Array.from({ length: 40 }, (_unused, index) => ({ identifier: `char${index}`, x: 0, y: 0, z: 0 }));

    expect(normalizeEffectCast({ presetIdentifier: 'preset', targets })?.targets).toHaveLength(32);
  });
});
