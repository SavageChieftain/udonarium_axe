import { createLayer, FreehandLayer, ImageLayer, MapScene, TextLayer } from '@axe/features/map-editor/model/scene';
import { addImage, addShape, addStroke, addText } from '@axe/features/map-editor/model/scene-ops';
import {
  arrowBetween,
  boxOf,
  copyMark,
  createBoardScene,
  fileUnder,
  freehandLayer,
  GRAPH_SPACINGS,
  groupLayers,
  groupNames,
  guessLineWidth,
  handleAt,
  handleUnder,
  highlighterStyle,
  imageLayer,
  layerFor,
  lineWidth,
  markUnder,
  moveMark,
  noteAt,
  penStroke,
  removeMark,
  renameGroup,
  restack,
  restyleMark,
  rubOutStrokes,
  ruleBoard,
  scaleMark,
  shapeBetween,
  shapeLayer,
  showGroup,
  snapTo,
  stickerAt,
  straightLine,
  textBox,
  textLayer,
  turnMark,
  useTextMeasurer,
  wordsAt,
  wordsOf,
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
    const drawn = shapeBetween('rect', { x: 90, y: 80 }, { x: 10, y: 20 }, style);

    expect(drawn.shape).toBe('rect');
    expect(drawn.points).toEqual([10, 20, 80, 60]);
    expect(drawn.fill).toBeNull();
    expect(drawn.stroke?.color).toBe('#112233');
  });

  it('draws an ellipse from the same drag', () => {
    expect(shapeBetween('ellipse', { x: 0, y: 0 }, { x: 40, y: 30 }, style).shape).toBe('ellipse');
  });

  it('draws the many sided ones as polygons, from the same drag', () => {
    for (const kind of ['triangle', 'pentagon', 'hexagon', 'star5', 'star6'] as const) {
      const drawn = shapeBetween(kind, { x: 0, y: 0 }, { x: 40, y: 30 }, style);

      expect(drawn.shape).toBe('polygon');
      expect(drawn.points.length).toBeGreaterThan(4);
    }
  });

  it('fills a shape only when the reader asked for it filled', () => {
    expect(shapeBetween('rect', { x: 0, y: 0 }, { x: 4, y: 4 }, style).fill).toBeNull();
    expect(shapeBetween('rect', { x: 0, y: 0 }, { x: 4, y: 4 }, style, true).fill).toEqual({
      type: 'solid',
      color: style.color,
    });
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

  it('sticks a picture up at the shape it actually is, rather than squashed into a square', () => {
    const wide = stickerAt({ x: 0, y: 0 }, 'wide', 120, { x: 300, y: 100 });
    const tall = stickerAt({ x: 0, y: 0 }, 'tall', 120, { x: 100, y: 400 });

    // The longest side is what was asked for; the other follows from the picture.
    expect(wide.w).toBe(120);
    expect(wide.h).toBe(40);
    expect(tall.h).toBe(120);
    expect(tall.w).toBe(30);
  });

  it('centres a picture of any shape on the spot it was stuck', () => {
    const stuck = stickerAt({ x: 100, y: 100 }, 'wide', 120, { x: 300, y: 100 });

    expect(stuck.x + stuck.w / 2).toBe(100);
    expect(stuck.y + stuck.h / 2).toBe(100);
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

    expect(markUnder(scene, { x: 55, y: 65 })?.kind).toBe('text');
    expect(markUnder(scene, { x: 500, y: 500 })).toBeNull();
  });
});

