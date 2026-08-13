import {
  type ScreenPoint,
  weatherDepthDirection,
  weatherMaskImage,
} from '@axe/features/tabletop/table-weather-overlay/weather-projection';

/** 盤面を天井の高さまでの箱として投影した 8 点。奥（上）が短く写る。 */
const BOX: ScreenPoint[] = [
  { x: 110, y: 300 },
  { x: 290, y: 300 },
  { x: 320, y: 380 },
  { x: 80, y: 380 },
  { x: 115, y: 120 },
  { x: 285, y: 120 },
  { x: 315, y: 200 },
  { x: 85, y: 200 },
];

describe('weatherMaskImage()', () => {
  it('ぼかしながら消すこと', () => {
    const mask = weatherMaskImage(BOX);

    // 多角形で切ると空中に直線の切り口が出て、ガラスの箱を被せたように見える。
    expect(mask).not.toContain('polygon');
    expect(mask).toMatch(/^radial-gradient\(/);
    expect(mask).toContain('transparent 100%');
  });

  it('盤面と上空をまとめて覆うこと', () => {
    const mask = weatherMaskImage(BOX);
    const [radiusX, radiusY] = [...mask.matchAll(/(-?[\d.]+)px/g)].map((match) => Number(match[1]));

    expect(radiusX).toBeGreaterThanOrEqual((320 - 80) / 2);
    expect(radiusY).toBeGreaterThanOrEqual((380 - 120) / 2);
  });

  it('薄れはじめを盤面の外へ出すこと', () => {
    // 内側で落としはじめると、その輪が板の上に丸く浮いて見える。
    const mask = weatherMaskImage(BOX);
    const [radiusX] = [...mask.matchAll(/(-?[\d.]+)px/g)].map((match) => Number(match[1]));
    const solid = Number(/#000 ([\d.]+)%/.exec(mask)![1]);

    expect((radiusX * solid) / 100).toBeGreaterThanOrEqual((320 - 80) / 2);
    // 一段で落とすと縁が輪として出る。途中を挟んで傾きを緩める。
    expect([...mask.matchAll(/rgba\(/g)].length).toBeGreaterThanOrEqual(2);
  });

  it('形が取れなければマスクを掛けないこと', () => {
    expect(weatherMaskImage([])).toBe('none');
    expect(weatherMaskImage([{ x: Number.NaN, y: 0 }])).toBe('none');
    expect(weatherMaskImage([{ x: 5, y: 5 }])).toBe('none');
  });
});

describe('weatherDepthDirection()', () => {
  it('奥から手前へ向かう角度を返すこと', () => {
    const direction = weatherDepthDirection(BOX.slice(0, 4));

    // 奥（画面の上）から手前（下）へ向かうので、真下 180deg のあたりを指す。
    expect(direction).toMatch(/deg$/);
    expect(Math.abs(Number(direction.replace('deg', '')))).toBeCloseTo(180, 0);
  });

  it('向きが決まらなければ真下へ塗ること', () => {
    expect(weatherDepthDirection([])).toBe('to bottom');
    expect(
      weatherDepthDirection([
        { x: 1, y: 1 },
        { x: 1, y: 1 },
        { x: 1, y: 1 },
        { x: 1, y: 1 },
      ])
    ).toBe('to bottom');
  });
});
