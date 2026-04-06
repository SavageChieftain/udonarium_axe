import { GridType } from '@axe/domain/tabletop/game-table';
import {
  buildHexOuterBorderSvg,
  buildHexOutlineMask,
  buildMaskCss,
  buildScratchingGridInfos,
  computeHexMaskGeometry,
  type ScratchGridInfo,
} from '@axe/features/tabletop/game-table-mask/game-table-mask-helpers';
import { describe, expect, it } from 'vitest';

describe('game-table-mask-helpers', () => {
  describe('buildMaskCss', () => {
    it('preview では scratched と scratching の差分だけを非表示にすること', () => {
      const css = buildMaskCss({
        currentScratchingSet: new Set(['1:0']),
        gridSize: 50,
        gridType: GridType.SQUARE,
        height: 1,
        isNonScratched: false,
        isPreviewMode: true,
        scratchedGrids: '0:0',
        scratchingGrids: '',
        width: 2,
      });

      expect(css).toBe('radial-gradient(#000, #000) 0px 0px / 0px 0px no-repeat');
    });

    it('通常モードでは scratched 済みグリッドを除外すること', () => {
      const css = buildMaskCss({
        currentScratchingSet: null,
        gridSize: 50,
        gridType: GridType.SQUARE,
        height: 1,
        isNonScratched: false,
        isPreviewMode: false,
        scratchedGrids: '0:0',
        scratchingGrids: '',
        width: 2,
      });

      expect(css).toBe('radial-gradient(#000, #000) 49px -1px / 52px 52px no-repeat');
    });

    it('preview で scratched と scratching が一致する場合はそのグリッドを表示すること', () => {
      const css = buildMaskCss({
        currentScratchingSet: null,
        gridSize: 50,
        gridType: GridType.SQUARE,
        height: 1,
        isNonScratched: false,
        isPreviewMode: true,
        scratchedGrids: '0:0',
        scratchingGrids: '0:0',
        width: 1,
      });

      expect(css).toBe('radial-gradient(#000, #000) -1px -1px / 52px 52px no-repeat');
    });

    it('通常モードかつ未スクラッチ時は空文字を返すこと', () => {
      const css = buildMaskCss({
        currentScratchingSet: null,
        gridSize: 50,
        gridType: GridType.SQUARE,
        height: 2,
        isNonScratched: true,
        isPreviewMode: false,
        scratchedGrids: '',
        scratchingGrids: '',
        width: 2,
      });

      expect(css).toBe('');
    });
  });

  describe('buildScratchingGridInfos', () => {
    it('scratched のみなら scrached 状態を返すこと', () => {
      const infos = buildScratchingGridInfos({
        currentScratchingSet: null,
        gridSize: 50,
        gridType: GridType.SQUARE,
        hasGameTableMask: true,
        height: 1,
        isNonScratched: false,
        isNonScratching: true,
        scratchedGrids: '0:0',
        scratchingGrids: '',
        width: 1,
      });

      expect(infos).toEqual([{ cx: 25, cy: 25, state: 'scrached', x: 0, y: 0 } satisfies ScratchGridInfo]);
    });

    it('scratching のみなら scraching 状態を返すこと', () => {
      const infos = buildScratchingGridInfos({
        currentScratchingSet: new Set(['0:0']),
        gridSize: 50,
        gridType: GridType.SQUARE,
        hasGameTableMask: true,
        height: 1,
        isNonScratched: true,
        isNonScratching: false,
        scratchedGrids: '',
        scratchingGrids: '',
        width: 1,
      });

      expect(infos).toEqual([{ cx: 25, cy: 25, state: 'scraching', x: 0, y: 0 } satisfies ScratchGridInfo]);
    });

    it('scratched と scratching の重複は restore 状態を返すこと', () => {
      const infos = buildScratchingGridInfos({
        currentScratchingSet: new Set(['0:0']),
        gridSize: 50,
        gridType: GridType.SQUARE,
        hasGameTableMask: true,
        height: 1,
        isNonScratched: false,
        isNonScratching: false,
        scratchedGrids: '0:0',
        scratchingGrids: '',
        width: 1,
      });

      expect(infos).toEqual([{ cx: 25, cy: 25, state: 'restore', x: 0, y: 0 } satisfies ScratchGridInfo]);
    });

    it('mask が無いか変化が無い場合は空配列を返すこと', () => {
      expect(
        buildScratchingGridInfos({
          currentScratchingSet: null,
          gridSize: 50,
          gridType: GridType.SQUARE,
          hasGameTableMask: false,
          height: 1,
          isNonScratched: true,
          isNonScratching: true,
          scratchedGrids: '',
          scratchingGrids: '',
          width: 1,
        })
      ).toEqual([]);
    });
  });

  describe('buildMaskCss (hex)', () => {
    it('HEX_VERTICAL で scratched 済みセルを除外した SVG マスクを生成すること', () => {
      const css = buildMaskCss({
        currentScratchingSet: null,
        gridSize: 50,
        gridType: GridType.HEX_VERTICAL,
        height: 1,
        isNonScratched: false,
        isPreviewMode: false,
        scratchedGrids: '0:0',
        scratchingGrids: '',
        width: 2,
      });

      expect(css).toContain('data:image/svg+xml');
      expect(css).toContain('polygon');
      // 0:0 はスクラッチ済みなので SVG に含まれないが、1:0 が残るので空にはならない
    });

    it('HEX_HORIZONTAL で全セルスクラッチ済みなら空マスクを返すこと', () => {
      // 1×1 の小さいマスクで全ヘクスセルをスクラッチ済みにする
      const css = buildMaskCss({
        currentScratchingSet: null,
        gridSize: 50,
        gridType: GridType.HEX_HORIZONTAL,
        height: 1,
        isNonScratched: false,
        isPreviewMode: false,
        scratchedGrids: '0:0,1:0,0:1,1:1',
        scratchingGrids: '',
        width: 1,
      });

      // すべてスクラッチ済みなら空マスクになるか、SVGにpolygonが含まれない
      expect(css).toSatisfy((v: string) => v.includes('0px 0px / 0px 0px') || !v.includes('<polygon'));
    });

    it('hex 未スクラッチ時もヘクス型マスクを返すこと', () => {
      const css = buildMaskCss({
        currentScratchingSet: null,
        gridSize: 50,
        gridType: GridType.HEX_VERTICAL,
        height: 2,
        isNonScratched: true,
        isPreviewMode: false,
        scratchedGrids: '',
        scratchingGrids: '',
        width: 2,
      });

      expect(css).toContain('data:image/svg+xml');
      expect(css).toContain('polygon');
    });
  });

  describe('buildScratchingGridInfos (hex)', () => {
    it('HEX_VERTICAL で scratched セルに hexPoints が含まれること', () => {
      const infos = buildScratchingGridInfos({
        currentScratchingSet: null,
        gridSize: 50,
        gridType: GridType.HEX_VERTICAL,
        hasGameTableMask: true,
        height: 1,
        isNonScratched: false,
        isNonScratching: true,
        scratchedGrids: '0:0',
        scratchingGrids: '',
        width: 1,
      });

      expect(infos).toHaveLength(1);
      expect(infos[0].state).toBe('scrached');
      expect(infos[0].hexPoints).toBeDefined();
      expect(infos[0].hexPoints!.split(' ')).toHaveLength(6);
      // オフセット (s, gridSize/2) が加算される
      const s = 50 / Math.sqrt(3);
      expect(infos[0].cx).toBeCloseTo(s, 5);
      expect(infos[0].cy).toBeCloseTo(25, 5);
    });

    it('HEX_HORIZONTAL で col=1 のセル中心がオフセットされること', () => {
      const infos = buildScratchingGridInfos({
        currentScratchingSet: null,
        gridSize: 50,
        gridType: GridType.HEX_HORIZONTAL,
        hasGameTableMask: true,
        height: 2,
        isNonScratched: false,
        isNonScratching: true,
        scratchedGrids: '0:1',
        scratchingGrids: '',
        width: 2,
      });

      expect(infos).toHaveLength(1);
      // pointy-top row=1 (odd) → x offset by colSpacing/2 + geometry offsetX (gridSize/2)
      expect(infos[0].cx).toBeCloseTo(50, 5);
      expect(infos[0].hexPoints).toBeDefined();
    });

    it('hex の scraching 状態にも hexPoints が設定されること', () => {
      const infos = buildScratchingGridInfos({
        currentScratchingSet: new Set(['1:0']),
        gridSize: 50,
        gridType: GridType.HEX_VERTICAL,
        hasGameTableMask: true,
        height: 1,
        isNonScratched: true,
        isNonScratching: false,
        scratchedGrids: '',
        scratchingGrids: '',
        width: 2,
      });

      const scraching = infos.find((i) => i.x === 1 && i.y === 0);
      expect(scraching).toBeDefined();
      expect(scraching!.state).toBe('scraching');
      expect(scraching!.hexPoints).toBeDefined();
    });
  });

  describe('buildHexOutlineMask', () => {
    it('HEX_VERTICAL で SVG マスクを返すこと', () => {
      const mask = buildHexOutlineMask(50, GridType.HEX_VERTICAL, 2, 2);
      expect(mask).toContain('data:image/svg+xml');
      expect(mask).toContain('polygon');
    });

    it('HEX_HORIZONTAL で SVG マスクを返すこと', () => {
      const mask = buildHexOutlineMask(50, GridType.HEX_HORIZONTAL, 2, 2);
      expect(mask).toContain('data:image/svg+xml');
      expect(mask).toContain('polygon');
    });

    it('SQUARE では空文字を返すこと', () => {
      expect(buildHexOutlineMask(50, GridType.SQUARE, 2, 2)).toBe('');
    });

    it('NONE では空文字を返すこと', () => {
      expect(buildHexOutlineMask(50, GridType.NONE, 2, 2)).toBe('');
    });
  });

  describe('computeHexMaskGeometry', () => {
    it('SQUARE では null を返すこと', () => {
      expect(computeHexMaskGeometry(4, 4, 50, GridType.SQUARE)).toBeNull();
    });

    it('HEX_VERTICAL (flat-top) で正しいピクセルサイズを計算すること', () => {
      const geo = computeHexMaskGeometry(4, 4, 50, GridType.HEX_VERTICAL)!;
      const s = 50 / Math.sqrt(3);
      expect(geo.offsetX).toBeCloseTo(s, 5);
      expect(geo.offsetY).toBeCloseTo(25, 5);
      expect(geo.pixelW).toBeCloseTo(2 * s + 3 * 1.5 * s, 5);
      // cols >= 2 → pixelH = rows * gridSize + gridSize / 2
      expect(geo.pixelH).toBeCloseTo(4 * 50 + 25, 5);
    });

    it('HEX_HORIZONTAL (pointy-top) で正しいピクセルサイズを計算すること', () => {
      const geo = computeHexMaskGeometry(4, 4, 50, GridType.HEX_HORIZONTAL)!;
      const s = 50 / Math.sqrt(3);
      expect(geo.offsetX).toBeCloseTo(25, 5);
      expect(geo.offsetY).toBeCloseTo(s, 5);
      // rows >= 2 → pixelW = cols * gridSize + gridSize / 2
      expect(geo.pixelW).toBeCloseTo(4 * 50 + 25, 5);
      expect(geo.pixelH).toBeCloseTo(2 * s + 3 * 1.5 * s, 5);
    });

    it('cols=1 のとき奇数列オフセットが不要なこと (flat-top)', () => {
      const geo = computeHexMaskGeometry(1, 4, 50, GridType.HEX_VERTICAL)!;
      // cols=1 → no odd column → pixelH = rows * gridSize
      expect(geo.pixelH).toBeCloseTo(4 * 50, 5);
    });
  });

  describe('buildHexOuterBorderSvg', () => {
    it('HEX_VERTICAL で外周の line 要素を含む data URI を返すこと', () => {
      const svg = buildHexOuterBorderSvg(50, GridType.HEX_VERTICAL, 3, 3);
      expect(svg).toContain('data:image/svg+xml');
      expect(svg).toContain('line');
      expect(svg).toContain('stroke');
    });

    it('HEX_HORIZONTAL で外周の line 要素を含む data URI を返すこと', () => {
      const svg = buildHexOuterBorderSvg(50, GridType.HEX_HORIZONTAL, 3, 3);
      expect(svg).toContain('data:image/svg+xml');
      expect(svg).toContain('line');
    });

    it('SQUARE では空文字を返すこと', () => {
      expect(buildHexOuterBorderSvg(50, GridType.SQUARE, 3, 3)).toBe('');
    });

    it('NONE では空文字を返すこと', () => {
      expect(buildHexOuterBorderSvg(50, GridType.NONE, 3, 3)).toBe('');
    });

    it('1x1 グリッドでは全6辺が外周になること', () => {
      const svg = buildHexOuterBorderSvg(50, GridType.HEX_VERTICAL, 1, 1);
      // 1 cell × 6 edges = 6 <line> elements
      const lineCount = (svg.match(/<line /g) || []).length;
      expect(lineCount).toBe(6);
    });

    it('2x2 グリッドでは内部辺が除外されること', () => {
      const svg1 = buildHexOuterBorderSvg(50, GridType.HEX_VERTICAL, 1, 1);
      const svg2 = buildHexOuterBorderSvg(50, GridType.HEX_VERTICAL, 2, 2);
      const count1 = (svg1.match(/<line /g) || []).length;
      const count2 = (svg2.match(/<line /g) || []).length;
      // 2x2 has fewer outer edges per cell than 1x1 (interior edges removed)
      // 4 cells × 6 edges = 24 total, minus shared internal edges
      expect(count2).toBeLessThan(4 * 6);
      expect(count2).toBeGreaterThan(count1);
    });
  });
});
