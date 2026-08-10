import {
  containRect,
  coverRect,
  REPLAY_FRAME_PRESETS,
  replayFrameLayout,
  wrapReplayText,
} from '@axe/domain/replay/replay-frame-layout';

const measure = (text: string): number => [...text].length * 10;

describe('wrapReplayText()', () => {
  it('入る幅で折り返すこと', () => {
    expect(wrapReplayText(measure, 'あいうえおかきくけこ', 50, 5)).toEqual(['あいうえお', 'かきくけこ']);
  });

  it('改行をそのまま行として扱うこと', () => {
    expect(wrapReplayText(measure, 'あい\nうえ', 100, 5)).toEqual(['あい', 'うえ']);
  });

  it('溢れたら最後の行を省略記号で締めること', () => {
    const lines = wrapReplayText(measure, 'あ'.repeat(30), 50, 2);
    expect(lines).toHaveLength(2);
    expect(lines[1].endsWith('…')).toBe(true);
    expect(measure(lines[1])).toBeLessThanOrEqual(50);
  });

  it('収まるときは省略しないこと', () => {
    expect(wrapReplayText(measure, 'あいうえお', 50, 2)).toEqual(['あいうえお']);
  });

  it('空文字や幅なしでは行を作らないこと', () => {
    expect(wrapReplayText(measure, '', 100, 3)).toEqual(['']);
    expect(wrapReplayText(measure, 'あ', 0, 3)).toEqual([]);
    expect(wrapReplayText(measure, 'あ', 100, 0)).toEqual([]);
  });

  it('1 文字が幅を超えても行を落とさないこと', () => {
    expect(wrapReplayText(measure, 'あい', 5, 3)).toEqual(['あ', 'い']);
  });
});

describe('replayFrameLayout()', () => {
  it('画面の中に収まる置き場所を返すこと', () => {
    const layout = replayFrameLayout(REPLAY_FRAME_PRESETS['1080p']);

    expect(layout.box.x).toBeGreaterThan(0);
    expect(layout.box.x + layout.box.width).toBeLessThanOrEqual(1920);
    expect(layout.box.y + layout.box.height).toBeLessThanOrEqual(1080);
    expect(layout.body.width).toBeLessThan(layout.box.width);
  });

  it('盤面を台詞窓と見出しの間に置くこと', () => {
    const layout = replayFrameLayout(REPLAY_FRAME_PRESETS['1080p']);

    expect(layout.board.y).toBeGreaterThan(layout.chapter.y);
    expect(layout.board.y + layout.board.height).toBeLessThanOrEqual(layout.box.y);
    expect(layout.board.width).toBeGreaterThan(0);
    expect(layout.board.height).toBeGreaterThan(0);
  });

  it('小さい画面では同じ割合で縮むこと', () => {
    const large = replayFrameLayout(REPLAY_FRAME_PRESETS['1080p']);
    const small = replayFrameLayout(REPLAY_FRAME_PRESETS['720p']);

    expect(small.scale).toBeCloseTo(large.scale * (720 / 1080), 5);
    expect(small.body.fontSize).toBeLessThan(large.body.fontSize);
    expect(small.box.x + small.box.width).toBeLessThanOrEqual(1280);
  });
});

describe('coverRect() / containRect()', () => {
  it('背景は画面いっぱいを覆うこと', () => {
    const rect = coverRect({ width: 100, height: 100 }, { width: 400, height: 200 });

    expect(rect.width).toBe(400);
    expect(rect.height).toBe(400);
    expect(rect.y).toBe(-100);
  });

  it('大きさの分からない画像では画面ぴったりにすること', () => {
    expect(coverRect({ width: 0, height: 0 }, { width: 400, height: 200 })).toEqual({
      x: 0,
      y: 0,
      width: 400,
      height: 200,
    });
  });

  it('立ち絵は枠に収め、引き伸ばさないこと', () => {
    expect(containRect({ width: 200, height: 400 }, 100, 400)).toEqual({ width: 100, height: 200 });
    expect(containRect({ width: 50, height: 50 }, 500, 500)).toEqual({ width: 50, height: 50 });
    expect(containRect({ width: 0, height: 0 }, 500, 500)).toEqual({ width: 0, height: 0 });
  });
});
