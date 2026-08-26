import { FreehandLayer, ImageLayer, MapScene, TextLayer } from '@axe/features/map-editor/model/scene';
import {
  boxBetween,
  createBoardScene,
  freehandLayer,
  GRAPH_SPACINGS,
  imageLayer,
  layerFor,
  markUnder,
  penStroke,
  rubOutStrokes,
  ruleBoard,
  shapeLayer,
  stickerAt,
  straightLine,
  textLayer,
  wordsAt,
} from '@axe/features/tabletop/white-board/white-board-scene';

const style = { color: '#112233', width: 5, fontSize: 20 };

describe('createBoardScene()', () => {
  it('is a surface to write on rather than a map: no grid and nothing painted under it', () => {
    const scene = createBoardScene(4, 3, 50);

    expect(scene.cols).toBe(4);
    expect(scene.rows).toBe(3);
    expect(scene.gridVisible).toBe(false);
    expect(scene.background).toBe('transparent');
    expect(scene.layers).toEqual([]);
  });
});

describe('layerFor()', () => {
  it('makes each kind the first time it is wanted, and hands back the same one after', () => {
    const scene = createBoardScene(4, 3, 50);

    expect(freehandLayer(scene)).toBe(freehandLayer(scene));
    expect(scene.layers.length).toBe(1);

    shapeLayer(scene);
    textLayer(scene);
    imageLayer(scene);

    expect(scene.layers.map((layer) => layer.kind).sort()).toEqual(['freehand', 'image', 'shape', 'text']);
  });

  it('does not muddle one kind with another', () => {
    const scene = createBoardScene(4, 3, 50);

    expect(layerFor(scene, 'text').kind).toBe('text');
    expect(layerFor(scene, 'image').kind).toBe('image');
  });
});

describe('layerFor()', () => {
  it('puts a mark on the sheet the reader is working on', () => {
    const scene = createBoardScene(4, 3, 50);
    const first = freehandLayer(scene);
    const second = layerFor(scene, 'freehand');
    second.id = 'second';
    scene.layers.push(second);

    expect(layerFor(scene, 'freehand', 'second')).toBe(second);
    expect(layerFor(scene, 'freehand', first.id)).toBe(first);
  });

  it('passes over a locked sheet, and over one that takes another sort of mark', () => {
    const scene = createBoardScene(4, 3, 50);
    const locked = freehandLayer(scene);
    locked.locked = true;

    const chosen = layerFor(scene, 'freehand', locked.id);

    expect(chosen).not.toBe(locked);
    expect(chosen.kind).toBe('freehand');
    expect(layerFor(scene, 'text', locked.id).kind).toBe('text');
  });

  it('takes the topmost that will have it where the reader has chosen none', () => {
    const scene = createBoardScene(4, 3, 50);
    freehandLayer(scene);
    const upper = layerFor(scene, 'freehand');
    upper.id = 'upper';
    scene.layers.push(upper);

    expect(layerFor(scene, 'freehand', null)).toBe(upper);
  });
});

describe('ruleBoard()', () => {
  it('rules the sheet more finely without shrinking it', () => {
    const scene = createBoardScene(8, 6, 50);
    const wide = 8 * 50;
    const deep = 6 * 50;

    ruleBoard(scene, wide, deep, 25);

    expect(scene.cellPx).toBe(25);
    expect(scene.cols * scene.cellPx).toBe(wide);
    expect(scene.rows * scene.cellPx).toBe(deep);
  });

  it('is offered at spacings that divide a square evenly', () => {
    for (const step of GRAPH_SPACINGS) expect(50 % step).toBe(0);
  });
});

describe('marks', () => {
  it('draws a box corner to corner, whichever way round it was dragged', () => {
    const drawn = boxBetween('box', { x: 90, y: 80 }, { x: 10, y: 20 }, style);

    expect(drawn.shape).toBe('rect');
    expect(drawn.points).toEqual([10, 20, 80, 60]);
    expect(drawn.fill).toBeNull();
    expect(drawn.stroke?.color).toBe('#112233');
  });

  it('draws an ellipse from the same drag', () => {
    expect(boxBetween('ellipse', { x: 0, y: 0 }, { x: 40, y: 30 }, style).shape).toBe('ellipse');
  });

  it('runs a line from where it started to where it ended', () => {
    expect(straightLine({ x: 1, y: 2 }, { x: 3, y: 4 }, style).points).toEqual([1, 2, 3, 4]);
  });

  it('puts a sticker down around the spot it was stuck, not off one corner of it', () => {
    const stuck = stickerAt({ x: 100, y: 100 }, 'some-image', 40);

    expect(stuck.x).toBe(80);
    expect(stuck.y).toBe(80);
    expect(stuck.w).toBe(40);
    expect(stuck.imageIdentifier).toBe('some-image');
  });

  it('takes the ink and the size from the pen that wrote it', () => {
    expect(penStroke([0, 0, 1, 1], style).width).toBe(5);
    expect(wordsAt({ x: 0, y: 0 }, 'hello', style).fontSize).toBe(20);
  });
});

describe('rubOutStrokes()', () => {
  function scribbled(): { scene: MapScene; layer: FreehandLayer } {
    const scene = createBoardScene(4, 3, 50);
    const layer = freehandLayer(scene);
    layer.strokes.push(penStroke([0, 0, 10, 0, 20, 0, 30, 0, 40, 0], style));
    return { scene, layer };
  }

  it('leaves a line rubbed through the middle as two lines, not none', () => {
    const { layer } = scribbled();

    expect(rubOutStrokes(layer, 20, 0, 4)).toBe(true);
    expect(layer.strokes.length).toBe(2);
    expect(layer.strokes.every((stroke) => stroke.id.length > 0)).toBe(true);
  });

  it('leaves alone what the eraser never passed over', () => {
    const { layer } = scribbled();

    expect(rubOutStrokes(layer, 400, 400, 4)).toBe(false);
    expect(layer.strokes.length).toBe(1);
  });
});

describe('markUnder()', () => {
  it('takes the topmost sticker under the pointer', () => {
    const scene = createBoardScene(8, 6, 50);
    const images = imageLayer(scene) as ImageLayer;
    images.items.push(stickerAt({ x: 100, y: 100 }, 'under', 80));
    images.items.push(stickerAt({ x: 100, y: 100 }, 'over', 80));

    const found = markUnder(scene, { x: 100, y: 100 });

    expect(found?.kind).toBe('image');
    expect(found?.id).toBe(images.items[1].id);
  });

  it('finds words where they were written', () => {
    const scene = createBoardScene(8, 6, 50);
    const texts = textLayer(scene) as TextLayer;
    texts.items.push(wordsAt({ x: 50, y: 60 }, 'hello', style));

    expect(markUnder(scene, { x: 55, y: 55 })?.kind).toBe('text');
    expect(markUnder(scene, { x: 500, y: 500 })).toBeNull();
  });
});
