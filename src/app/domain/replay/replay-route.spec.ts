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
  it('reads a missing coordinate as nothing', () => {
    expect(toRoutePoint({ x: 5 })).toEqual({ x: 5, y: 0, z: 0 });
    expect(toRoutePoint(null)).toEqual({ x: 0, y: 0, z: 0 });
    expect(toRoutePoint({ x: 'abc' })).toEqual({ x: 0, y: 0, z: 0 });
  });
});

describe('appendRoutePoint()', () => {
  it('adds a point far enough from the last', () => {
    expect(appendRoutePoint([point(0, 0)], point(100, 0))).toEqual([point(0, 0), point(100, 0)]);
  });

  it('replaces the last with one too close to it', () => {
    const path = appendRoutePoint([point(0, 0), point(100, 0)], point(103, 0));
    expect(path).toEqual([point(0, 0), point(103, 0)]);
  });

  it('thins the points once there are too many', () => {
    let path: ReplayRoutePoint[] = [];
    for (let index = 0; index < REPLAY_ROUTE_MAX_POINTS * 3; index++) {
      path = appendRoutePoint(path, point(index * 50, 0));
    }
    expect(path.length).toBeLessThanOrEqual(REPLAY_ROUTE_MAX_POINTS);
  });

  it('keeps the end through that thinning', () => {
    let path: ReplayRoutePoint[] = [];
    for (let index = 0; index < REPLAY_ROUTE_MAX_POINTS * 3; index++) {
      path = appendRoutePoint(path, point(index * 50, 0));
    }
    expect(path[path.length - 1]).toEqual(point((REPLAY_ROUTE_MAX_POINTS * 3 - 1) * 50, 0));
  });
});

describe('thinRoute()', () => {
  it('leaves them alone below the limit', () => {
    const path = [point(0, 0), point(10, 0)];
    expect(thinRoute(path, 8)).toEqual(path);
  });

  it('keeps the first and the last as it thins', () => {
    const path = Array.from({ length: 20 }, (_, index) => point(index, 0));
    const thinned = thinRoute(path, 5);
    expect(thinned).toHaveLength(5);
    expect(thinned[0]).toEqual(point(0, 0));
    expect(thinned[4]).toEqual(point(19, 0));
  });
});

describe('buildReplayRoute()', () => {
  it('joins the start, the path and the end', () => {
    const route = buildReplayRoute(point(0, 0), [point(50, 0), point(50, 50)], point(100, 50));
    expect(route).toEqual([point(0, 0), point(50, 0), point(50, 50), point(100, 50)]);
  });

  it('drops a point that sits on another', () => {
    const route = buildReplayRoute(point(0, 0), [point(0, 0), point(50, 0)], point(50, 0));
    expect(route).toEqual([point(0, 0), point(50, 0)]);
  });

  it('leaves two points when there is no path between', () => {
    expect(buildReplayRoute(point(0, 0), [], point(100, 0))).toEqual([point(0, 0), point(100, 0)]);
  });
});

describe('routeLength() / distanceBetween()', () => {
  it('adds the lengths of the segments together', () => {
    expect(routeLength([point(0, 0), point(30, 40), point(30, 40, 10)])).toBe(60);
  });

  it('is nothing for a single point', () => {
    expect(routeLength([point(5, 5)])).toBe(0);
  });

  it('measures the height into it', () => {
    expect(distanceBetween(point(0, 0, 0), point(0, 0, 7))).toBe(7);
  });
});

describe('pointAlongRoute()', () => {
  const route = [point(0, 0), point(100, 0), point(100, 100)];

  it('returns the end point at either end', () => {
    expect(pointAlongRoute(route, 0)).toEqual(point(0, 0));
    expect(pointAlongRoute(route, 1)).toEqual(point(100, 100));
  });

  it('travels along the length of the path', () => {
    expect(pointAlongRoute(route, 0.25)).toEqual(point(50, 0));
    expect(pointAlongRoute(route, 0.5)).toEqual(point(100, 0));
    expect(pointAlongRoute(route, 0.75)).toEqual(point(100, 50));
  });

  it('pulls a place outside the range back in', () => {
    expect(pointAlongRoute(route, -1)).toEqual(point(0, 0));
    expect(pointAlongRoute(route, 5)).toEqual(point(100, 100));
  });

  it('does not fall over without enough points', () => {
    expect(pointAlongRoute([], 0.5)).toEqual(point(0, 0));
    expect(pointAlongRoute([point(3, 4)], 0.5)).toEqual(point(3, 4));
  });
});

describe('easeInOut()', () => {
  it('keeps the ends', () => {
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(1)).toBe(1);
  });

  it('turns back in the middle', () => {
    expect(easeInOut(0.5)).toBeCloseTo(0.5, 5);
  });

  it('rises without falling', () => {
    let previous = -1;
    for (let step = 0; step <= 10; step++) {
      const value = easeInOut(step / 10);
      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
  });
});
