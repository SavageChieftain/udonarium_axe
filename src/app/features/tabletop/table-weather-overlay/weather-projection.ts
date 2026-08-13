export interface ScreenPoint {
  x: number;
  y: number;
}

/**
 * 盤面の外へどれだけ広げるか。
 *
 * 薄れはじめが盤面の内側に入ると、その輪が板の上に丸く浮いて見える。
 * 盤面の縁までは濃さを保ち、消えるまでの道のりはすべて外側へ出す。
 */
const BLEED = 1.55;

function isDrawable(points: readonly ScreenPoint[]): boolean {
  return points.length > 0 && points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
}

/**
 * 天候を盤面のあたりへ寄せるマスク。
 *
 * 多角形で切り抜くと、空中に直線の切り口が出てガラスの箱を被せたように見える。
 * 天候に輪郭は無いので、盤面とその上空を覆う楕円でぼかしながら消す。
 */
export function weatherMaskImage(corners: readonly ScreenPoint[]): string {
  if (!isDrawable(corners)) return 'none';

  const xs = corners.map((corner) => corner.x);
  const ys = corners.map((corner) => corner.y);
  const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
  const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;
  const radiusX = ((Math.max(...xs) - Math.min(...xs)) / 2) * BLEED;
  const radiusY = ((Math.max(...ys) - Math.min(...ys)) / 2) * BLEED;
  if (radiusX < 1 || radiusY < 1) return 'none';

  // 盤面の縁が来る位置。ここまでは濃さを保ち、残りを使ってゆっくり消す。
  const edge = 100 / BLEED;
  const stops = [
    `#000 ${edge.toFixed(0)}%`,
    // 一段で落とすと縁が輪として見える。途中を挟んで傾きを緩める。
    `rgba(0, 0, 0, 0.62) ${(edge + (100 - edge) * 0.4).toFixed(0)}%`,
    `rgba(0, 0, 0, 0.22) ${(edge + (100 - edge) * 0.72).toFixed(0)}%`,
    'transparent 100%',
  ];

  return (
    `radial-gradient(${radiusX.toFixed(0)}px ${radiusY.toFixed(0)}px` +
    ` at ${centerX.toFixed(0)}px ${centerY.toFixed(0)}px, ${stops.join(', ')})`
  );
}

/**
 * 空気の色を塗る向き。盤面の奥から手前へ向かう角度(deg)を CSS の記法で返す。
 *
 * 画面の上から下へ一律に塗ると、濃くしたときにただの白い板になる。
 * 奥ほど濃く、手前ほど薄くすることで、遠くが霞んで見えなくなる絵になる。
 */
export function weatherDepthDirection(floorCorners: readonly ScreenPoint[]): string {
  if (!isDrawable(floorCorners) || floorCorners.length < 4) return 'to bottom';

  const sorted = [...floorCorners].sort((a, b) => a.y - b.y);
  const far = midpoint(sorted[0], sorted[1]);
  const near = midpoint(sorted[sorted.length - 2], sorted[sorted.length - 1]);

  const dx = near.x - far.x;
  const dy = near.y - far.y;
  if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return 'to bottom';

  // CSS の角度は上向きが 0deg で時計回り。画面座標は y が下向き。
  const degree = (Math.atan2(dx, -dy) * 180) / Math.PI;
  return `${degree.toFixed(1)}deg`;
}

function midpoint(a: ScreenPoint, b: ScreenPoint): ScreenPoint {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}
