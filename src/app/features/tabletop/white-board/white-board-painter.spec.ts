import {
  drawBand,
  drawFreehand,
  drawGuides,
  drawHold,
  drawJoints,
  drawTrimWindow,
  gripAt,
} from '@axe/features/tabletop/white-board/white-board-painter';

function recorder(): { ctx: CanvasRenderingContext2D; calls: string[] } {
  const calls: string[] = [];
  const ctx = new Proxy({} as CanvasRenderingContext2D, {
    get:
      (_target, key: string) =>
      (...args: unknown[]) =>
        calls.push(`${key}(${args.join(',')})`),
    set: (_target, key: string, value) => {
      calls.push(`${key}=${value}`);
      return true;
    },
  });
  return { ctx, calls };
}

describe('white board painter', () => {
  it('keeps the grips the same size on screen whatever the zoom', () => {
    expect(gripAt(1)).toBe(9);
    expect(gripAt(2)).toBe(4.5);
    expect(gripAt(0.1)).toBe(36);
  });

  it('draws nothing for no guides, and a dashed line per guide otherwise', () => {
    const empty = recorder();
    drawGuides(empty.ctx, [], '#f00', 1);
    expect(empty.calls).toEqual([]);

    const { ctx, calls } = recorder();
    drawGuides(ctx, [{ axis: 'x', at: 10, from: 0, to: 50 }], '#f00', 2);
    expect(calls).toEqual([
      'save()',
      'strokeStyle=#f00',
      'lineWidth=0.5',
      'setLineDash(5,4)',
      'beginPath()',
      'moveTo(10,0)',
      'lineTo(10,50)',
      'stroke()',
      'restore()',
    ]);
  });

  it('draws the hold with eight square grips and a round one on a stalk', () => {
    const { ctx, calls } = recorder();
    drawHold(ctx, { x: 0, y: 0, w: 100, h: 50 }, 1);
    expect(calls.filter((call) => call.startsWith('arc('))).toHaveLength(1);
    expect(calls.filter((call) => call.startsWith('fillRect('))).toHaveLength(8);
    expect(calls[0]).toBe('save()');
    expect(calls[calls.length - 1]).toBe('restore()');
  });

  it('greys out what the trim window leaves and leaves the turn grip off', () => {
    const { ctx, calls } = recorder();
    drawTrimWindow(ctx, { x: 10, y: 10, w: 100, h: 100 }, { x: 5, y: 5, w: 50, h: 40 }, 1);
    expect(calls).toContain('fill(evenodd)');
    expect(calls).toContain('strokeRect(15,15,50,40)');
    expect(calls.filter((call) => call.startsWith('arc('))).toHaveLength(0);
    expect(calls.filter((call) => call.startsWith('fillRect('))).toHaveLength(8);
  });

  it('puts a ring on every joint of a path', () => {
    const { ctx, calls } = recorder();
    drawJoints(ctx, [0, 0, 10, 10, 20, 0], 1);
    expect(calls.filter((call) => call.startsWith('arc('))).toEqual([
      'arc(0,0,4.5,0,6.283185307179586)',
      'arc(10,10,4.5,0,6.283185307179586)',
      'arc(20,0,4.5,0,6.283185307179586)',
    ]);
  });

  it('strokes the band and the free stroke in the ink asked for', () => {
    const band = recorder();
    drawBand(band.ctx, { x: 1, y: 2, w: 3, h: 4 }, 1);
    expect(band.calls).toContain('fillRect(1,2,3,4)');
    expect(band.calls).toContain('strokeRect(1,2,3,4)');

    const stroke = recorder();
    drawFreehand(stroke.ctx, [0, 0, 5, 5, 10, 0], { color: '#123', width: 3 });
    expect(stroke.calls).toEqual([
      'strokeStyle=#123',
      'lineWidth=3',
      'lineCap=round',
      'lineJoin=round',
      'beginPath()',
      'moveTo(0,0)',
      'lineTo(5,5)',
      'lineTo(10,0)',
      'stroke()',
    ]);
  });
});