describe('layer groups', () => {
  function sheets(): { scene: ReturnType<typeof createBoardScene> } {
    const scene = createBoardScene(4, 3, 50);
    for (let i = 0; i < 3; i++) {
      const layer = createLayer('freehand', `sheet ${i}`);
      layer.id = `sheet-${i}`;
      scene.layers.push(layer);
    }
    return { scene };
  }

  it('shows a loose sheet on its own and a bundle as one', () => {
    const { scene } = sheets();
    fileUnder(scene.layers[0], 'plan');
    fileUnder(scene.layers[1], 'plan');

    const groups = groupLayers(scene);

    expect(groups.length).toBe(2);
    expect(groups.find((group) => group.name === 'plan')?.layers.length).toBe(2);
    expect(groups.find((group) => group.name === '')?.layers.length).toBe(1);
  });

  it('stacks the bundles topmost first, the way the sheets are stacked', () => {
    const { scene } = sheets();
    fileUnder(scene.layers[0], 'under');

    expect(groupLayers(scene)[0].layers[0]).toBe(scene.layers[scene.layers.length - 1]);
  });

  it('hides a whole bundle at once, and shows it again', () => {
    const { scene } = sheets();
    fileUnder(scene.layers[0], 'plan');
    fileUnder(scene.layers[2], 'plan');

    showGroup(scene, 'plan', false);

    expect(scene.layers[0].visible).toBe(false);
    expect(scene.layers[2].visible).toBe(false);
    expect(scene.layers[1].visible).toBe(true);
  });

  it('renames a bundle, taking every sheet in it with the name', () => {
    const { scene } = sheets();
    fileUnder(scene.layers[0], 'plan');
    fileUnder(scene.layers[1], 'plan');

    renameGroup(scene, 'plan', 'the ground floor');

    expect(groupNames(scene)).toEqual(['the ground floor']);
  });

  it('takes a sheet out of its bundle when it is filed under nothing', () => {
    const { scene } = sheets();
    fileUnder(scene.layers[0], 'plan');

    fileUnder(scene.layers[0], '');

    expect(scene.layers[0].group).toBeUndefined();
    expect(groupNames(scene)).toEqual([]);
  });
});

describe('taking hold of a mark', () => {
  function drawnOn(): MapScene {
    const scene = createBoardScene(8, 6, 50);
    addStroke(freehandLayer(scene), penStroke([10, 10, 60, 10, 60, 60], style));
    addShape(shapeLayer(scene), shapeBetween('rect', { x: 100, y: 100 }, { x: 200, y: 160 }, style));
    addText(textLayer(scene), wordsAt({ x: 250, y: 250 }, 'hello', style));
    addImage(imageLayer(scene), stickerAt({ x: 350, y: 120 }, 'pic', 80));
    return scene;
  }

  it('takes hold of a line drawn in the wrong place, not only of what was stuck on', () => {
    const scene = drawnOn();

    expect(markUnder(scene, { x: 30, y: 12 })?.kind).toBe('stroke');
    expect(markUnder(scene, { x: 150, y: 130 })?.kind).toBe('shape');
    expect(markUnder(scene, { x: 260, y: 260 })?.kind).toBe('text');
    expect(markUnder(scene, { x: 350, y: 120 })?.kind).toBe('image');
  });

  it('passes over a sheet that is hidden or locked', () => {
    const scene = drawnOn();
    for (const layer of scene.layers) layer.visible = false;

    expect(markUnder(scene, { x: 150, y: 130 })).toBeNull();
  });

  it('measures a mark so a hold can be drawn round it', () => {
    const scene = drawnOn();
    const shape = markUnder(scene, { x: 150, y: 130 })!;

    expect(boxOf(scene, shape)).toEqual({ x: 100, y: 100, w: 100, h: 60 });
  });

  it('moves whatever was taken hold of, whichever sort of mark it is', () => {
    const scene = drawnOn();
    // Taken hold of first and moved after, since moving one changes what is under a point.
    const marks = [
      { x: 30, y: 12 },
      { x: 150, y: 130 },
      { x: 260, y: 260 },
      { x: 350, y: 120 },
    ].map((at) => markUnder(scene, at)!);

    expect(marks.every((mark) => mark)).toBe(true);
    for (const mark of marks) {
      const before = boxOf(scene, mark)!;

      moveMark(scene, mark, 25, -15);
      const after = boxOf(scene, mark)!;

      expect(after.x - before.x).toBeCloseTo(25, 5);
      expect(after.y - before.y).toBeCloseTo(-15, 5);
    }
  });

  it('stretches what is held from the corner opposite the one being pulled', () => {
    const scene = drawnOn();
    const shape = markUnder(scene, { x: 150, y: 130 })!;
    const box = boxOf(scene, shape)!;

    scaleMark(scene, shape, box, 2, 1);
    const after = boxOf(scene, shape)!;

    expect(after.x).toBeCloseTo(box.x, 5);
    expect(after.w).toBeCloseTo(box.w * 2, 5);
    expect(after.h).toBeCloseTo(box.h, 5);
  });

  it('takes a mark off the board, whichever sort it is', () => {
    const scene = drawnOn();
    const mark = markUnder(scene, { x: 350, y: 120 })!;

    removeMark(scene, mark);

    expect(markUnder(scene, { x: 350, y: 120 })).toBeNull();
  });
});

