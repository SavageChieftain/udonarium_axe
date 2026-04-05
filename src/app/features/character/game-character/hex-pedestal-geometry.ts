/**
 * ヘクスマップ上のペデスタル（花形）のジオメトリを計算するユーティリティ。
 * UIフレームワーク非依存の純粋関数群。
 */

export interface HexFlowerParams {
  outline: Point[];
  bbox: BoundingBox;
  L: number;
  g: number;
}

interface Point {
  x: number;
  y: number;
}

interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * ヘクス距離 ≤ (size-1) の全セルの集合体（花形）の外周アウトラインを計算する。
 * 座標はヘクス中心 (0,0) 基準のピクセル座標。
 * パスは画面上で CW (時計回り)。
 */
export function buildHexFlowerOutline(size: number, gridSize: number, isFlatTop: boolean): Point[] {
  const s = gridSize / Math.sqrt(3);
  const g = gridSize;
  const d = size - 1;

  // キューブ座標でヘクス距離 ≤ d のセルを列挙
  const cells = new Set<string>();
  for (let q = -d; q <= d; q++) {
    const rMin = Math.max(-d, -q - d);
    const rMax = Math.min(d, -q + d);
    for (let r = rMin; r <= rMax; r++) {
      cells.add(`${q},${r}`);
    }
  }

  // キューブ座標 → ピクセル座標
  const cubeToPixel = (q: number, r: number): Point => {
    if (isFlatTop) {
      return { x: 1.5 * s * q, y: (g / 2) * q + g * r };
    } else {
      return { x: g * q + (g / 2) * r, y: 1.5 * s * r };
    }
  };

  // 各辺インデックスに対応するキューブ座標上の隣接方向
  const neighborDirs: number[][] = isFlatTop
    ? [
        [1, 0],
        [0, 1],
        [-1, 1],
        [-1, 0],
        [0, -1],
        [1, -1],
      ]
    : [
        [1, -1],
        [1, 0],
        [0, 1],
        [-1, 1],
        [-1, 0],
        [0, -1],
      ];

  const startAngle = isFlatTop ? 0 : -Math.PI / 2;
  const hexVertex = (cx: number, cy: number, i: number): Point => {
    const angle = startAngle + (i * Math.PI) / 3;
    return { x: cx + s * Math.cos(angle), y: cy + s * Math.sin(angle) };
  };

  // 境界辺を収集し、始点座標 → 辺インデックスのマップを構築
  type Segment = { from: Point; to: Point };
  const segments: Segment[] = [];
  const fromMap = new Map<string, number>();
  const vtxKey = (p: Point): string => `${Math.round(p.x * 1000)},${Math.round(p.y * 1000)}`;

  for (const key of cells) {
    const [q, r] = key.split(',').map(Number);
    const { x: cx, y: cy } = cubeToPixel(q, r);
    for (let e = 0; e < 6; e++) {
      const [dq, dr] = neighborDirs[e];
      if (!cells.has(`${q + dq},${r + dr}`)) {
        const from = hexVertex(cx, cy, e);
        const to = hexVertex(cx, cy, (e + 1) % 6);
        const idx = segments.length;
        segments.push({ from, to });
        fromMap.set(vtxKey(from), idx);
      }
    }
  }

  // 辺を頂点共有順に連結して閉パスを構築
  const path: Point[] = [];
  const visited = new Array(segments.length).fill(false);
  let current = 0;
  for (let i = 0; i < segments.length; i++) {
    visited[current] = true;
    path.push(segments[current].from);
    const next = fromMap.get(vtxKey(segments[current].to));
    if (next === undefined || visited[next]) break;
    current = next;
  }

  return path;
}

/**
 * CW ポリゴンを内側に bw ピクセルだけインセットする。
 * 各頂点で隣接辺の法線ベクトルのバイセクタ方向に移動。
 */
export function insetPolygon(vertices: Point[], bw: number): Point[] {
  const n = vertices.length;
  const result: Point[] = [];
  for (let i = 0; i < n; i++) {
    const prev = vertices[(i - 1 + n) % n];
    const curr = vertices[i];
    const next = vertices[(i + 1) % n];
    const d1x = curr.x - prev.x;
    const d1y = curr.y - prev.y;
    const l1 = Math.sqrt(d1x * d1x + d1y * d1y);
    const d2x = next.x - curr.x;
    const d2y = next.y - curr.y;
    const l2 = Math.sqrt(d2x * d2x + d2y * d2y);
    // CW パスの内側法線: (-dy, dx) / |d|
    const n1x = -d1y / l1;
    const n1y = d1x / l1;
    const n2x = -d2y / l2;
    const n2y = d2x / l2;
    const bx = n1x + n2x;
    const by = n1y + n2y;
    const dot = n1x * bx + n1y * by; // = 1 + cos(angle between normals)
    if (Math.abs(dot) < 1e-10) {
      result.push({ x: curr.x + n1x * bw, y: curr.y + n1y * bw });
    } else {
      const k = bw / dot;
      result.push({ x: curr.x + bx * k, y: curr.y + by * k });
    }
  }
  return result;
}

/**
 * evenodd SVG パスで外側花形から内側花形を抜いたリング clip-path を返す。
 */
export function buildHexRingClipPath(outline: Point[], bbox: BoundingBox, borderWidth: number): string {
  // ペデスタル要素座標に変換（左上を原点にシフト）
  const outer = outline.map((v) => ({ x: v.x - bbox.minX, y: v.y - bbox.minY }));
  const inner = insetPolygon(outer, borderWidth);
  const f = (v: number): string => v.toFixed(2);

  let outerPath = `M ${f(outer[0].x)} ${f(outer[0].y)}`;
  for (let i = 1; i < outer.length; i++) {
    outerPath += ` L ${f(outer[i].x)} ${f(outer[i].y)}`;
  }
  outerPath += ' Z';

  let innerPath = `M ${f(inner[0].x)} ${f(inner[0].y)}`;
  for (let i = 1; i < inner.length; i++) {
    innerPath += ` L ${f(inner[i].x)} ${f(inner[i].y)}`;
  }
  innerPath += ' Z';

  return `path(evenodd, "${outerPath} ${innerPath}")`;
}

/**
 * ヘクスフラワーのアウトラインから HexFlowerParams を計算する。
 */
export function calcHexFlowerParams(size: number, gridSize: number, isFlatTop: boolean): HexFlowerParams {
  const n = Math.min(size, 6);
  const L = size * gridSize;
  const outline = buildHexFlowerOutline(n, gridSize, isFlatTop);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const v of outline) {
    if (v.x < minX) minX = v.x;
    if (v.y < minY) minY = v.y;
    if (v.x > maxX) maxX = v.x;
    if (v.y > maxY) maxY = v.y;
  }
  return { outline, bbox: { minX, minY, maxX, maxY }, L, g: gridSize };
}
