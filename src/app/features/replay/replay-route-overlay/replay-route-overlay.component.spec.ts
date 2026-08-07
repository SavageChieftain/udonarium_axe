import { buildSegments } from '@axe/features/replay/replay-route-overlay/replay-route-overlay.component';

const route = [
  { x: 0, y: 0, z: 0 },
  { x: 100, y: 0, z: 0 },
  { x: 100, y: 100, z: 0 },
];

describe('buildSegments()', () => {
  it('点をつなぐ線分に割ること', () => {
    const segments = buildSegments(route, 0);
    expect(segments).toHaveLength(2);
    expect(segments[0]).toMatchObject({ x: 0, y: 0, length: 100, angle: 0 });
    expect(segments[1]).toMatchObject({ x: 100, y: 0, length: 100, angle: 90 });
  });

  it('通り過ぎた線分に印を付けること', () => {
    const segments = buildSegments(route, 0.5);
    expect(segments[0].isTravelled).toBe(true);
    expect(segments[1].isTravelled).toBe(false);
  });

  it('進みきったら全部を通り過ぎた扱いにすること', () => {
    expect(buildSegments(route, 1).every((segment) => segment.isTravelled)).toBe(true);
  });

  it('始まる前は何も通り過ぎていないこと', () => {
    expect(buildSegments(route, 0).some((segment) => segment.isTravelled)).toBe(false);
  });

  it('長さのない線分を落とすこと', () => {
    const segments = buildSegments(
      [
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 0 },
        { x: 50, y: 0, z: 0 },
      ],
      0
    );
    expect(segments).toHaveLength(1);
  });

  it('点が足りなければ空を返すこと', () => {
    expect(buildSegments([{ x: 0, y: 0, z: 0 }], 0)).toEqual([]);
  });
});
