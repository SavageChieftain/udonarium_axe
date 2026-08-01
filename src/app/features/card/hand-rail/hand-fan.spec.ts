import {
  fitHandFanOptions,
  HAND_CARD_WIDTH_PX,
  HAND_FAN_MAX_STEP_PX,
  HAND_FAN_MIN_STEP_PX,
  HAND_FAN_VISIBLE_CARDS,
  HAND_RAIL_CHROME_PX,
  handFanDropIndex,
  handFanWidthPx,
  layoutHandFan,
} from '@axe/features/card/hand-rail/hand-fan';
import { describe, expect, it } from 'vitest';

describe('handFanWidthPx', () => {
  it('決め打ちの表示枚数ぶんの幅を返す', () => {
    expect(handFanWidthPx()).toBe(HAND_CARD_WIDTH_PX + HAND_FAN_MAX_STEP_PX * (HAND_FAN_VISIBLE_CARDS - 1));
  });

  it('枚数を指定すればその幅になる', () => {
    expect(handFanWidthPx({ cardWidthPx: 10, maxStepPx: 5, visibleCards: 3 })).toBe(20);
  });
});

describe('layoutHandFan', () => {
  const options = { cardWidthPx: 10, maxStepPx: 5, visibleCards: 3, spreadDeg: 20, arcPx: 8 };

  it('手札が無ければ何も配置しない', () => {
    expect(layoutHandFan(0, options)).toEqual([]);
  });

  it('1枚なら傾けず中央に置く', () => {
    expect(layoutHandFan(1, options)).toEqual([{ leftPx: 5, topPx: 0, rotateDeg: 0, zIndex: 0 }]);
  });

  it('端の札を外側へ傾け、弧を描いて下げる', () => {
    const layout = layoutHandFan(3, options);

    expect(layout.map((entry) => entry.rotateDeg)).toEqual([-10, 0, 10]);
    expect(layout.map((entry) => entry.topPx)).toEqual([8, 0, 8]);
  });

  it('決め打ちの幅に収まるよう間隔を詰める', () => {
    const width = handFanWidthPx(options);
    const layout = layoutHandFan(9, options);

    expect(layout).toHaveLength(9);
    expect(layout[0].leftPx).toBe(0);
    expect(layout[8].leftPx + options.cardWidthPx).toBeCloseTo(width);
  });

  it('少ない枚数では間隔を広げすぎず中央に寄せる', () => {
    const layout = layoutHandFan(2, options);

    expect(layout[1].leftPx - layout[0].leftPx).toBe(options.maxStepPx);
    expect(layout[0].leftPx).toBe(2.5);
  });

  it('手前の札ほど上に重なる', () => {
    expect(layoutHandFan(4, options).map((entry) => entry.zIndex)).toEqual([0, 1, 2, 3]);
  });
});

describe('handFanDropIndex', () => {
  const options = { cardWidthPx: 10, maxStepPx: 5, visibleCards: 3, spreadDeg: 20, arcPx: 8 };

  it('左端より手前なら先頭に差し込む', () => {
    expect(handFanDropIndex(0, 3, options)).toBe(0);
  });

  it('右端より奥なら末尾に差し込む', () => {
    expect(handFanDropIndex(999, 3, options)).toBe(3);
  });

  it('通過した札の枚数が差し込み位置になる', () => {
    expect(handFanDropIndex(6, 3, options)).toBe(1);
    expect(handFanDropIndex(11, 3, options)).toBe(2);
  });

  it('手札が無ければ先頭を返す', () => {
    expect(handFanDropIndex(50, 0, options)).toBe(0);
  });
});

describe('fitHandFanOptions', () => {
  it('広い画面では既定のまま', () => {
    expect(fitHandFanOptions(1200)).toEqual({});
  });

  it('狭い画面では扇の幅が収まるまで重ねる', () => {
    const options = fitHandFanOptions(390);
    expect(handFanWidthPx(options)).toBeLessThanOrEqual(390 - HAND_RAIL_CHROME_PX);
  });

  it('極端に狭くても最小の間隔は保つ', () => {
    const options = fitHandFanOptions(120);
    expect(options.maxStepPx).toBe(HAND_FAN_MIN_STEP_PX);
  });

  it('狭い画面でも札の並び順は保たれる', () => {
    const layout = layoutHandFan(8, fitHandFanOptions(390));
    const lefts = layout.map((entry) => entry.leftPx);
    expect([...lefts].sort((a, b) => a - b)).toEqual(lefts);
  });
});
