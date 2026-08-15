import {
  containRect,
  coverRect,
  REPLAY_FRAME_PRESETS,
  replayFrameLayout,
  wrapReplayText,
} from '@axe/domain/replay/replay-frame-layout';

const measure = (text: string): number => [...text].length * 10;

describe('wrapReplayText()', () => {
  it('wraps at the width it is given', () => {
    expect(wrapReplayText(measure, 'あいうえおかきくけこ', 50, 5)).toEqual(['あいうえお', 'かきくけこ']);
  });

  it('keeps a line break as a line', () => {
    expect(wrapReplayText(measure, 'あい\nうえ', 100, 5)).toEqual(['あい', 'うえ']);
  });

  it('ends the last line with an ellipsis when it overflows', () => {
    const lines = wrapReplayText(measure, 'あ'.repeat(30), 50, 2);
    expect(lines).toHaveLength(2);
    expect(lines[1].endsWith('…')).toBe(true);
    expect(measure(lines[1])).toBeLessThanOrEqual(50);
  });

  it('ends nothing when it fits', () => {
    expect(wrapReplayText(measure, 'あいうえお', 50, 2)).toEqual(['あいうえお']);
  });

  it('makes no line for empty text or no width', () => {
    expect(wrapReplayText(measure, '', 100, 3)).toEqual(['']);
    expect(wrapReplayText(measure, 'あ', 0, 3)).toEqual([]);
    expect(wrapReplayText(measure, 'あ', 100, 0)).toEqual([]);
  });

  it('keeps the line even where one character is wider than the width', () => {
    expect(wrapReplayText(measure, 'あい', 5, 3)).toEqual(['あ', 'い']);
  });
});

describe('replayFrameLayout()', () => {
  it('returns a place that fits inside the screen', () => {
    const layout = replayFrameLayout(REPLAY_FRAME_PRESETS['1080p']);

    expect(layout.box.x).toBeGreaterThan(0);
    expect(layout.box.x + layout.box.width).toBeLessThanOrEqual(1920);
    expect(layout.box.y + layout.box.height).toBeLessThanOrEqual(1080);
    expect(layout.body.width).toBeLessThan(layout.box.width);
  });

  it('gives the board most of the screen', () => {
    const layout = replayFrameLayout(REPLAY_FRAME_PRESETS['1080p']);

    expect(layout.board.y).toBeGreaterThan(layout.chapter.y);
    expect(layout.board.width).toBeGreaterThan(layout.width * 0.9);
    expect(layout.board.height).toBeGreaterThan(layout.height * 0.5);
    expect(layout.board.y + layout.board.height).toBeLessThanOrEqual(layout.box.y);
  });

  it('shrinks in the same proportion on a smaller one', () => {
    const large = replayFrameLayout(REPLAY_FRAME_PRESETS['1080p']);
    const small = replayFrameLayout(REPLAY_FRAME_PRESETS['720p']);

    expect(small.scale).toBeCloseTo(large.scale * (720 / 1080), 5);
    expect(small.body.fontSize).toBeLessThan(large.body.fontSize);
    expect(small.box.x + small.box.width).toBeLessThanOrEqual(1280);
  });
});

describe('coverRect() / containRect()', () => {
  it('covers the whole screen with the background', () => {
    const rect = coverRect({ width: 100, height: 100 }, { width: 400, height: 200 });

    expect(rect.width).toBe(400);
    expect(rect.height).toBe(400);
    expect(rect.y).toBe(-100);
  });

  it('fits it exactly to the screen when its size is unknown', () => {
    expect(coverRect({ width: 0, height: 0 }, { width: 400, height: 200 })).toEqual({
      x: 0,
      y: 0,
      width: 400,
      height: 200,
    });
  });

  it('fits a portrait to its frame without stretching it', () => {
    expect(containRect({ width: 200, height: 400 }, 100, 400)).toEqual({ width: 100, height: 200 });
    expect(containRect({ width: 50, height: 50 }, 500, 500)).toEqual({ width: 50, height: 50 });
    expect(containRect({ width: 0, height: 0 }, 500, 500)).toEqual({ width: 0, height: 0 });
  });
});
