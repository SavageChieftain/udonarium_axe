import {
  REPLAY_BOARD_MAX_TILT,
  REPLAY_BOARD_TABLE_VIEW,
  REPLAY_BOARD_TOP_DOWN,
  replayBoardProjection,
} from '@axe/domain/replay/replay-board-camera';

const framing = { x: 0, y: 0, width: 1000, height: 1000 };
const box = { x: 100, y: 50, width: 800, height: 400 };

describe('replayBoardProjection()', () => {
  it('does nothing but fit the board to the frame seen from above', () => {
    const view = replayBoardProjection(REPLAY_BOARD_TOP_DOWN, framing, box);

    // A square table in a frame twice as wide as it is tall fits by the shorter side.
    expect(view.scale).toBeCloseTo(0.4, 6);
    expect(view.at(0, 0)).toEqual({ x: 300, y: 50 });
    expect(view.at(1000, 1000)).toEqual({ x: 700, y: 450 });
  });

  it('shortens only the depth as it tilts', () => {
    const view = replayBoardProjection({ spin: 0, tilt: 60 }, framing, box);
    const top = view.at(0, 0);
    const bottom = view.at(0, 1000);
    const right = view.at(1000, 0);

    expect(bottom.y - top.y).toBeCloseTo((right.x - top.x) * Math.cos(Math.PI / 3), 6);
  });

  it('shows it larger by as much as it tilted', () => {
    const flat = replayBoardProjection(REPLAY_BOARD_TOP_DOWN, framing, box);
    const tilted = replayBoardProjection({ spin: 0, tilt: 60 }, framing, box);

    // With the depth shortened, more of the width of the frame can be used.
    expect(tilted.scale).toBeGreaterThan(flat.scale);
  });

  it('never runs past the frame as it turns', () => {
    const view = replayBoardProjection(REPLAY_BOARD_TABLE_VIEW, framing, box);
    const corners = [view.at(0, 0), view.at(1000, 0), view.at(0, 1000), view.at(1000, 1000)];

    for (const corner of corners) {
      expect(corner.x).toBeGreaterThanOrEqual(box.x - 0.001);
      expect(corner.x).toBeLessThanOrEqual(box.x + box.width + 0.001);
      expect(corner.y).toBeGreaterThanOrEqual(box.y - 0.001);
      expect(corner.y).toBeLessThanOrEqual(box.y + box.height + 0.001);
    }
  });

  it('stops short of tilting it flat', () => {
    const over = replayBoardProjection({ spin: 0, tilt: 89 }, framing, box);
    const capped = replayBoardProjection({ spin: 0, tilt: REPLAY_BOARD_MAX_TILT }, framing, box);

    expect(over.scale).toBeCloseTo(capped.scale, 6);
  });

  it('returns a smaller depth the further back it is', () => {
    const view = replayBoardProjection(REPLAY_BOARD_TABLE_VIEW, framing, box);

    expect(view.depthOf(500, 0)).toBeLessThan(view.depthOf(500, 900));
  });

  it('agrees with how it maps a point', () => {
    const view = replayBoardProjection(REPLAY_BOARD_TABLE_VIEW, framing, box);
    const [a, b, c, d, e, f] = view.matrix;
    const point = { x: 320, y: 780 };

    expect(a * point.x + c * point.y + e).toBeCloseTo(view.at(point.x, point.y).x, 6);
    expect(b * point.x + d * point.y + f).toBeCloseTo(view.at(point.x, point.y).y, 6);
  });
});
