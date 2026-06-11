import {
  CellLayer,
  createScene,
  FreehandLayer,
  MapScene,
  ShapeLayer,
  StampLayer,
  TextLayer,
  WallLayer,
} from '@axe/features/map-maker/model/scene';
import { RenderHelpers, renderScene } from '@axe/features/map-maker/render/render-scene';
import { describe, expect, it } from 'vitest';

interface Call {
  method: string;
  args: unknown[];
}

interface MockCtx {
  calls: Call[];
  counts(method: string): number;
}

function createMockCtx(): CanvasRenderingContext2D & MockCtx {
  const calls: Call[] = [];
  const record =
    (method: string) =>
    (...args: unknown[]) => {
      calls.push({ method, args });
    };
  const ctx: Record<string, unknown> = {
    calls,
    counts(method: string) {
      return calls.filter((c) => c.method === method).length;
    },
    globalAlpha: 1,
    fillStyle: '#000',
    strokeStyle: '#000',
    lineWidth: 1,
    lineJoin: 'miter',
    lineCap: 'butt',
    font: '10px sans-serif',
    textAlign: 'left',
    textBaseline: 'alphabetic',
  };
  for (const method of [
    'clearRect',
    'fillRect',
    'strokeRect',
    'save',
    'restore',
    'translate',
    'rotate',
    'scale',
    'beginPath',
    'closePath',
    'moveTo',
    'lineTo',
    'rect',
    'ellipse',
    'arc',
    'quadraticCurveTo',
    'fill',
    'stroke',
    'fillText',
    'drawImage',
  ]) {
    ctx[method] = record(method);
  }
  return ctx as unknown as CanvasRenderingContext2D & MockCtx;
}

const helpers: RenderHelpers = {
  texturePattern: () => '#abcabc',
  stampImage: () => ({}) as CanvasImageSource,
};

function sceneWith(...layers: MapScene['layers']): MapScene {
  const scene = createScene(2, 2, 10);
  scene.layers = layers;
  return scene;
}

