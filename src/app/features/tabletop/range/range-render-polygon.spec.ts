import { GridType } from '@axe/domain/tabletop/game-table';
import { renderSquare, renderTriangle } from '@axe/features/tabletop/range/range-render-polygon';
import { RangeRenderSetting } from '@axe/features/tabletop/range/range-render-types';

function createCanvasMock() {
  const canvas = document.createElement('canvas');
  const context = {
    arc: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    stroke: vi.fn(),
    strokeRect: vi.fn(),
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

function makeSetting(overrides: Partial<RangeRenderSetting> = {}): RangeRenderSetting {
  return {
    areaWidth: 10,
    areaHeight: 10,
    range: 1,
    width: 1,
    centerX: 0,
    centerY: 0,
    gridSize: 10,
    type: 'SQUARE',
    gridColor: '#ff0000',
    rangeColor: '#0000ff',
    fanDegree: 360,
    degree: 0,
    offSetX: false,
    offSetY: false,
    fillOutLine: true,
    gridType: GridType.SQUARE,
    isDocking: false,
    ...overrides,
  };
}

describe('range-render-polygon', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('四角形の頂点とクリップ範囲に回転角を反映すること', () => {
    const grid = createCanvasMock();
    const outline = createCanvasMock();

    const clip = renderSquare(grid.canvas, outline.canvas, makeSetting({ degree: 45 }));

    expect(clip.clip01x).toBeCloseTo(-20 * Math.SQRT2);
    expect(clip.clip01y).toBeCloseTo(0);
    expect(grid.context.moveTo).toHaveBeenCalledWith(50 - 10 * Math.SQRT2, 50);
  });

  it('三角形の頂点とクリップ範囲に回転角を反映すること', () => {
    const grid = createCanvasMock();
    const outline = createCanvasMock();

    const clip = renderTriangle(grid.canvas, outline.canvas, makeSetting({ degree: 90, type: 'TRIANGLE' }));

    expect(clip.clip01x).toBeCloseTo(12);
    expect(clip.clip01y).toBeCloseTo(0);
    expect(grid.context.moveTo).toHaveBeenCalledWith(60, 50);
  });
});
