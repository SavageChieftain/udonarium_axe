import {
  appendRoutePoint,
  buildReplayRoute,
  distanceBetween,
  easeInOut,
  pointAlongRoute,
  REPLAY_ROUTE_MAX_POINTS,
  type ReplayRoutePoint,
  routeLength,
  thinRoute,
  toRoutePoint,
} from '@axe/domain/replay/replay-route';

function point(x: number, y: number, z = 0): ReplayRoutePoint {
  return { x, y, z };
}

describe('toRoutePoint()', () => {
  it('欠けた座標を 0 として読むこと', () => {
    expect(toRoutePoint({ x: 5 })).toEqual({ x: 5, y: 0, z: 0 });
    expect(toRoutePoint(null)).toEqual({ x: 0, y: 0, z: 0 });
    expect(toRoutePoint({ x: 'abc' })).toEqual({ x: 0, y: 0, z: 0 });
  });
});

describe('appendRoutePoint()', () => {
  it('十分離れた点を足すこと', () => {
    expect(appendRoutePoint([point(0, 0)], point(100, 0))).toEqual([point(0, 0), point(100, 0)]);
  });

  it('近すぎる点は末尾を差し替えること', () => {
    const path = appendRoutePoint([point(0, 0), point(100, 0)], point(103, 0));
    expect(path).toEqual([point(0, 0), point(103, 0)]);
  });

  it('点が増えすぎたら間引くこと', () => {
    let path: ReplayRoutePoint[] = [];
    for (let index = 0; index < REPLAY_ROUTE_MAX_POINTS * 3; index++) {
      path = appendRoutePoint(path, point(index * 50, 0));
    }
    expect(path.length).toBeLessThanOrEqual(REPLAY_ROUTE_MAX_POINTS);
  });

  it('間引いても終点は残すこと', () => {
    let path: ReplayRoutePoint[] = [];
    for (let index = 0; index < REPLAY_ROUTE_MAX_POINTS * 3; index++) {
      path = appendRoutePoint(path, point(index * 50, 0));
    }
    expect(path[path.length - 1]).toEqual(point((REPLAY_ROUTE_MAX_POINTS * 3 - 1) * 50, 0));
  });
});

describe('thinRoute()', () => {
  it('上限以下なら手を付けないこと', () => {
    const path = [point(0, 0), point(10, 0)];
    expect(thinRoute(path, 8)).toEqual(path);
  });

  it('始点と終点を残して間引くこと', () => {
    const path = Array.from({ length: 20 }, (_, index) => point(index, 0));
    const thinned = thinRoute(path, 5);
    expect(thinned).toHaveLength(5);
    expect(thinned[0]).toEqual(point(0, 0));
    expect(thinned[4]).toEqual(point(19, 0));
  });
});

describe('buildReplayRoute()', () => {
  it('始点・経路・終点をつなぐこと', () => {
    const route = buildReplayRoute(point(0, 0), [point(50, 0), point(50, 50)], point(100, 50));
    expect(route).toEqual([point(0, 0), point(50, 0), point(50, 50), point(100, 50)]);
  });

  it('重なった点を落とすこと', () => {
    const route = buildReplayRoute(point(0, 0), [point(0, 0), point(50, 0)], point(50, 0));
    expect(route).toEqual([point(0, 0), point(50, 0)]);
  });

  it('経路が無ければ 2 点になること', () => {
    expect(buildReplayRoute(point(0, 0), [], point(100, 0))).toEqual([point(0, 0), point(100, 0)]);
  });
});

describe('routeLength() / distanceBetween()', () => {
  it('折れ線の長さを足し合わせること', () => {
    expect(routeLength([point(0, 0), point(30, 40), point(30, 40, 10)])).toBe(60);
  });

  it('点が 1 つなら 0 であること', () => {
    expect(routeLength([point(5, 5)])).toBe(0);
  });

  it('高さも含めて測ること', () => {
    expect(distanceBetween(point(0, 0, 0), point(0, 0, 7))).toBe(7);
  });
});

describe('pointAlongRoute()', () => {
  const route = [point(0, 0), point(100, 0), point(100, 100)];

  it('端では端の点を返すこと', () => {
    expect(pointAlongRoute(route, 0)).toEqual(point(0, 0));
    expect(pointAlongRoute(route, 1)).toEqual(point(100, 100));
  });

  it('折れ線の長さに沿って進むこと', () => {
    expect(pointAlongRoute(route, 0.25)).toEqual(point(50, 0));
    expect(pointAlongRoute(route, 0.5)).toEqual(point(100, 0));
    expect(pointAlongRoute(route, 0.75)).toEqual(point(100, 50));
  });

  it('範囲の外を丸めること', () => {
    expect(pointAlongRoute(route, -1)).toEqual(point(0, 0));
    expect(pointAlongRoute(route, 5)).toEqual(point(100, 100));
  });

  it('点が足りなくても落ちないこと', () => {
    expect(pointAlongRoute([], 0.5)).toEqual(point(0, 0));
    expect(pointAlongRoute([point(3, 4)], 0.5)).toEqual(point(3, 4));
  });
});

describe('easeInOut()', () => {
  it('端を保つこと', () => {
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(1)).toBe(1);
  });

  it('中間で折り返すこと', () => {
    expect(easeInOut(0.5)).toBeCloseTo(0.5, 5);
  });

  it('単調に増えること', () => {
    let previous = -1;
    for (let step = 0; step <= 10; step++) {
      const value = easeInOut(step / 10);
      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
  });
});
