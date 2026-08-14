import { OverlayPlan, OverlayShape } from '@axe/domain/tabletop/vision-scene';
import {
  animationIntensity,
  bakeOverlayPlan,
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
    it('turns a six-digit colour into one with an alpha', () => {
      expect(hexToRgba('#ff8800', 0.5)).toBe('rgba(255, 136, 0, 0.5)');
    });
    it('expands a three-digit colour', () => {
      expect(hexToRgba('#fff', 1)).toBe('rgba(255, 255, 255, 1)');
    });
    it('falls back to white for anything it cannot read', () => {
      expect(hexToRgba('nonsense', 0.2)).toBe('rgba(255, 255, 255, 0.2)');
    });
  });

  describe('animationIntensity', () => {
    it('stays at full for no animation at all', () => {
      expect(animationIntensity('none', 1234)).toBe(1);
      expect(animationIntensity(undefined, 1234)).toBe(1);
    });
    it('moves a pulse through its range over time', () => {
      const a = animationIntensity('pulse', 0);
      const b = animationIntensity('pulse', 550);
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThanOrEqual(1);
      expect(a).not.toBe(b);
    });
    it('moves a flicker through it too', () => {
      const a = animationIntensity('flicker', 100);
      const b = animationIntensity('flicker', 900);
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThanOrEqual(1);
      expect(a).not.toBe(b);
    });
  });

  describe('drawOverlayPlan', () => {
    it('draws the glow alone for the game master, with no darkness behind it', () => {
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

    it('paints the darkness for a player and cuts what they can see out of it', () => {
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

    it('lifts the whole surface a little when the base reveal asks for it', () => {
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

    it('carries the origin of the surface into both the translation and the darkness', () => {
      const plan: OverlayPlan = {
        darknessAlpha: 0.9,
        darknessColor: '#05060a',
        baseRevealAlpha: 0,
        reveals: [],
        glows: [],
        shadows: [],
      };
      const { ctx, ops } = fakeContext();
      drawOverlayPlan(ctx, plan, 800, 600, 0, undefined, 10, { originX: -25, originY: -30 });

      expect(ops.find((o) => o.name === 'translate')?.args).toEqual([35, 40]);
      expect(ops.find((o) => o.name === 'fillRect')?.args).toEqual([-25, -30, 800, 600]);
    });

    it('paints the darkness over the cells rather than a rectangle when there are any', () => {
      const plan: OverlayPlan = {
        darknessAlpha: 0.9,
        darknessColor: '#05060a',
        baseRevealAlpha: 0,
        reveals: [],
        glows: [],
        shadows: [],
      };
      const cells = [
        [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
          { x: 5, y: 10 },
        ],
      ];
      const { ctx, ops } = fakeContext();
      drawOverlayPlan(ctx, plan, 800, 600, 0, undefined, 0, { originX: -25, originY: -30, cells });

      expect(ops.some((o) => o.name === 'fillRect')).toBe(false);
      expect(ops.filter((o) => o.name === 'lineTo')).toHaveLength(2);
      expect(ops.some((o) => o.name === 'fill' && o.composite === 'source-over')).toBe(true);
    });

    it('wraps a cone in a clip it puts back', () => {
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

    it('draws the silhouette of a picture for a shadow that has one', () => {
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

    it('fills a trapezium for a shadow that has none', () => {
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

    it('builds a path from the points and clips to it', () => {
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

describe('softening the shadows', () => {
  afterEach(() => vi.restoreAllMocks());

  function planWith(imageUrl: string): OverlayPlan {
    return {
      darknessAlpha: 0,
      darknessColor: '#05060a',
      baseRevealAlpha: 0,
      reveals: [],
      glows: [],
      shadows: [{ x: 100, y: 100, fx: 100, fy: 400, width: 50, color: '#05060a', imageUrl, points: [] }],
    };
  }

  it('bakes each picture once rather than softening it on every pass', () => {
    // There is a shadow for every light against every obstacle, and softening them all each frame runs into hundreds of milliseconds a pass.
    const bakes: string[] = [];
    vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
      if (tag !== 'canvas') return document.createElementNS('http://www.w3.org/1999/xhtml', tag);
      return {
        width: 0,
        height: 0,
        getContext: () => ({
          set filter(value: string) {
            bakes.push(value);
          },
          drawImage: () => undefined,
        }),
      } as unknown as HTMLElement;
    }) as typeof document.createElement);

    const img = { complete: true, naturalWidth: 10, width: 10, height: 20 } as unknown as HTMLImageElement;
    const images = new Map<string, HTMLImageElement>([['baked.png', img]]);

    for (let draw = 0; draw < 3; draw++) {
      const { ctx } = fakeContext();
      drawOverlayPlan(ctx, planWith('baked.png'), 400, 400, 0, images);
    }

    expect(bakes).toHaveLength(1);
    expect(bakes[0]).toContain('blur(');
  });
});

describe('the baked surfaces', () => {
  afterEach(() => vi.restoreAllMocks());

  function planWithDarkness(): OverlayPlan {
    return {
      darknessAlpha: 0.9,
      darknessColor: '#05060a',
      baseRevealAlpha: 0.2,
      reveals: [shape()],
      glows: [shape()],
      shadows: [],
    };
  }

  function stubCanvas(): Op[] {
    const { ctx, ops } = fakeContext();
    vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
      if (tag !== 'canvas') return document.createElementNS('http://www.w3.org/1999/xhtml', tag);
      return { width: 0, height: 0, getContext: () => ctx } as unknown as HTMLElement;
    }) as typeof document.createElement);
    return ops;
  }

  it('paints the darkness and what is cut out of it onto a surface', () => {
    const baked = stubCanvas();
    const bake = bakeOverlayPlan(planWithDarkness(), 800, 600, undefined, 10);

    expect(bake).not.toBeNull();
    expect(baked.some((o) => o.name === 'fillRect' && o.composite === 'source-over')).toBe(true);
    expect(baked.some((o) => o.name === 'fill' && o.composite === 'destination-out')).toBe(true);
    // The lights change over time, and baked in they would stop moving.
    expect(baked.some((o) => o.name === 'fill' && o.composite === 'lighter')).toBe(false);
  });

  it('puts the baked surfaces down and draws only the lights over them', () => {
    stubCanvas();
    const plan = planWithDarkness();
    const bake = bakeOverlayPlan(plan, 800, 600, undefined, 10);

    const { ctx, ops } = fakeContext();
    drawOverlayPlan(ctx, plan, 800, 600, 1000, undefined, 10, undefined, bake);

    expect(ops.filter((o) => o.name === 'drawImage')).toHaveLength(1);
    expect(ops.some((o) => o.name === 'fillRect')).toBe(false);
    expect(ops.some((o) => o.name === 'fill' && o.composite === 'destination-out')).toBe(false);
    expect(ops.some((o) => o.name === 'fill' && o.composite === 'lighter')).toBe(true);
  });

  it('throws a baked surface away once the size changes', () => {
    stubCanvas();
    const plan = planWithDarkness();
    const bake = bakeOverlayPlan(plan, 800, 600, undefined, 10);

    const { ctx, ops } = fakeContext();
    drawOverlayPlan(ctx, plan, 400, 300, 1000, undefined, 10, undefined, bake);

    expect(ops.some((o) => o.name === 'drawImage')).toBe(false);
    expect(ops.some((o) => o.name === 'fillRect')).toBe(true);
  });
});