describe('handleUnder()', () => {
  const box = { x: 100, y: 100, w: 80, h: 40 };

  it('names the corner the pointer landed on', () => {
    expect(handleUnder({ x: 100, y: 100 }, box, 6)).toBe('nw');
    expect(handleUnder({ x: 180, y: 140 }, box, 6)).toBe('se');
    expect(handleUnder({ x: 180, y: 100 }, box, 6)).toBe('ne');
  });

  it('says nothing where the pointer landed on no corner', () => {
    expect(handleUnder({ x: 140, y: 120 }, box, 6)).toBeNull();
  });

  it('puts each corner where the corner is', () => {
    expect(handleAt(box, 'sw')).toEqual({ x: 100, y: 140 });
  });
});

describe('the rest of the marks', () => {
  it('gives an arrow a shaft and two barbs drawn back from its point', () => {
    const drawn = arrowBetween({ x: 0, y: 0 }, { x: 100, y: 0 }, style);

    expect(drawn.shape).toBe('polyline');
    // Shaft, then back to the point twice for the barbs.
    expect(drawn.points.length).toBe(10);
    expect(drawn.points[2]).toBe(100);
    expect(drawn.points[6]).toBe(100);
  });

  it('puts a card behind a note, which is what makes it a note', () => {
    const note = noteAt({ x: 10, y: 20 }, 'remember', style, '#fff59d');
    const plain = wordsAt({ x: 10, y: 20 }, 'remember', style);

    expect(note.background).toBe('#fff59d');
    expect(plain.background).toBeUndefined();
    expect(textBox(note).w).toBeGreaterThan(textBox(plain).w);
  });

  it('lets what is under a marker show through, and lays it on thick', () => {
    const marked = highlighterStyle(style);

    expect(marked.color).toMatch(/^rgba\(/);
    expect(marked.width).toBeGreaterThan(style.width);
  });

  it('rounds onto the ruling only where there is a ruling to round onto', () => {
    expect(snapTo({ x: 63, y: 38 }, 25)).toEqual({ x: 75, y: 50 });
    expect(snapTo({ x: 63, y: 38 }, 1)).toEqual({ x: 63, y: 38 });
  });
});

describe('copyMark(), restack() and turnMark()', () => {
  function drawnOn(): MapScene {
    const scene = createBoardScene(8, 6, 50);
    addShape(shapeLayer(scene), shapeBetween('rect', { x: 100, y: 100 }, { x: 200, y: 160 }, style));
    addImage(imageLayer(scene), stickerAt({ x: 350, y: 120 }, 'pic', 80));
    return scene;
  }

  it('sets a copy down a little off the first, so both can be seen', () => {
    const scene = drawnOn();
    const first = markUnder(scene, { x: 150, y: 130 })!;
    const before = boxOf(scene, first)!;

    const made = copyMark(scene, first, 16)!;
    const after = boxOf(scene, made)!;

    expect(made.id).not.toBe(first.id);
    expect(after.x - before.x).toBeCloseTo(16, 5);
  });

  it('brings a mark forward within the sheet it is on', () => {
    const scene = drawnOn();
    const shapes = scene.layers.find((layer) => layer.kind === 'shape')!;
    addShape(shapes as never, shapeBetween('rect', { x: 0, y: 0 }, { x: 10, y: 10 }, style));
    const first = (shapes as { items: { id: string }[] }).items[0].id;

    restack(scene, { kind: 'shape', id: first }, 1);

    expect((shapes as { items: { id: string }[] }).items[1].id).toBe(first);
  });

  it('turns a mark about its own middle, leaving it where it was', () => {
    const scene = drawnOn();
    const picture = markUnder(scene, { x: 350, y: 120 })!;
    const before = boxOf(scene, picture)!;

    turnMark(scene, picture, 90);
    const after = boxOf(scene, picture)!;

    expect(after.x + after.w / 2).toBeCloseTo(before.x + before.w / 2, 5);
    expect(after.y + after.h / 2).toBeCloseTo(before.y + before.h / 2, 5);
  });
});

describe('measuring words', () => {
  it('gives a full square to a full width character and less to the alphabet', () => {
    // Counting characters alike is wrong by nearly half for Japanese, whose characters are
    // a full square each, and a line measured short cannot be taken hold of by its right half.
    expect(guessLineWidth('ああああ', 20)).toBeCloseTo(80, 5);
    expect(guessLineWidth('aaaa', 20)).toBeCloseTo(48, 5);
  });

  it('measures with the canvas where there is one to ask', () => {
    useTextMeasurer(() => 123);

    expect(lineWidth('anything', wordsAt({ x: 0, y: 0 }, 'anything', style))).toBe(123);

    useTextMeasurer(null);
  });

  it('draws a box round the words from their top, and round the card of a note', () => {
    useTextMeasurer(null);
    const plain = wordsAt({ x: 10, y: 20 }, 'ab', style);
    const box = textBox(plain);

    expect(box.x).toBe(10);
    expect(box.y).toBe(20);
    expect(box.h).toBeCloseTo(style.fontSize * 1.2, 5);
  });
});

describe('restyleMark()', () => {
  function drawn(): MapScene {
    const scene = createBoardScene(8, 6, 50);
    addStroke(freehandLayer(scene), penStroke([0, 0, 10, 10], style));
    addShape(shapeLayer(scene), shapeBetween('rect', { x: 0, y: 0 }, { x: 40, y: 40 }, style));
    addText(textLayer(scene), wordsAt({ x: 100, y: 100 }, 'hi', style));
    return scene;
  }

  it('recolours a line already drawn rather than making it be drawn again', () => {
    const scene = drawn();
    const stroke = scene.layers.find((l) => l.kind === 'freehand')! as {
      strokes: { id: string; color: string; width: number }[];
    };

    restyleMark(scene, { kind: 'stroke', id: stroke.strokes[0].id }, { color: '#ff0000', width: 9 });

    expect(stroke.strokes[0].color).toBe('#ff0000');
    expect(stroke.strokes[0].width).toBe(9);
  });

  it('keeps a marker see through when its colour is changed', () => {
    const scene = drawn();
    const layer = scene.layers.find((l) => l.kind === 'freehand')! as { strokes: { id: string; color: string }[] };
    layer.strokes[0].color = 'rgba(0,0,0,0.38)';

    restyleMark(scene, { kind: 'stroke', id: layer.strokes[0].id }, { color: '#00ff00' });

    expect(layer.strokes[0].color).toMatch(/^rgba\(/);
  });

  it('fills and unfills a shape already drawn', () => {
    const scene = drawn();
    const shapes = scene.layers.find((l) => l.kind === 'shape')! as { items: { id: string; fill: unknown }[] };
    const ref = { kind: 'shape' as const, id: shapes.items[0].id };

    restyleMark(scene, ref, { filled: true, color: '#123456' });
    expect(shapes.items[0].fill).toEqual({ type: 'solid', color: '#123456' });

    restyleMark(scene, ref, { filled: false });
    expect(shapes.items[0].fill).toBeNull();
  });

  it('sets the weight and the side words are set to', () => {
    const scene = drawn();
    const texts = scene.layers.find((l) => l.kind === 'text')! as {
      items: { id: string; bold: boolean; align: string }[];
    };

    restyleMark(scene, { kind: 'text', id: texts.items[0].id }, { bold: true, align: 'center' });

    expect(texts.items[0].bold).toBe(true);
    expect(texts.items[0].align).toBe('center');
  });

  it('hands back the words already written, so they can be typed over', () => {
    const scene = drawn();
    const texts = scene.layers.find((l) => l.kind === 'text')! as { items: { id: string }[] };

    expect(wordsOf(scene, { kind: 'text', id: texts.items[0].id })?.text).toBe('hi');
    expect(wordsOf(scene, { kind: 'shape', id: 'whatever' })).toBeNull();
  });
});
