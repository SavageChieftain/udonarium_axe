import { GridType } from '@axe/domain/tabletop/game-table';
import { GridLineRender } from '@axe/features/tabletop/game-table/grid-line-render';

function createCanvasMock() {
  const canvas = document.createElement('canvas');
  const context = {
    beginPath: vi.fn(),
    closePath: vi.fn(),
    fillText: vi.fn(),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    stroke: vi.fn(),
    strokeRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    transform: vi.fn(),
    fillStyle: '',
    font: '',
    lineWidth: 0,
    strokeStyle: '',
    textAlign: '',
    textBaseline: '',
  } as unknown as CanvasRenderingContext2D;
  vi.spyOn(canvas, 'getContext').mockReturnValue(context);
  return { canvas, context };
}

describe('GridLineRender', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('renderViewport', () => {
    it('ピクセル範囲のキャンバスサイズでスクウェアグリッドを描画すること', () => {
      const { canvas, context } = createCanvasMock();

      new GridLineRender(canvas).renderViewport(100, 100, 50, GridType.SQUARE, '#000', '#000', 25, 75);

      expect(canvas.width).toBe(100);
      expect(canvas.height).toBe(100);
      expect(context.strokeRect).toHaveBeenCalledWith(-25, -25, 50, 50);
      expect(context.fillText).toHaveBeenCalledWith('2-1', 0, 0);
    });

    it('ピクセル範囲のキャンバスサイズでヘクスグリッドを描画すること', () => {
      const { canvas, context } = createCanvasMock();

      new GridLineRender(canvas).renderViewport(173.2, 129.4, 50, GridType.HEX_VERTICAL, '#000', '#000', 0, 0);

      expect(canvas.width).toBe(174);
      expect(canvas.height).toBe(130);
      expect(context.stroke).toHaveBeenCalled();
      expect(context.fillText).toHaveBeenCalled();
    });

    it('ラベルに接頭辞 (壁の向き) を付与すること', () => {
      const { canvas, context } = createCanvasMock();

      new GridLineRender(canvas).renderViewport(100, 100, 50, GridType.SQUARE, '#000', '#000', 25, 75, true, 'N');

      expect(context.fillText).toHaveBeenCalledWith('N-2-1', 0, 0);
    });

    it('ラベル変換行列を各ラベルへ適用すること (壁の鏡像補正)', () => {
      const { canvas, context } = createCanvasMock();

      new GridLineRender(canvas).renderViewport(
        50,
        50,
        50,
        GridType.SQUARE,
        '#000',
        '#000',
        0,
        0,
        true,
        'S',
        [-1, 0, 0, 1]
      );

      expect(context.translate).toHaveBeenCalledWith(25, 25);
      expect(context.transform).toHaveBeenCalledWith(-1, 0, 0, 1, 0, 0);
      expect(context.fillText).toHaveBeenCalledWith('S-1-1', 0, 0);
    });

    it('drawLabels=false ならラベルを描画しないこと', () => {
      const { canvas, context } = createCanvasMock();

      new GridLineRender(canvas).renderViewport(100, 100, 50, GridType.SQUARE, '#000', '#000', 0, 0, false);

      expect(context.fillText).not.toHaveBeenCalled();
    });
  });
});
