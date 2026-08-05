import { DEFAULT_VIEW_ROTATION, projectDirection } from '@axe/domain/effect/effect-view';

describe('projectDirection()', () => {
  const flat = { x: 0, y: 0, z: 0 };

  it('回転が無ければ盤面の向きがそのまま画面の向きになること', () => {
    expect(projectDirection(100, 0, 0, flat)).toEqual({ angle: 0, length: 100 });
    expect(projectDirection(0, 100, 0, flat).angle).toBeCloseTo(90);
  });

  it('見下ろすと奥行き方向が縮むこと', () => {
    const away = projectDirection(0, 100, 0, { x: 60, y: 0, z: 0 });

    // 60 度傾けた盤面では、奥行き 100 は cos(60)=0.5 に潰れる。
    expect(away.length).toBeCloseTo(50);
  });

  it('高さ方向が画面の上向きになること', () => {
    const up = projectDirection(0, 0, 100, { x: 90, y: 0, z: 0 });

    expect(up.length).toBeCloseTo(100);
    expect(up.angle).toBeCloseTo(-90);
  });

  it('盤面を回すと画面上の角度も回ること', () => {
    expect(projectDirection(100, 0, 0, { x: 0, y: 0, z: 30 }).angle).toBeCloseTo(30);
  });

  it('長さが 0 なら角度を 0 にすること', () => {
    expect(projectDirection(0, 0, 0, null)).toEqual({ angle: 0, length: 0 });
  });

  it('指定が無ければ既定の見下ろし角を使うこと', () => {
    expect(projectDirection(0, 100, 0, null)).toEqual(projectDirection(0, 100, 0, DEFAULT_VIEW_ROTATION));
  });
});