describe('renderScene', () => {
  it('does not throw on an empty scene and clears + fills background', () => {
    const ctx = createMockCtx();
    expect(() => renderScene(ctx, createScene(2, 2, 10), helpers)).not.toThrow();
    expect(ctx.counts('clearRect')).toBe(1);
    expect(ctx.counts('fillRect')).toBeGreaterThanOrEqual(1);
  });

  it('is a graceful no-op when ctx is null-ish', () => {
    expect(() => renderScene(null as unknown as CanvasRenderingContext2D, createScene(), helpers)).not.toThrow();
  });

  it('draws cells via fillRect', () => {
    const layer: CellLayer = {
      id: 'c',
      kind: 'cell',
      name: 'cells',
      visible: true,
      locked: false,
      opacity: 1,
      cells: {
        '0,0': { type: 'solid', color: '#f00' },
        '1,1': { type: 'texture', textureId: 'grass', scale: 1, rotation: 0 },
      },
    };
    const ctx = createMockCtx();
    renderScene(ctx, sceneWith(layer), helpers, { drawGrid: false });
    const cellFills = ctx.calls.filter((c) => c.method === 'fillRect' && c.args[2] === 10 && c.args[3] === 10);
    expect(cellFills.length).toBe(2);
  });

  it('draws each shape kind without throwing', () => {
    const layer: ShapeLayer = {
      id: 's',
      kind: 'shape',
      name: 'shapes',
      visible: true,
      locked: false,
      opacity: 1,
      items: [
        {
          id: '1',
          shape: 'rect',
          points: [1, 1, 5, 5],
          fill: { type: 'solid', color: '#0f0' },
          stroke: { color: '#000', width: 1 },
          rotation: 30,
        },
        {
          id: '2',
          shape: 'ellipse',
          points: [0, 0, 8, 4],
          fill: null,
          stroke: { color: '#000', width: 1 },
          rotation: 0,
        },
        { id: '3', shape: 'line', points: [0, 0, 9, 9], fill: null, stroke: { color: '#000', width: 2 }, rotation: 0 },
        {
          id: '4',
          shape: 'polygon',
          points: [0, 0, 9, 0, 5, 9],
          fill: { type: 'texture', textureId: 'water', scale: 1, rotation: 0 },
          stroke: null,
          rotation: 0,
        },
      ],
    };
    const ctx = createMockCtx();
    renderScene(ctx, sceneWith(layer), helpers, { drawGrid: false });
    expect(ctx.counts('rect')).toBe(1);
    expect(ctx.counts('ellipse')).toBe(1);
    expect(ctx.counts('stroke')).toBeGreaterThanOrEqual(3);
    expect(ctx.counts('fill')).toBeGreaterThanOrEqual(2);
  });

  it('draws walls as stroked polylines', () => {
    const layer: WallLayer = {
      id: 'w',
      kind: 'wall',
      name: 'walls',
      visible: true,
      locked: false,
      opacity: 1,
      segments: [{ id: '1', points: [0, 0, 5, 5, 9, 0], thickness: 3, color: '#333' }],
    };
    const ctx = createMockCtx();
    renderScene(ctx, sceneWith(layer), helpers, { drawGrid: false });
    expect(ctx.counts('stroke')).toBe(1);
    expect(ctx.counts('lineTo')).toBe(2);
  });

  it('draws stamps via drawImage when image present and skips when null', () => {
    const items = [
      { id: '1', stampId: 'a', x: 5, y: 5, size: 4, rotation: 45, flipX: true, flipY: false, color: '#fff' },
      { id: '2', stampId: 'missing', x: 1, y: 1, size: 4, rotation: 0, flipX: false, flipY: false, color: null },
    ];
    const layer: StampLayer = {
      id: 'st',
      kind: 'stamp',
      name: 'stamps',
      visible: true,
      locked: false,
      opacity: 1,
      items,
    };
    const localHelpers: RenderHelpers = {
      texturePattern: () => null,
      stampImage: (item) => (item.stampId === 'a' ? ({} as CanvasImageSource) : null),
    };
    const ctx = createMockCtx();
    renderScene(ctx, sceneWith(layer), localHelpers, { drawGrid: false });
    expect(ctx.counts('drawImage')).toBe(1);
  });

  it('draws freehand strokes', () => {
    const layer: FreehandLayer = {
      id: 'f',
      kind: 'freehand',
      name: 'freehand',
      visible: true,
      locked: false,
      opacity: 1,
      strokes: [{ id: '1', points: [0, 0, 2, 3, 5, 1, 8, 8], color: '#111', width: 2 }],
    };
    const ctx = createMockCtx();
    renderScene(ctx, sceneWith(layer), helpers, { drawGrid: false });
    expect(ctx.counts('stroke')).toBe(1);
    expect(ctx.counts('quadraticCurveTo')).toBeGreaterThanOrEqual(1);
  });

  it('draws multi-line text via fillText per line', () => {
    const layer: TextLayer = {
      id: 't',
      kind: 'text',
      name: 'text',
      visible: true,
      locked: false,
      opacity: 1,
      items: [
        {
          id: '1',
          x: 1,
          y: 1,
          text: 'a\nb\nc',
          fontSize: 12,
          color: '#000',
          bold: true,
          italic: true,
          align: 'center',
        },
      ],
    };
    const ctx = createMockCtx();
    renderScene(ctx, sceneWith(layer), helpers, { drawGrid: false });
    expect(ctx.counts('fillText')).toBe(3);
  });

  it('skips invisible layers', () => {
    const layer: CellLayer = {
      id: 'c',
      kind: 'cell',
      name: 'cells',
      visible: false,
      locked: false,
      opacity: 1,
      cells: { '0,0': { type: 'solid', color: '#f00' } },
    };
    const ctx = createMockCtx();
    renderScene(ctx, sceneWith(layer), helpers, { drawGrid: false });
    const cellFills = ctx.calls.filter((c) => c.method === 'fillRect' && c.args[2] === 10);
    expect(cellFills.length).toBe(0);
  });

  it('draws grid when requested', () => {
    const ctx = createMockCtx();
    renderScene(ctx, createScene(2, 2, 10), helpers, { drawGrid: true });
    expect(ctx.counts('strokeRect')).toBe(1);
    expect(ctx.counts('stroke')).toBeGreaterThanOrEqual(1);
  });

  it('honors scene.gridVisible when drawGrid option omitted', () => {
    const scene = createScene(2, 2, 10);
    scene.gridVisible = false;
    const ctx = createMockCtx();
    renderScene(ctx, scene, helpers);
    expect(ctx.counts('strokeRect')).toBe(0);
  });
});
