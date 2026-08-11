import {
  REPLAY_BOARD_MAX_TILT,
  REPLAY_BOARD_TABLE_VIEW,
  REPLAY_BOARD_TOP_DOWN,
  replayBoardProjection,
} from '@axe/domain/replay/replay-board-camera';

const framing = { x: 0, y: 0, width: 1000, height: 1000 };
const box = { x: 100, y: 50, width: 800, height: 400 };

describe('replayBoardProjection()', () => {
  it('真上からなら今までどおり枠に収めるだけにすること', () => {
    const view = replayBoardProjection(REPLAY_BOARD_TOP_DOWN, framing, box);

    // 正方形の卓を横 800 × 縦 400 の枠へ入れるので、短いほうに合わせて 0.4 倍。
    expect(view.scale).toBeCloseTo(0.4, 6);
    expect(view.at(0, 0)).toEqual({ x: 300, y: 50 });
    expect(view.at(1000, 1000)).toEqual({ x: 700, y: 450 });
  });

  it('倒すと縦だけが縮むこと', () => {
    const view = replayBoardProjection({ spin: 0, tilt: 60 }, framing, box);
    const top = view.at(0, 0);
    const bottom = view.at(0, 1000);
    const right = view.at(1000, 0);

    expect(bottom.y - top.y).toBeCloseTo((right.x - top.x) * Math.cos(Math.PI / 3), 6);
  });

  it('倒したぶんだけ大きく映すこと', () => {
    const flat = replayBoardProjection(REPLAY_BOARD_TOP_DOWN, framing, box);
    const tilted = replayBoardProjection({ spin: 0, tilt: 60 }, framing, box);

    // 縦が縮むので、同じ枠に対して横をもっと使える。
    expect(tilted.scale).toBeGreaterThan(flat.scale);
  });

  it('回しても枠からはみ出さないこと', () => {
    const view = replayBoardProjection(REPLAY_BOARD_TABLE_VIEW, framing, box);
    const corners = [view.at(0, 0), view.at(1000, 0), view.at(0, 1000), view.at(1000, 1000)];

    for (const corner of corners) {
      expect(corner.x).toBeGreaterThanOrEqual(box.x - 0.001);
      expect(corner.x).toBeLessThanOrEqual(box.x + box.width + 0.001);
      expect(corner.y).toBeGreaterThanOrEqual(box.y - 0.001);
      expect(corner.y).toBeLessThanOrEqual(box.y + box.height + 0.001);
    }
  });

  it('倒しすぎて潰れないよう止めること', () => {
    const over = replayBoardProjection({ spin: 0, tilt: 89 }, framing, box);
    const capped = replayBoardProjection({ spin: 0, tilt: REPLAY_BOARD_MAX_TILT }, framing, box);

    expect(over.scale).toBeCloseTo(capped.scale, 6);
  });

  it('奥のものほど小さい深さを返すこと', () => {
    const view = replayBoardProjection(REPLAY_BOARD_TABLE_VIEW, framing, box);

    expect(view.depthOf(500, 0)).toBeLessThan(view.depthOf(500, 900));
  });

  it('行列が座標の写し方と一致すること', () => {
    const view = replayBoardProjection(REPLAY_BOARD_TABLE_VIEW, framing, box);
    const [a, b, c, d, e, f] = view.matrix;
    const point = { x: 320, y: 780 };

    expect(a * point.x + c * point.y + e).toBeCloseTo(view.at(point.x, point.y).x, 6);
    expect(b * point.x + d * point.y + f).toBeCloseTo(view.at(point.x, point.y).y, 6);
  });
});
