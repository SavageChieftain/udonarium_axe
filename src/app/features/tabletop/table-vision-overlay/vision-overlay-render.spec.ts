import { OverlayPlan, OverlayShape } from '@axe/domain/tabletop/vision-scene';
import {
  animationIntensity,
  drawOverlayPlan,
  hexToRgba,
} from '@axe/features/tabletop/table-vision-overlay/vision-overlay-render';

interface Op {
  name: string;
  args: unknown[];
  composite: string;
  alpha: number;
}

function fakeContext(): { ctx: CanvasRenderingContext2D; ops: Op[] } {
  const ops: Op[] = [];
  const state = { globalCompositeOperation: 'source-over', globalAlpha: 1, fillStyle: '' as unknown, filter: 'none' };
  const record =
    (name: string) =>
    (...args: unknown[]) =>
      ops.push({ name, args, composite: state.globalCompositeOperation, alpha: state.globalAlpha });
  const ctx = {
    get globalCompositeOperation() {
      return state.globalCompositeOperation;
    },
    set globalCompositeOperation(v: string) {
      state.globalCompositeOperation = v;
    },
    get globalAlpha() {
      return state.globalAlpha;
    },
    set globalAlpha(v: number) {
      state.globalAlpha = v;
    },
    get fillStyle() {
      return state.fillStyle;
    },
    set fillStyle(v: unknown) {
      state.fillStyle = v;
    },
    clearRect: record('clearRect'),
    fillRect: record('fillRect'),
    beginPath: record('beginPath'),
    arc: record('arc'),
    fill: record('fill'),
    save: record('save'),
    restore: record('restore'),
    clip: record('clip'),
    moveTo: record('moveTo'),
    lineTo: record('lineTo'),
    closePath: record('closePath'),
    setTransform: record('setTransform'),
    translate: record('translate'),
    drawImage: record('drawImage'),
    get filter() {
      return state.filter;
    },
    set filter(v: string) {
      state.filter = v;
    },
    createRadialGradient: () => ({ addColorStop: () => undefined }),
    createLinearGradient: () => ({ addColorStop: () => undefined }),
  } as unknown as CanvasRenderingContext2D;
  return { ctx, ops };
}

function shape(partial: Partial<OverlayShape> = {}): OverlayShape {
  return {
    x: 100,
    y: 100,
    brightPx: 50,
    dimPx: 100,
    angle: 360,
    direction: 0,
    color: '#ffffff',
    full: false,
    ...partial,
  };
}

