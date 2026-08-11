import type { ReplayBoardFraming } from '@axe/domain/replay/replay-board-view';

/**
 * 動画に映す盤面の向き。
 *
 * 卓のカメラの角度は同期していない（各自が勝手に回している）ので、記録には残っていない。
 * そこで「真上から」と「卓と同じ傾き」を選べるようにし、後者は卓の既定の角度で映す。
 * 遠近は付けない — 手前と奥で縮尺が変わらないぶん、コマの大小が距離ではなく実際の大きさとして読める。
 */

export interface ReplayBoardCamera {
  /** 盤面を回す角度(度)。 */
  spin: number;
  /** 手前へ倒す角度(度)。0 なら真上から。 */
  tilt: number;
}

export const REPLAY_BOARD_TOP_DOWN: ReplayBoardCamera = { spin: 0, tilt: 0 };

/** 卓の既定の見え方。`table-view` が使う回転と同じ。 */
export const REPLAY_BOARD_TABLE_VIEW: ReplayBoardCamera = { spin: 10, tilt: 50 };

export const REPLAY_BOARD_MAX_TILT = 75;

export interface ReplayBoardBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ReplayBoardProjection {
  /** 卓の座標を画面の座標へ。 */
  at(x: number, y: number): { x: number; y: number };
  /** 卓の長さを画面の長さへ（傾けても縮まない向き＝横方向）。 */
  scale: number;
  /** canvas の setTransform へ渡す行列。地面に貼り付くものはこれで描く。 */
  matrix: readonly [number, number, number, number, number, number];
  /** 奥ほど小さい値。コマを並べる順に使う。 */
  depthOf(x: number, y: number): number;
}

/**
 * 盤面を枠いっぱいに収める射影を作る。
 *
 * 回して・倒して・枠に合わせて拡大する、の順。倒すと縦が縮むので、
 * 縮んだ形のまま枠へ合わせないと上下に余白が空く。
 */
export function replayBoardProjection(
  camera: ReplayBoardCamera,
  framing: ReplayBoardFraming,
  box: ReplayBoardBox
): ReplayBoardProjection {
  const tilt = Math.min(Math.max(camera.tilt, 0), REPLAY_BOARD_MAX_TILT);
  const squash = Math.cos((tilt * Math.PI) / 180);
  const spin = (camera.spin * Math.PI) / 180;
  const cos = Math.cos(spin);
  const sin = Math.sin(spin);

  // 回して倒す（枠に合わせる前）。
  const turn = (x: number, y: number) => ({ x: x * cos - y * sin, y: (x * sin + y * cos) * squash });

  const corners = [
    turn(framing.x, framing.y),
    turn(framing.x + framing.width, framing.y),
    turn(framing.x, framing.y + framing.height),
    turn(framing.x + framing.width, framing.y + framing.height),
  ];
  const left = Math.min(...corners.map((point) => point.x));
  const right = Math.max(...corners.map((point) => point.x));
  const top = Math.min(...corners.map((point) => point.y));
  const bottom = Math.max(...corners.map((point) => point.y));

  const spread = Math.max(right - left, 1);
  const rise = Math.max(bottom - top, 1);
  const scale = Math.min(box.width / spread, box.height / rise);

  const offsetX = box.x + (box.width - spread * scale) / 2 - left * scale;
  const offsetY = box.y + (box.height - rise * scale) / 2 - top * scale;

  return {
    at: (x, y) => {
      const turned = turn(x, y);
      return { x: offsetX + turned.x * scale, y: offsetY + turned.y * scale };
    },
    scale,
    matrix: [cos * scale, sin * scale * squash, -sin * scale, cos * scale * squash, offsetX, offsetY],
    depthOf: (x, y) => turn(x, y).y,
  };
}
