import type { ImageItem, ShapeItem } from '@axe/features/map-editor/model/scene';

/**
 * 掴む場所の当たり判定。
 *
 * 座標も掴める幅も**場面の px**（拡大率を掛ける前）。呼ぶ側が拡大率で割った位置を渡す。
 * そのため拡大しているほど掴みやすく、縮めているほど掴みにくい。
 */

const ANCHOR_GRAB_PX = 7;
const HANDLE_GRAB_PX = 6;

/** 曲線の何番目の節を掴んだか。掴んでいなければ -1。 */
export function curveAnchorAt(item: ShapeItem, x: number, y: number): number {
  const p = item.points;
  for (let i = 0; i * 2 + 1 < p.length; i += 1) {
    if (Math.abs(x - p[i * 2]) <= ANCHOR_GRAB_PX && Math.abs(y - p[i * 2 + 1]) <= ANCHOR_GRAB_PX) return i;
  }
  return -1;
}

/** 絵の四隅。左上から時計回り。 */
export function imageCorners(item: ImageItem): { x: number; y: number }[] {
  const hw = item.w / 2;
  const hh = item.h / 2;
  return [
    { x: item.x - hw, y: item.y - hh },
    { x: item.x + hw, y: item.y - hh },
    { x: item.x + hw, y: item.y + hh },
    { x: item.x - hw, y: item.y + hh },
  ];
}

/** 絵のどの角を掴んだか。掴んでいなければ -1。 */
export function imageHandleAt(item: ImageItem, x: number, y: number): number {
  const corners = imageCorners(item);
  for (let i = 0; i < corners.length; i += 1) {
    if (Math.abs(x - corners[i].x) <= HANDLE_GRAB_PX && Math.abs(y - corners[i].y) <= HANDLE_GRAB_PX) return i;
  }
  return -1;
}

/** 置いたときの絵の大きさ。大きすぎる絵は盤の目 8 つ分に収める。 */
export function fitImageSize(naturalW: number, naturalH: number, cellPx: number): { w: number; h: number } {
  const w = naturalW > 0 ? naturalW : 4 * cellPx;
  const h = naturalH > 0 ? naturalH : 4 * cellPx;
  const max = 8 * cellPx;
  const longest = Math.max(w, h);
  const ratio = longest > max ? max / longest : 1;
  return { w: w * ratio, h: h * ratio };
}
