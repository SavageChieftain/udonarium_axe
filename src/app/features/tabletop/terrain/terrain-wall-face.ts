import { WallFace } from '@axe/domain/tabletop/vision-scene';

export type WallSide = 'north' | 'south' | 'west' | 'east';

export interface TerrainFootprint {
  /** 盤面での左上(px)。回していない状態の位置。 */
  x: number;
  y: number;
  widthPx: number;
  depthPx: number;
  heightPx: number;
  rotateDeg: number;
}

interface Corner {
  x: number;
  y: number;
}

/**
 * 地形の壁 1 面を盤面の座標で表す。
 *
 * 軸に沿った四角として組むと、回した地形では面が求まらない。面が無ければ壁に光も影も
 * 落とせず、光源の中にいても壁だけが黒いまま残る。角と法線を一緒に回して出す。
 */
export function terrainWallFace(side: WallSide, footprint: TerrainFootprint): WallFace {
  const { x, y, widthPx, depthPx, heightPx, rotateDeg } = footprint;
  const centerX = x + widthPx / 2;
  const centerY = y + depthPx / 2;
  const radian = (rotateDeg * Math.PI) / 180;
  const cos = Math.cos(radian);
  const sin = Math.sin(radian);
  const halfWidth = widthPx / 2;
  const halfDepth = depthPx / 2;

  const corner = (localX: number, localY: number): Corner => ({
    x: centerX + localX * cos - localY * sin,
    y: centerY + localX * sin + localY * cos,
  });
  const normal = (nx: number, ny: number): Corner => ({ x: nx * cos - ny * sin, y: nx * sin + ny * cos });

  // 4 面ぶん作ってから 1 面選ぶと、地形 1 つにつき毎回 3 面ぶんを捨てる。
  const edge = ((): { a: Corner; b: Corner; n: Corner } => {
    switch (side) {
      case 'north':
        return { a: corner(-halfWidth, -halfDepth), b: corner(halfWidth, -halfDepth), n: normal(0, -1) };
      case 'south':
        return { a: corner(-halfWidth, halfDepth), b: corner(halfWidth, halfDepth), n: normal(0, 1) };
      case 'west':
        return { a: corner(-halfWidth, -halfDepth), b: corner(-halfWidth, halfDepth), n: normal(-1, 0) };
      default:
        return { a: corner(halfWidth, -halfDepth), b: corner(halfWidth, halfDepth), n: normal(1, 0) };
    }
  })();

  return {
    ax: edge.a.x,
    ay: edge.a.y,
    bx: edge.b.x,
    by: edge.b.y,
    nx: edge.n.x,
    ny: edge.n.y,
    heightPx,
  };
}
