import {
  buildHexFlowerOutline,
  buildHexRingClipPath,
  buildVertexClusterOutline,
  calcHexFlowerParams,
  insetPolygon,
} from '@axe/ui/tabletop/hex-pedestal-geometry';

describe('hex-pedestal-geometry', () => {
  describe('buildHexFlowerOutline', () => {
    it('size=1 のとき単一ヘクスの6頂点を返す', () => {
      const outline = buildHexFlowerOutline(1, 50, true);
      expect(outline).toHaveLength(6);
    });

    it('size=1 flat-top で正六角形になる（対称性チェック）', () => {
      const gridSize = 50;
      const s = gridSize / Math.sqrt(3);
      const outline = buildHexFlowerOutline(1, gridSize, true);
      // すべての頂点が中心からの距離 s に等しい
      for (const v of outline) {
        const dist = Math.sqrt(v.x * v.x + v.y * v.y);
        expect(dist).toBeCloseTo(s, 5);
      }
    });

    it('size=1 pointy-top で正六角形になる', () => {
      const gridSize = 50;
      const s = gridSize / Math.sqrt(3);
      const outline = buildHexFlowerOutline(1, gridSize, false);
      expect(outline).toHaveLength(6);
      for (const v of outline) {
        const dist = Math.sqrt(v.x * v.x + v.y * v.y);
        expect(dist).toBeCloseTo(s, 5);
      }
    });

    it('size=2 flat-top で閉パスを返す（セル数7 → 辺数18）', () => {
      const outline = buildHexFlowerOutline(2, 50, true);
      // 7セルの花形: 外周辺数 = 6 * (size-1) * 2 = 6*1*2 = 12? → 実際には18辺
      expect(outline.length).toBe(18);
    });

    it('size=2 pointy-top で閉パスを返す', () => {
      const outline = buildHexFlowerOutline(2, 50, false);
      expect(outline.length).toBe(18);
    });

    it('size=3 のとき外周は30頂点', () => {
      const outline = buildHexFlowerOutline(3, 50, true);
      expect(outline.length).toBe(30);
    });

    it('flat-top と pointy-top で頂点数は同じ', () => {
      for (const size of [1, 2, 3, 4]) {
        const flat = buildHexFlowerOutline(size, 50, true);
        const pointy = buildHexFlowerOutline(size, 50, false);
        expect(flat.length).toBe(pointy.length);
      }
    });

    it('アウトラインは原点を中心に対称', () => {
      const outline = buildHexFlowerOutline(2, 50, true);
      const cx = outline.reduce((s, v) => s + v.x, 0) / outline.length;
      const cy = outline.reduce((s, v) => s + v.y, 0) / outline.length;
      expect(cx).toBeCloseTo(0, 3);
      expect(cy).toBeCloseTo(0, 3);
    });
  });

  describe('insetPolygon', () => {
    it('正方形を内側にインセットする', () => {
      const square = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ];
      const inset = insetPolygon(square, 1);
      expect(inset).toHaveLength(4);
      // CW の正方形を bw=1 でインセットすると各辺が内側に1px移動
      expect(inset[0].x).toBeCloseTo(1, 5);
      expect(inset[0].y).toBeCloseTo(1, 5);
      expect(inset[1].x).toBeCloseTo(9, 5);
      expect(inset[1].y).toBeCloseTo(1, 5);
      expect(inset[2].x).toBeCloseTo(9, 5);
      expect(inset[2].y).toBeCloseTo(9, 5);
      expect(inset[3].x).toBeCloseTo(1, 5);
      expect(inset[3].y).toBeCloseTo(9, 5);
    });

    it('bw=0 なら元のポリゴンと同一座標を返す', () => {
      const triangle = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 5, y: 8 },
      ];
      const inset = insetPolygon(triangle, 0);
      for (let i = 0; i < triangle.length; i++) {
        expect(inset[i].x).toBeCloseTo(triangle[i].x, 10);
        expect(inset[i].y).toBeCloseTo(triangle[i].y, 10);
      }
    });

    it('ヘクスのアウトラインに適用してもクラッシュしない', () => {
      const outline = buildHexFlowerOutline(2, 50, true);
      const inset = insetPolygon(outline, 3);
      expect(inset).toHaveLength(outline.length);
      // インセット後のポリゴンは元のポリゴンより小さい（bbox が縮小）
      const origMinX = Math.min(...outline.map((v) => v.x));
      const origMaxX = Math.max(...outline.map((v) => v.x));
      const insetMinX = Math.min(...inset.map((v) => v.x));
      const insetMaxX = Math.max(...inset.map((v) => v.x));
      expect(insetMinX).toBeGreaterThan(origMinX);
      expect(insetMaxX).toBeLessThan(origMaxX);
    });
  });

  describe('buildHexRingClipPath', () => {
    it('evenodd パス文字列を返す', () => {
      const outline = buildHexFlowerOutline(1, 50, true);
      const bbox = {
        minX: Math.min(...outline.map((v) => v.x)),
        minY: Math.min(...outline.map((v) => v.y)),
        maxX: Math.max(...outline.map((v) => v.x)),
        maxY: Math.max(...outline.map((v) => v.y)),
      };
      const clipPath = buildHexRingClipPath(outline, bbox, 2);
      expect(clipPath).toContain('path(evenodd,');
      expect(clipPath).toContain('M ');
      expect(clipPath).toContain(' Z');
    });

    it('外側と内側の2つのサブパスを含む', () => {
      const outline = buildHexFlowerOutline(1, 50, true);
      const bbox = {
        minX: Math.min(...outline.map((v) => v.x)),
        minY: Math.min(...outline.map((v) => v.y)),
        maxX: Math.max(...outline.map((v) => v.x)),
        maxY: Math.max(...outline.map((v) => v.y)),
      };
      const clipPath = buildHexRingClipPath(outline, bbox, 2);
      // 'M' の出現回数 = 2 (outer + inner)
      const mCount = (clipPath.match(/M /g) ?? []).length;
      expect(mCount).toBe(2);
      // 'Z' の出現回数 = 2
      const zCount = (clipPath.match(/ Z/g) ?? []).length;
      expect(zCount).toBe(2);
    });
  });

  describe('calcHexFlowerParams', () => {
    it('size を 1〜6 にクランプする', () => {
      const p0 = calcHexFlowerParams(0, 50, true);
      // size=0 → clamp to 1
      expect(p0.outline).toHaveLength(6);

      const p7 = calcHexFlowerParams(7, 50, true);
      // size=7 → clamp to 6
      expect(p7.outline.length).toBe(calcHexFlowerParams(6, 50, true).outline.length);
    });

    it('小数の size は頂点クラスターアウトラインを使用する', () => {
      const p = calcHexFlowerParams(1.5, 50, true);
      const cluster = buildVertexClusterOutline(1.5, 50, true);
      expect(p.outline.length).toBe(cluster.length);
    });

    it('size 2.5 は6セルクラスターアウトラインを使用する', () => {
      const p = calcHexFlowerParams(2.5, 50, true);
      const cluster = buildVertexClusterOutline(2.5, 50, true);
      expect(p.outline.length).toBe(cluster.length);
    });

    it('L = size * gridSize', () => {
      const p = calcHexFlowerParams(3, 50, true);
      expect(p.L).toBe(3 * 50);
    });

    it('g = gridSize', () => {
      const p = calcHexFlowerParams(2, 60, false);
      expect(p.g).toBe(60);
    });

    it('bbox がアウトラインを包含する', () => {
      const p = calcHexFlowerParams(3, 50, true);
      for (const v of p.outline) {
        expect(v.x).toBeGreaterThanOrEqual(p.bbox.minX - 1e-9);
        expect(v.x).toBeLessThanOrEqual(p.bbox.maxX + 1e-9);
        expect(v.y).toBeGreaterThanOrEqual(p.bbox.minY - 1e-9);
        expect(v.y).toBeLessThanOrEqual(p.bbox.maxY + 1e-9);
      }
    });

    it('flat-top と pointy-top で同サイズの bbox になる（対称性）', () => {
      const flat = calcHexFlowerParams(2, 50, true);
      const pointy = calcHexFlowerParams(2, 50, false);
      const flatW = flat.bbox.maxX - flat.bbox.minX;
      const flatH = flat.bbox.maxY - flat.bbox.minY;
      const pointyW = pointy.bbox.maxX - pointy.bbox.minX;
      const pointyH = pointy.bbox.maxY - pointy.bbox.minY;
      // flat-top の幅 ≈ pointy-top の高さ、flat-top の高さ ≈ pointy-top の幅
      expect(flatW).toBeCloseTo(pointyH, 5);
      expect(flatH).toBeCloseTo(pointyW, 5);
    });
  });

  describe('buildVertexClusterOutline', () => {
    it('size 1.5: 3ヘクスの外周パスを返す（12頂点）', () => {
      const outline = buildVertexClusterOutline(1.5, 50, true);
      // 3 hexes sharing a vertex: 3*6=18 edges - 3*2=6 shared edges = 12 boundary edges
      expect(outline).toHaveLength(12);
    });

    it('size 2.5: 6ヘクスクラスターの外周パスを返す（18頂点）', () => {
      const flat = buildVertexClusterOutline(2.5, 50, true);
      // 6 cells: 6*6=36 edges - 2*9=18 shared = 18 boundary edges
      expect(flat).toHaveLength(18);
      const pointy = buildVertexClusterOutline(2.5, 50, false);
      expect(pointy).toHaveLength(18);
    });

    it('size 3.5: 12ヘクスクラスターの外周パスを返す（24頂点）', () => {
      const flat = buildVertexClusterOutline(3.5, 50, true);
      // 12 cells: 12*6=72 edges - 2*24=48 shared = 24 boundary edges
      expect(flat).toHaveLength(24);
      const pointy = buildVertexClusterOutline(3.5, 50, false);
      expect(pointy).toHaveLength(24);
    });

    it('flat-top と pointy-top で同じ頂点数', () => {
      for (const size of [1.5, 2.5, 3.5, 4.5]) {
        const flat = buildVertexClusterOutline(size, 50, true);
        const pointy = buildVertexClusterOutline(size, 50, false);
        expect(flat.length).toBe(pointy.length);
      }
    });

    it('アウトラインの重心が原点付近にある', () => {
      for (const size of [1.5, 2.5, 3.5]) {
        const outline = buildVertexClusterOutline(size, 50, true);
        const cx = outline.reduce((s, v) => s + v.x, 0) / outline.length;
        const cy = outline.reduce((s, v) => s + v.y, 0) / outline.length;
        expect(Math.abs(cx)).toBeLessThan(5);
        expect(Math.abs(cy)).toBeLessThan(5);
      }
    });

    it('サイズが大きくなるほど頂点数が増える', () => {
      const v15 = buildVertexClusterOutline(1.5, 50, true).length;
      const v25 = buildVertexClusterOutline(2.5, 50, true).length;
      const v35 = buildVertexClusterOutline(3.5, 50, true).length;
      expect(v25).toBeGreaterThan(v15);
      expect(v35).toBeGreaterThan(v25);
    });
  });
});
