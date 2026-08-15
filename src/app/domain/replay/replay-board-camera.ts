import type { ReplayBoardFraming } from '@axe/domain/replay/replay-board-view';

/**
 * How the board faces in a video.
 *
 * The angle of the camera is not shared — everybody turns their own — so the recording holds none.
 * Instead it offers a view from above and the tilt of the table, the second at the usual angle.
 * There is no perspective: with the scale the same near and far, the size of a piece reads as its size rather than its distance.
 */

export interface ReplayBoardCamera {
  /** How far the board is turned. */
  spin: number;
  /** How far it is tilted towards the viewer. At nothing it is seen from above. */
  tilt: number;
}

export const REPLAY_BOARD_TOP_DOWN: ReplayBoardCamera = { spin: 0, tilt: 0 };

/** How the table usually looks, at the same angle the table view uses. */
export const REPLAY_BOARD_TABLE_VIEW: ReplayBoardCamera = { spin: 10, tilt: 50 };

export const REPLAY_BOARD_MAX_TILT = 75;

export interface ReplayBoardBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ReplayBoardProjection {
  /** From a point on the table to a point on the screen. */
  at(x: number, y: number): { x: number; y: number };
  /** From a length on the table to one on the screen, measured across, which the tilt does not shorten. */
  scale: number;
  /** The matrix given to the canvas, which is how anything clinging to the ground is drawn. */
  matrix: readonly [number, number, number, number, number, number];
  /** Smaller the further back, which is what the pieces are ordered by. */
  depthOf(x: number, y: number): number;
}

/**
 * Builds the projection that fits the board to the frame.
 *
 * It turns, tilts and then scales to the frame. The tilt shortens the depth, and fitting
 * the unshortened shape would leave a margin above and below.
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

  // Turned and tilted, before it is fitted.
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
