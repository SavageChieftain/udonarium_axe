import {
  applyResize,
  isInsideLayer,
  MIN_LAYER_SIZE,
  resizeHandleAt,
  sceneToStage,
  stageDeltaToScene,
  stageFit,
  stageToScene,
} from '@axe/features/media/cut-in-editor/cut-in-stage-geometry';

describe('stageFit()', () => {
  it('leaves a scene that already fits at its own size', () => {
    expect(stageFit({ width: 640, height: 360 }, { width: 800, height: 600 })).toEqual({
      scale: 1,
      offsetX: 80,
      offsetY: 120,
    });
  });

  it('shrinks a scene too wide for the room, and letterboxes it', () => {
    const fit = stageFit({ width: 1000, height: 500 }, { width: 500, height: 500 });

    expect(fit.scale).toBe(0.5);
    expect(fit.offsetX).toBe(0);
    expect(fit.offsetY).toBe(125);
  });

  it('shrinks by whichever side runs out first', () => {
    expect(stageFit({ width: 400, height: 800 }, { width: 400, height: 400 }).scale).toBe(0.5);
  });

  it('gives up on a room or a scene with no size', () => {
    expect(stageFit({ width: 0, height: 0 }, { width: 400, height: 400 }).scale).toBe(1);
    expect(stageFit({ width: 400, height: 400 }, { width: 0, height: 0 }).scale).toBe(1);
  });
});

describe('stageToScene() and sceneToStage()', () => {
  const fit = stageFit({ width: 1000, height: 500 }, { width: 500, height: 500 });

  it('undo one another', () => {
    const { px, py } = sceneToStage(300, 120, fit);

    expect(stageToScene(px, py, fit)).toEqual({ x: 300, y: 120 });
  });

  it('puts the scene origin where the letterbox starts', () => {
    expect(sceneToStage(0, 0, fit)).toEqual({ px: 0, py: 125 });
  });

  it('carries a drag across at the same scale', () => {
    expect(stageDeltaToScene(50, 10, fit)).toEqual({ x: 100, y: 20 });
  });
});

describe('resizeHandleAt()', () => {
  const fit = { scale: 1, offsetX: 0, offsetY: 0 };
  const box = { x: 100, y: 100, width: 200, height: 100 };

  it('finds each corner', () => {
    expect(resizeHandleAt({ x: 100, y: 100 }, box, fit)).toBe('nw');
    expect(resizeHandleAt({ x: 300, y: 100 }, box, fit)).toBe('ne');
    expect(resizeHandleAt({ x: 100, y: 200 }, box, fit)).toBe('sw');
    expect(resizeHandleAt({ x: 300, y: 200 }, box, fit)).toBe('se');
  });

  it('finds a corner from near enough to it', () => {
    expect(resizeHandleAt({ x: 105, y: 104 }, box, fit)).toBe('nw');
  });

  it('finds none in the middle', () => {
    expect(resizeHandleAt({ x: 200, y: 150 }, box, fit)).toBeNull();
  });

  it('reaches further on a shrunken stage, so the grip is the same on screen', () => {
    const shrunk = { scale: 0.5, offsetX: 0, offsetY: 0 };

    expect(resizeHandleAt({ x: 112, y: 112 }, box, shrunk)).toBe('nw');
    expect(resizeHandleAt({ x: 112, y: 112 }, box, fit)).toBeNull();
  });
});

describe('isInsideLayer()', () => {
  const box = { x: 10, y: 10, width: 100, height: 50 };

  it('knows a point on the layer', () => {
    expect(isInsideLayer({ x: 50, y: 30 }, box)).toBe(true);
    expect(isInsideLayer({ x: 10, y: 10 }, box)).toBe(true);
  });

  it('knows a point off it', () => {
    expect(isInsideLayer({ x: 9, y: 30 }, box)).toBe(false);
    expect(isInsideLayer({ x: 50, y: 61 }, box)).toBe(false);
  });
});

describe('applyResize()', () => {
  const box = { x: 100, y: 100, width: 200, height: 100 };

  it('pulls the south-east corner and leaves the north-west where it was', () => {
    expect(applyResize(box, 'se', 50, 20)).toEqual({ x: 100, y: 100, width: 250, height: 120 });
  });

  it('pulls the north-west corner and leaves the south-east where it was', () => {
    const resized = applyResize(box, 'nw', 50, 20);

    expect(resized).toEqual({ x: 150, y: 120, width: 150, height: 80 });
    expect(resized.x + resized.width).toBe(box.x + box.width);
    expect(resized.y + resized.height).toBe(box.y + box.height);
  });

  it('never shrinks past what can still be grabbed', () => {
    const resized = applyResize(box, 'se', -1000, -1000);

    expect(resized.width).toBe(MIN_LAYER_SIZE);
    expect(resized.height).toBe(MIN_LAYER_SIZE);
  });

  it('keeps the shape when asked, following whichever side was pulled further', () => {
    const resized = applyResize(box, 'se', 200, 0, true);

    expect(resized.width / resized.height).toBeCloseTo(box.width / box.height, 5);
    expect(resized.width).toBe(400);
  });

  it('keeps the far corner in place while keeping the shape', () => {
    const resized = applyResize(box, 'nw', 100, 0, true);

    expect(resized.x + resized.width).toBe(box.x + box.width);
    expect(resized.y + resized.height).toBe(box.y + box.height);
  });
});
