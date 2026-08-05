/**
 * ワールドの向きを画面上の向きへ射影する。
 *
 * 盤面は `rotateY(ty) rotateX(tx) rotateZ(tz)` の順で子を回す（板ポリはその逆を掛けて
 * カメラに正対させている）。同じ行列をベクトルに掛ければ、画面上での角度と見かけの長さが出る。
 * これが分かると、飛翔体を進行方向へ引き伸ばす（stretched billboard）ことができる。
 */

export interface ViewRotation {
  x: number;
  y: number;
  z: number;
}

export interface ScreenDirection {
  /** 画面上の角度(度)。CSS の rotateZ にそのまま渡せる。 */
  angle: number;
  /** 画面上での長さ(px)。奥行き方向を向くほど短くなる。 */
  length: number;
}

export const DEFAULT_VIEW_ROTATION: ViewRotation = { x: 50, y: 0, z: 10 };

export function projectDirection(
  dx: number,
  dy: number,
  dz: number,
  rotation: ViewRotation | null | undefined
): ScreenDirection {
  const view = rotation ?? DEFAULT_VIEW_ROTATION;
  const rz = toRadians(view.z);
  const rx = toRadians(view.x);
  const ry = toRadians(view.y);

  // rotateZ
  let x = dx * Math.cos(rz) - dy * Math.sin(rz);
  let y = dx * Math.sin(rz) + dy * Math.cos(rz);
  let z = dz;

  // rotateX
  const y1 = y * Math.cos(rx) - z * Math.sin(rx);
  z = y * Math.sin(rx) + z * Math.cos(rx);
  y = y1;

  // rotateY（画面へ出るのは x と y だけなので、奥行きはここで捨てる）
  x = x * Math.cos(ry) + z * Math.sin(ry);

  const length = Math.hypot(x, y);
  return { angle: length < 1e-6 ? 0 : (Math.atan2(y, x) * 180) / Math.PI, length };
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