describe('vision-overlay-render', () => {
  describe('hexToRgba', () => {
    it('#rrggbb を rgba に変換', () => {
      expect(hexToRgba('#ff8800', 0.5)).toBe('rgba(255, 136, 0, 0.5)');
    });
    it('#rgb を展開する', () => {
      expect(hexToRgba('#fff', 1)).toBe('rgba(255, 255, 255, 1)');
    });
    it('不正な値は白にフォールバック', () => {
      expect(hexToRgba('nonsense', 0.2)).toBe('rgba(255, 255, 255, 0.2)');
    });
  });

  describe('animationIntensity', () => {
    it('none/未指定は常に 1', () => {
      expect(animationIntensity('none', 1234)).toBe(1);
      expect(animationIntensity(undefined, 1234)).toBe(1);
    });
    it('pulse は 0..1 の範囲で時間変動する', () => {
      const a = animationIntensity('pulse', 0);
      const b = animationIntensity('pulse', 550);
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThanOrEqual(1);
      expect(a).not.toBe(b);
    });
    it('flicker も範囲内で変動する', () => {
      const a = animationIntensity('flicker', 100);
      const b = animationIntensity('flicker', 900);
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThanOrEqual(1);
      expect(a).not.toBe(b);
    });
  });

  describe('drawOverlayPlan', () => {
    it('GM プラン（darknessAlpha=0）は暗闇 fillRect を描かずグローのみ', () => {
      const plan: OverlayPlan = {
        darknessAlpha: 0,
        darknessColor: '#05060a',
        baseRevealAlpha: 0,
        reveals: [],
        glows: [shape()],
        shadows: [],
      };
      const { ctx, ops } = fakeContext();
      drawOverlayPlan(ctx, plan, 1000, 1000);

      expect(ops.some((o) => o.name === 'fillRect')).toBe(false);
      expect(ops.some((o) => o.name === 'fill' && o.composite === 'lighter')).toBe(true);
      expect(ctx.globalCompositeOperation).toBe('source-over');
    });

    it('PL プランは暗闇を塗り destination-out で reveal を彫る', () => {
      const plan: OverlayPlan = {
        darknessAlpha: 0.9,
        darknessColor: '#05060a',
        baseRevealAlpha: 0,
        reveals: [shape()],
        glows: [shape()],
        shadows: [],
      };
      const { ctx, ops } = fakeContext();
      drawOverlayPlan(ctx, plan, 1000, 1000);

      const darknessFill = ops.find((o) => o.name === 'fillRect');
      expect(darknessFill?.composite).toBe('source-over');
      expect(darknessFill?.alpha).toBeCloseTo(0.9);
      expect(ops.some((o) => o.name === 'fill' && o.composite === 'destination-out')).toBe(true);
      expect(ctx.globalCompositeOperation).toBe('source-over');
      expect(ctx.globalAlpha).toBe(1);
    });

    it('baseRevealAlpha>0 は全面 destination-out fillRect を追加', () => {
      const plan: OverlayPlan = {
        darknessAlpha: 0.5,
        darknessColor: '#05060a',
        baseRevealAlpha: 0.4,
        reveals: [],
        glows: [],
        shadows: [],
      };
      const { ctx, ops } = fakeContext();
      drawOverlayPlan(ctx, plan, 1000, 1000);
      const reveals = ops.filter((o) => o.name === 'fillRect' && o.composite === 'destination-out');
      expect(reveals).toHaveLength(1);
      expect(reveals[0].alpha).toBeCloseTo(0.4);
    });

    it('コーン形状は save/clip/restore で囲う', () => {
      const plan: OverlayPlan = {
        darknessAlpha: 0.9,
        darknessColor: '#05060a',
        baseRevealAlpha: 0,
        reveals: [shape({ angle: 60, direction: 90 })],
        glows: [],
        shadows: [],
      };
      const { ctx, ops } = fakeContext();
      drawOverlayPlan(ctx, plan, 100, 100);
      expect(ops.some((o) => o.name === 'clip')).toBe(true);
      expect(ops.some((o) => o.name === 'restore')).toBe(true);
    });

    it('画像付きの影は drawImage で画像シルエットを変形描画する', () => {
      const plan: OverlayPlan = {
        darknessAlpha: 0.9,
        darknessColor: '#05060a',
        baseRevealAlpha: 0,
        reveals: [],
        glows: [],
        shadows: [{ x: 100, y: 100, fx: 100, fy: 400, width: 50, color: '#05060a', imageUrl: 'token.png', points: [] }],
      };
      const img = { complete: true, naturalWidth: 10, width: 10, height: 20 } as unknown as HTMLImageElement;
      const images = new Map<string, HTMLImageElement>([['token.png', img]]);
      const { ctx, ops } = fakeContext();
      drawOverlayPlan(ctx, plan, 1000, 1000, 0, images);
      expect(ops.some((o) => o.name === 'drawImage')).toBe(true);
      expect(ops.some((o) => o.name === 'setTransform')).toBe(true);
    });

    it('画像が無い影は塗りで台形を描く', () => {
      const plan: OverlayPlan = {
        darknessAlpha: 0.9,
        darknessColor: '#05060a',
        baseRevealAlpha: 0,
        reveals: [],
        glows: [],
        shadows: [
          {
            x: 100,
            y: 100,
            fx: 100,
            fy: 400,
            width: 50,
            color: '#05060a',
            imageUrl: '',
            points: [
              { x: 75, y: 100 },
              { x: 50, y: 400 },
              { x: 150, y: 400 },
              { x: 125, y: 100 },
            ],
          },
        ],
      };
      const { ctx, ops } = fakeContext();
      drawOverlayPlan(ctx, plan, 1000, 1000);
      expect(ops.some((o) => o.name === 'drawImage')).toBe(false);
      expect(ops.some((o) => o.name === 'fill')).toBe(true);
    });

    it('clipPolygon は moveTo/lineTo でパスを作り clip する', () => {
      const plan: OverlayPlan = {
        darknessAlpha: 0.9,
        darknessColor: '#05060a',
        baseRevealAlpha: 0,
        reveals: [
          shape({
            clipPolygon: [
              { x: 0, y: 0 },
              { x: 100, y: 0 },
              { x: 100, y: 100 },
            ],
          }),
        ],
        glows: [],
        shadows: [],
      };
      const { ctx, ops } = fakeContext();
      drawOverlayPlan(ctx, plan, 100, 100);
      expect(ops.some((o) => o.name === 'lineTo')).toBe(true);
      expect(ops.some((o) => o.name === 'clip')).toBe(true);
    });
  });
});
