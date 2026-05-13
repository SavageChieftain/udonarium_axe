import { SlopeDirection } from '@axe/domain/tabletop/terrain';
import { computeHexSlopeSteps } from '@axe/features/tabletop/terrain/hex-slope-step-geometry';
import { calcHexFlowerParams } from '@axe/ui/tabletop/hex-pedestal-geometry';

describe('computeHexSlopeSteps', () => {
  const gridSize = 50;

  describe('無効な入力で空データを返す', () => {
    const bbox = { minX: -50, minY: -50, maxX: 50, maxY: 50 };

    it('slopeDir が NONE なら空', () => {
      const result = computeHexSlopeSteps(2, gridSize, true, SlopeDirection.NONE, 2, true, 100, 100, bbox);
      expect(result).toEqual({ floors: [], walls: [] });
    });

    it('size が 1 なら空（最小 2 必要）', () => {
      const result = computeHexSlopeSteps(1, gridSize, true, SlopeDirection.BOTTOM, 2, true, 100, 100, bbox);
      expect(result).toEqual({ floors: [], walls: [] });
    });

    it('size が小数なら空', () => {
      const result = computeHexSlopeSteps(2.5, gridSize, true, SlopeDirection.BOTTOM, 2, true, 100, 100, bbox);
      expect(result).toEqual({ floors: [], walls: [] });
    });
  });

  describe('size=2 flat-top ヘクス（7セル花形）', () => {
    const size = 2;
    const isFlatTop = true;
    const containerW = size * gridSize;
    const containerH = size * gridSize;
    const params = calcHexFlowerParams(size, gridSize, isFlatTop);
    const { bbox } = params;

    it('各方向でフロアが複数ステップ生成される', () => {
      for (const dir of [SlopeDirection.TOP, SlopeDirection.BOTTOM, SlopeDirection.LEFT, SlopeDirection.RIGHT]) {
        const result = computeHexSlopeSteps(size, gridSize, isFlatTop, dir, 2, true, containerW, containerH, bbox);
        expect(result.floors.length).toBeGreaterThan(1);
      }
    });

    it('各方向で壁が生成される', () => {
      for (const dir of [SlopeDirection.TOP, SlopeDirection.BOTTOM, SlopeDirection.LEFT, SlopeDirection.RIGHT]) {
        const result = computeHexSlopeSteps(size, gridSize, isFlatTop, dir, 2, true, containerW, containerH, bbox);
        expect(result.walls.length).toBeGreaterThan(0);
      }
    });

    it('フロアの heightPx が降順（level 0 が最も高い）', () => {
      const result = computeHexSlopeSteps(
        size,
        gridSize,
        isFlatTop,
        SlopeDirection.BOTTOM,
        3,
        true,
        containerW,
        containerH,
        bbox
      );
      for (let i = 1; i < result.floors.length; i++) {
        expect(result.floors[i].heightPx).toBeLessThan(result.floors[i - 1].heightPx);
      }
    });

    it('フロアのマスクは有効な data URI を含む', () => {
      const result = computeHexSlopeSteps(
        size,
        gridSize,
        isFlatTop,
        SlopeDirection.BOTTOM,
        2,
        true,
        containerW,
        containerH,
        bbox
      );
      for (const floor of result.floors) {
        expect(floor.mask).toContain('data:image/svg+xml');
        const svgPart = floor.mask.match(/charset=utf-8,(.+?)\)/);
        expect(svgPart).not.toBeNull();
        const decoded = decodeURIComponent(svgPart![1]);
        expect(decoded).toContain('<polygon');
        expect(decoded).toContain('<svg');
      }
    });

    it('壁の wallHeightPx がすべて正', () => {
      const result = computeHexSlopeSteps(
        size,
        gridSize,
        isFlatTop,
        SlopeDirection.TOP,
        2,
        true,
        containerW,
        containerH,
        bbox
      );
      for (const wall of result.walls) {
        expect(wall.wallHeightPx).toBeGreaterThan(0);
      }
    });

    it('壁の basePx が非負', () => {
      const result = computeHexSlopeSteps(
        size,
        gridSize,
        isFlatTop,
        SlopeDirection.LEFT,
        2,
        true,
        containerW,
        containerH,
        bbox
      );
      for (const wall of result.walls) {
        expect(wall.basePx).toBeGreaterThanOrEqual(0);
      }
    });

    it('useSurfaceShading=false の場合すべての壁の brightness が 1.0', () => {
      const result = computeHexSlopeSteps(
        size,
        gridSize,
        isFlatTop,
        SlopeDirection.BOTTOM,
        2,
        false,
        containerW,
        containerH,
        bbox
      );
      for (const wall of result.walls) {
        expect(wall.brightness).toBe(1.0);
      }
    });

    it('useSurfaceShading=true の場合壁の brightness が 0.3〜1.0 の範囲内', () => {
      const result = computeHexSlopeSteps(
        size,
        gridSize,
        isFlatTop,
        SlopeDirection.BOTTOM,
        2,
        true,
        containerW,
        containerH,
        bbox
      );
      for (const wall of result.walls) {
        expect(wall.brightness).toBeGreaterThanOrEqual(0.3);
        expect(wall.brightness).toBeLessThanOrEqual(1.0);
      }
    });
  });

  describe('size=2 pointy-top ヘクス', () => {
    const size = 2;
    const isFlatTop = false;
    const containerW = size * gridSize;
    const containerH = size * gridSize;
    const params = calcHexFlowerParams(size, gridSize, isFlatTop);
    const { bbox } = params;

    it('フロアが複数ステップ生成される', () => {
      const result = computeHexSlopeSteps(
        size,
        gridSize,
        isFlatTop,
        SlopeDirection.BOTTOM,
        2,
        true,
        containerW,
        containerH,
        bbox
      );
      expect(result.floors.length).toBeGreaterThan(1);
    });

    it('壁が生成される', () => {
      const result = computeHexSlopeSteps(
        size,
        gridSize,
        isFlatTop,
        SlopeDirection.RIGHT,
        2,
        true,
        containerW,
        containerH,
        bbox
      );
      expect(result.walls.length).toBeGreaterThan(0);
    });
  });

  describe('size=3 flat-top ヘクス（19セル花形）', () => {
    const size = 3;
    const isFlatTop = true;
    const containerW = size * gridSize;
    const containerH = size * gridSize;
    const params = calcHexFlowerParams(size, gridSize, isFlatTop);
    const { bbox } = params;

    it('size=2 よりフロアステップ数が多い', () => {
      const r2 = computeHexSlopeSteps(
        2,
        gridSize,
        true,
        SlopeDirection.BOTTOM,
        2,
        true,
        2 * gridSize,
        2 * gridSize,
        calcHexFlowerParams(2, gridSize, true).bbox
      );
      const r3 = computeHexSlopeSteps(
        size,
        gridSize,
        isFlatTop,
        SlopeDirection.BOTTOM,
        2,
        true,
        containerW,
        containerH,
        bbox
      );
      expect(r3.floors.length).toBeGreaterThan(r2.floors.length);
    });

    it('全フロアのマスク SVG に polygon が含まれる', () => {
      const result = computeHexSlopeSteps(
        size,
        gridSize,
        isFlatTop,
        SlopeDirection.TOP,
        3,
        true,
        containerW,
        containerH,
        bbox
      );
      for (const floor of result.floors) {
        const svgPart = floor.mask.match(/charset=utf-8,(.+?)\)/);
        const decoded = decodeURIComponent(svgPart![1]);
        expect(decoded).toContain('<polygon');
      }
    });
  });

  describe('対称性', () => {
    const size = 2;
    const isFlatTop = true;
    const containerW = size * gridSize;
    const containerH = size * gridSize;
    const params = calcHexFlowerParams(size, gridSize, isFlatTop);
    const { bbox } = params;

    it('TOP と BOTTOM で同じ数のフロアステップ・壁パネルを生成する', () => {
      const top = computeHexSlopeSteps(
        size,
        gridSize,
        isFlatTop,
        SlopeDirection.TOP,
        2,
        true,
        containerW,
        containerH,
        bbox
      );
      const bottom = computeHexSlopeSteps(
        size,
        gridSize,
        isFlatTop,
        SlopeDirection.BOTTOM,
        2,
        true,
        containerW,
        containerH,
        bbox
      );
      expect(top.floors.length).toBe(bottom.floors.length);
      expect(top.walls.length).toBe(bottom.walls.length);
    });

    it('LEFT と RIGHT で同じ数のフロアステップ・壁パネルを生成する', () => {
      const left = computeHexSlopeSteps(
        size,
        gridSize,
        isFlatTop,
        SlopeDirection.LEFT,
        2,
        true,
        containerW,
        containerH,
        bbox
      );
      const right = computeHexSlopeSteps(
        size,
        gridSize,
        isFlatTop,
        SlopeDirection.RIGHT,
        2,
        true,
        containerW,
        containerH,
        bbox
      );
      expect(left.floors.length).toBe(right.floors.length);
      expect(left.walls.length).toBe(right.walls.length);
    });
  });
});
