import { GridType } from '@axe/domain/tabletop/game-table';
import { RangeRenderSetting } from '@axe/features/tabletop/range/range-render-types';
import {
  calcGridOffsets,
  chkInCircle,
  chkOuterProduct,
  fillSquare,
  generateCalcGridPositionFunc,
  isHexGrid,
  makeBrush,
} from '@axe/features/tabletop/range/range-render-util';

function makeDefaultSetting(overrides: Partial<RangeRenderSetting> = {}): RangeRenderSetting {
  return {
    areaWidth: 10,
    areaHeight: 10,
    range: 3,
    width: 1,
    centerX: 0,
    centerY: 0,
    gridSize: 50,
    type: 'CIRCLE',
    gridColor: '#ff0000',
    rangeColor: '#0000ff',
    fanDegree: 360,
    degree: 0,
    offSetX: false,
    offSetY: false,
    fillOutLine: false,
    gridType: GridType.SQUARE,
    isDocking: false,
    ...overrides,
  };
}

describe('range-render-util', () => {
  describe('isHexGrid', () => {
    it('HEX_VERTICAL は true', () => {
      expect(isHexGrid(GridType.HEX_VERTICAL)).toBe(true);
    });

    it('HEX_HORIZONTAL は true', () => {
      expect(isHexGrid(GridType.HEX_HORIZONTAL)).toBe(true);
    });

    it('SQUARE は false', () => {
      expect(isHexGrid(GridType.SQUARE)).toBe(false);
    });

    it('NONE は false', () => {
      expect(isHexGrid(GridType.NONE)).toBe(false);
    });
  });

  describe('calcGridOffsets', () => {
    it('centerX=0, centerY=0 で gridOff が 0 以下', () => {
      const setting = makeDefaultSetting({ centerX: 0, centerY: 0, gridSize: 50, areaWidth: 10, areaHeight: 10 });
      const offsets = calcGridOffsets(setting);
      expect(offsets.gridSize).toBe(50);
      expect(offsets.offSetX_px).toBe(250); // (10*50)/2
      expect(offsets.offSetY_px).toBe(250);
      expect(offsets.gridOffX).toBeLessThanOrEqual(0);
      expect(offsets.gridOffY).toBeLessThanOrEqual(0);
    });

    it('centerX=75 で gridOffX が正しく計算される', () => {
      const setting = makeDefaultSetting({ centerX: 75, centerY: 0, gridSize: 50 });
      const offsets = calcGridOffsets(setting);
      // centerX % gridSize = 75 % 50 = 25 → gridOffX = -25
      expect(offsets.gridOffX).toBe(-25);
    });

    it('offSetX=true で gridOffX がハーフグリッド調整される', () => {
      const setting = makeDefaultSetting({ centerX: 0, centerY: 0, gridSize: 50, offSetX: true });
      const offsets = calcGridOffsets(setting);
      // gridOffX 初期値=0 → 0 < -0.5 は false → gridOffX -= 25
      expect(offsets.gridOffX).toBe(-25);
    });

    it('offSetY=true で gridOffY がハーフグリッド調整される', () => {
      const setting = makeDefaultSetting({ centerX: 0, centerY: 0, gridSize: 50, offSetY: true });
      const offsets = calcGridOffsets(setting);
      expect(offsets.gridOffY).toBe(-25);
    });
  });

  describe('generateCalcGridPositionFunc', () => {
    it('SQUARE: w * gridSize, h * gridSize を返す', () => {
      const fn = generateCalcGridPositionFunc(GridType.SQUARE, 0, 0, 10, 10, 50);
      const pos = fn(3, 5);
      expect(pos.gx).toBe(150);
      expect(pos.gy).toBe(250);
    });

    it('HEX_VERTICAL: 奇数列で半行オフセットがかかる', () => {
      const fn = generateCalcGridPositionFunc(GridType.HEX_VERTICAL, 0, 0, 10, 10, 50);
      // _gridPos は共有可変オブジェクトなのでプリミティブ値で即時キャプチャ
      const evenGy = fn(0, 2).gy;
      const oddGy = fn(1, 2).gy;
      // 偶数列と奇数列で gy が gridSize/2 ずれる
      expect(Math.abs(evenGy - oddGy)).toBe(25);
    });

    it('HEX_HORIZONTAL: 奇数行で半列オフセットがかかる', () => {
      const fn = generateCalcGridPositionFunc(GridType.HEX_HORIZONTAL, 0, 0, 10, 10, 50);
      const evenGx = fn(2, 0).gx;
      const oddGx = fn(2, 1).gx;
      // 偶数行と奇数行で gx が gridSize/2 ずれる
      expect(Math.abs(evenGx - oddGx)).toBe(25);
    });
  });

  describe('chkOuterProduct', () => {
    it('CW 多角形の内側の点で true', () => {
      // CW 四角形の辺 (0,0)→(10,0) に対して内側の点 (5,5)
      expect(chkOuterProduct(0, 0, 10, 0, 5, 5)).toBe(true);
    });

    it('CW 多角形の外側の点で false', () => {
      // CW 四角形の辺 (0,0)→(10,0) に対して外側の点 (5,-5)
      expect(chkOuterProduct(0, 0, 10, 0, 5, -5)).toBe(false);
    });

    it('辺上の点で true（丸め誤差許容）', () => {
      expect(chkOuterProduct(0, 0, 10, 0, 5, 0)).toBe(true);
    });
  });

  describe('chkInCircle', () => {
    it('円内の点で true', () => {
      expect(chkInCircle(10, 3, 4)).toBe(true);
    });

    it('円外の点で false', () => {
      expect(chkInCircle(5, 4, 4)).toBe(false);
    });

    it('円周上の点で true', () => {
      expect(chkInCircle(5, 3, 4)).toBe(true);
    });

    it('原点で true', () => {
      expect(chkInCircle(1, 0, 0)).toBe(true);
    });
  });

  describe('fillSquare', () => {
    it('fillRect を呼び出す', () => {
      const ctx = {
        fillRect: vi.fn(),
      } as unknown as CanvasRenderingContext2D;
      fillSquare(ctx, 10, 20, 50);
      expect(ctx.fillRect).toHaveBeenCalledWith(10, 20, 50, 50);
    });
  });

  describe('makeBrush', () => {
    it('context のスタイルを設定する', () => {
      const ctx = {
        strokeStyle: '',
        fillStyle: '',
        lineWidth: 0,
        font: '',
        textBaseline: '',
        textAlign: '',
      } as unknown as CanvasRenderingContext2D;
      const result = makeBrush(ctx, 50, '#ff0000');
      expect(result).toBe(ctx);
      expect(ctx.strokeStyle).toBe('#ff0000');
      expect(ctx.fillStyle).toBe('#ff0000');
      expect(ctx.lineWidth).toBe(1);
      expect(ctx.font).toContain('bold');
      expect(ctx.font).toContain('sans-serif');
      expect(ctx.textBaseline).toBe('top');
      expect(ctx.textAlign).toBe('center');
    });
  });
});
