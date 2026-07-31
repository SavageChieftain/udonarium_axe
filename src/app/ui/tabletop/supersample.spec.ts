import {
  SUPERSAMPLE_MAX_FACTOR,
  supersampleFactor,
  supersampleInsetPercent,
  supersampleOffsetPercent,
  supersampleTransform,
} from '@axe/ui/tabletop/supersample';
import { describe, expect, it } from 'vitest';

describe('supersampleFactor', () => {
  it('元画像がレイアウト箱と同等なら倍率を上げない', () => {
    expect(supersampleFactor(50, 50)).toBe(1);
    expect(supersampleFactor(99, 50)).toBe(1);
  });

  it('元画像の画素数が足りる分だけ倍率を上げる', () => {
    expect(supersampleFactor(100, 50)).toBe(2);
    expect(supersampleFactor(150, 50)).toBe(3);
  });

  it('倍率の上限を超えない', () => {
    expect(supersampleFactor(4000, 50)).toBe(SUPERSAMPLE_MAX_FACTOR);
  });

  it('テクスチャ辺の上限を超えない', () => {
    expect(supersampleFactor(4000, 200, 4, 512)).toBe(2);
  });

  it('不正な寸法では倍率を上げない', () => {
    expect(supersampleFactor(0, 50)).toBe(1);
    expect(supersampleFactor(1000, 0)).toBe(1);
    expect(supersampleFactor(Number.NaN, 50)).toBe(1);
    expect(supersampleFactor(1000, Number.POSITIVE_INFINITY)).toBe(1);
  });
});

describe('supersampleOffsetPercent', () => {
  it('倍率 1 ではずれが生じない', () => {
    expect(supersampleOffsetPercent(1)).toBe(0);
  });

  it('拡大した箱の中心と元の箱の中心のずれを箱サイズ比で返す', () => {
    expect(supersampleOffsetPercent(2)).toBe(25);
    expect(supersampleOffsetPercent(4)).toBe(37.5);
  });
});

describe('supersampleInsetPercent', () => {
  it('倍率 1 ではマージンを動かさない', () => {
    expect(supersampleInsetPercent(1)).toBe(0);
  });

  it('拡大した箱が元の箱と同心になる負マージンを包含ブロック幅比で返す', () => {
    expect(supersampleInsetPercent(2)).toBe(-50);
    expect(supersampleInsetPercent(4)).toBe(-150);
  });
});

describe('supersampleTransform', () => {
  it('倍率 1 では既存の変換をそのまま返す', () => {
    expect(
      supersampleTransform({ factor: 1, anchor: 'bottom', outer: 'translateX(-50%)', inner: 'rotateX(-50deg)' })
    ).toBe('translateX(-50%) rotateX(-50deg)');
  });

  it('高さを固定した親の中で下に伸びた箱を、縮小後に下端が揃うよう上へ戻す', () => {
    expect(
      supersampleTransform({ factor: 4, anchor: 'bottom', outer: 'translateX(-50%)', inner: 'rotateX(-50deg)' })
    ).toBe('translateX(-50%) translateY(-37.5%) rotateX(-50deg) scale(0.25)');
  });

  it('倍率 2 でも縮小後に下端が揃う', () => {
    expect(supersampleTransform({ factor: 2, anchor: 'bottom' })).toBe('translateY(-25%) scale(0.5)');
  });

  it('上端固定で下に伸びた箱は上へ戻す', () => {
    expect(supersampleTransform({ factor: 2, anchor: 'top', inner: 'rotateZ(10deg)' })).toBe(
      'translateY(-25%) rotateZ(10deg) scale(0.5)'
    );
  });

  it('同心に配置済みの箱は縮小だけ行う', () => {
    expect(supersampleTransform({ factor: 3, anchor: 'center' })).toBe('scale(0.333333)');
  });
});
