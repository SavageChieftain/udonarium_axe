import { ReplayEventKind } from '@axe/domain/replay/replay-event';
import { REPLAY_FRAME_PRESETS, replayFrameLayout } from '@axe/domain/replay/replay-frame-layout';
import type { ReplayShot } from '@axe/domain/replay/replay-storyboard';
import {
  DEFAULT_REPLAY_FRAME_STYLE,
  paintReplayFrame,
  type ReplayFrameAssets,
  type ReplayFrameCanvas,
  type ReplayFrameImage,
} from '@axe/infrastructure/replay/replay-frame-painter';

interface DrawnImage {
  image: ReplayFrameImage;
  x: number;
  y: number;
  width: number;
  height: number;
}

function recorder(): {
  ctx: ReplayFrameCanvas;
  texts: { text: string; x: number; y: number; font: string; color: string }[];
  images: DrawnImage[];
  fills: { x: number; y: number; width: number; height: number; color: string }[];
} {
  const texts: { text: string; x: number; y: number; font: string; color: string }[] = [];
  const images: DrawnImage[] = [];
  const fills: { x: number; y: number; width: number; height: number; color: string }[] = [];

  const ctx = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    font: '',
    textAlign: 'left',
    textBaseline: 'alphabetic',
    fillRect(x: number, y: number, width: number, height: number) {
      fills.push({ x, y, width, height, color: String(ctx.fillStyle) });
    },
    strokeRect() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    closePath() {},
    stroke() {},
    fill() {},
    fillText(text: string, x: number, y: number) {
      texts.push({ text, x, y, font: ctx.font, color: String(ctx.fillStyle) });
    },
    measureText(text: string) {
      return { width: [...text].length * 20 };
    },
    drawImage(image: ReplayFrameImage, x: number, y: number, width: number, height: number) {
      images.push({ image, x, y, width, height });
    },
  } as unknown as ReplayFrameCanvas;

  return { ctx, texts, images, fills };
}

function image(width: number, height: number): ReplayFrameImage {
  return { width, height } as ReplayFrameImage;
}

const layout = replayFrameLayout(REPLAY_FRAME_PRESETS['1080p']);

function shot(overrides: Partial<ReplayShot> = {}): ReplayShot {
  return {
    seq: 1,
    startMs: 0,
    durationMs: 2000,
    kind: ReplayEventKind.ChatMessage,
    chapter: '',
    isChapterStart: false,
    speaker: 'アリス',
    speakerColor: '',
    portraitId: '',
    backgroundId: '',
    text: 'こんばんは',
    isNarration: false,
    move: null,
    ...overrides,
  };
}

const noAssets: ReplayFrameAssets = { imageOf: () => null };

describe('paintReplayFrame()', () => {
  it('話し手の名前と本文を描くこと', () => {
    const { ctx, texts } = recorder();
    paintReplayFrame(ctx, layout, shot(), noAssets, 0);

    expect(texts.map((entry) => entry.text)).toEqual(['アリス', 'こんばんは']);
    expect(texts[0].y).toBeLessThan(texts[1].y);
  });

  it('話し手の色を名前に使うこと', () => {
    const { ctx, texts } = recorder();
    paintReplayFrame(ctx, layout, shot({ speakerColor: '#112233' }), noAssets, 0);

    expect(texts[0].color).toBe('#112233');
  });

  it('名前の無い地の文では本文だけ描くこと', () => {
    const { ctx, texts } = recorder();
    paintReplayFrame(ctx, layout, shot({ speaker: '', text: '静まり返った' }), noAssets, 0);

    expect(texts.map((entry) => entry.text)).toEqual(['静まり返った']);
  });

  it('長い本文を枠の中で折り返すこと', () => {
    const { ctx, texts } = recorder();
    paintReplayFrame(ctx, layout, shot({ text: 'あ'.repeat(500) }), noAssets, 0);

    const body = texts.filter((entry) => entry.text.startsWith('あ'));
    expect(body.length).toBeGreaterThan(1);
    expect(body.length).toBeLessThanOrEqual(layout.body.maxLines);
    expect(body[body.length - 1].text.endsWith('…')).toBe(true);
  });

  it('背景を画面いっぱいに敷くこと', () => {
    const { ctx, images } = recorder();
    const assets: ReplayFrameAssets = { imageOf: () => image(100, 100) };
    paintReplayFrame(ctx, layout, shot({ backgroundId: 'bg-1' }), assets, 0);

    expect(images[0].width).toBeGreaterThanOrEqual(layout.width);
    expect(images[0].height).toBeGreaterThanOrEqual(layout.height);
  });

  it('立ち絵を枠に収めて足元を台詞窓に合わせること', () => {
    const { ctx, images } = recorder();
    const assets: ReplayFrameAssets = { imageOf: () => image(1000, 2000) };
    paintReplayFrame(ctx, layout, shot({ portraitId: 'img-1' }), assets, 0);

    const portrait = images[0];
    expect(portrait.width).toBeLessThanOrEqual(layout.portrait.maxWidth);
    expect(portrait.height).toBeLessThanOrEqual(layout.portrait.maxHeight);
    expect(portrait.y + portrait.height).toBe(layout.portrait.y);
  });

  it('素材が見つからないときは描かないこと', () => {
    const { ctx, images } = recorder();
    paintReplayFrame(ctx, layout, shot({ portraitId: 'img-1', backgroundId: 'bg-1' }), noAssets, 0);

    expect(images).toHaveLength(0);
  });

  it('章の見出しは中央に大きく出すこと', () => {
    const { ctx, texts } = recorder();
    paintReplayFrame(ctx, layout, shot({ isChapterStart: true, text: '第二幕', speaker: '' }), noAssets, 0);

    expect(texts.map((entry) => entry.text)).toEqual(['第二幕']);
    expect(texts[0].x).toBe(layout.width / 2);
  });

  it('章に入ったあとは見出しを隅に添えること', () => {
    const { ctx, texts } = recorder();
    paintReplayFrame(ctx, layout, shot({ chapter: '第二幕' }), noAssets, 0);

    expect(texts.map((entry) => entry.text)).toEqual(['第二幕', 'アリス', 'こんばんは']);
    expect(texts[0].y).toBe(layout.chapter.y);
  });

  it('卓とコマを真上から描くこと', () => {
    const { ctx, images, fills } = recorder();
    const assets: ReplayFrameAssets = { imageOf: (id) => (id === 'top' || id === 'img-1' ? image(100, 100) : null) };
    paintReplayFrame(ctx, layout, shot(), assets, 0, DEFAULT_REPLAY_FRAME_STYLE, {
      width: 10,
      height: 10,
      gridSize: 50,
      imageIdentifier: 'top',
      backgroundImageIdentifier: '',
      pieces: [
        {
          identifier: 'c1',
          aliasName: 'character',
          x: 0,
          y: 0,
          z: 0,
          size: 1,
          rotate: 0,
          name: '盗賊',
          imageIdentifier: 'img-1',
        },
      ],
    });

    const table = images[0];
    const piece = images[1];
    expect(piece.width).toBeCloseTo(table.width / 10, 5);
    expect(piece.x).toBeGreaterThanOrEqual(layout.board.x);
    expect(piece.x + piece.width).toBeLessThanOrEqual(layout.board.x + layout.board.width);
    expect(fills.some((fill) => fill.width === table.width)).toBe(true);
  });

  it('コマの名前を足元に添えること', () => {
    const { ctx, texts } = recorder();
    paintReplayFrame(ctx, layout, shot(), noAssets, 0, DEFAULT_REPLAY_FRAME_STYLE, {
      width: 10,
      height: 10,
      gridSize: 50,
      imageIdentifier: '',
      backgroundImageIdentifier: '',
      pieces: [
        {
          identifier: 'c1',
          aliasName: 'character',
          x: 0,
          y: 0,
          z: 0,
          size: 1,
          rotate: 0,
          name: '盗賊',
          imageIdentifier: '',
        },
      ],
    });

    expect(texts.map((entry) => entry.text)).toEqual(['盗賊', 'アリス', 'こんばんは']);
  });

  it('盤面があるときは立ち絵を小さくして並べること', () => {
    const assets: ReplayFrameAssets = { imageOf: () => image(1000, 2000) };
    const alone = recorder();
    paintReplayFrame(alone.ctx, layout, shot({ portraitId: 'img-1' }), assets, 0);

    const beside = recorder();
    paintReplayFrame(beside.ctx, layout, shot({ portraitId: 'img-1' }), assets, 0, DEFAULT_REPLAY_FRAME_STYLE, {
      width: 10,
      height: 10,
      gridSize: 50,
      imageIdentifier: '',
      backgroundImageIdentifier: '',
      pieces: [],
    });

    const portrait = beside.images[beside.images.length - 1];
    expect(portrait.height).toBeLessThan(alone.images[0].height);
    expect(portrait.y + portrait.height).toBe(layout.portrait.y);
  });

  it('動いたコマを経路に沿って滑らせること', () => {
    const scene = {
      width: 10,
      height: 10,
      gridSize: 50,
      imageIdentifier: '',
      backgroundImageIdentifier: '',
      pieces: [
        {
          identifier: 'c1',
          aliasName: 'character',
          x: 300,
          y: 0,
          z: 0,
          size: 1,
          rotate: 0,
          name: '',
          imageIdentifier: '',
        },
      ],
    };
    const moving = shot({
      move: {
        targetId: 'c1',
        route: [
          { x: 0, y: 0, z: 0 },
          { x: 300, y: 0, z: 0 },
        ],
      },
    });

    const at = (progress: number) => {
      const { ctx, fills } = recorder();
      paintReplayFrame(ctx, layout, moving, noAssets, 0, DEFAULT_REPLAY_FRAME_STYLE, scene, progress);
      return fills.filter((fill) => fill.width === fill.height).pop()!.x;
    };

    expect(at(0)).toBeLessThan(at(0.5));
    expect(at(0.5)).toBeLessThan(at(1));
  });

  it('滑り終わりは記録された置き場所に重なること', () => {
    const scene = {
      width: 10,
      height: 10,
      gridSize: 50,
      imageIdentifier: '',
      backgroundImageIdentifier: '',
      pieces: [
        {
          identifier: 'c1',
          aliasName: 'character',
          x: 300,
          y: 0,
          z: 0,
          size: 1,
          rotate: 0,
          name: '',
          imageIdentifier: '',
        },
      ],
    };
    const still = recorder();
    paintReplayFrame(still.ctx, layout, shot(), noAssets, 0, DEFAULT_REPLAY_FRAME_STYLE, scene);

    const slid = recorder();
    const moving = shot({
      move: {
        targetId: 'c1',
        route: [
          { x: 0, y: 0, z: 0 },
          { x: 300, y: 0, z: 0 },
        ],
      },
    });
    paintReplayFrame(slid.ctx, layout, moving, noAssets, 0, DEFAULT_REPLAY_FRAME_STYLE, scene, 1);

    const square = (fills: { x: number; width: number; height: number }[]) =>
      fills.filter((fill) => fill.width === fill.height).pop()!.x;
    expect(square(slid.fills)).toBeCloseTo(square(still.fills), 5);
  });

  it('小さすぎるコマは見える大きさまで底上げすること', () => {
    const far = (identifier: string, x: number) => ({
      identifier,
      aliasName: 'character',
      x,
      y: 0,
      z: 0,
      size: 1,
      rotate: 0,
      name: '',
      imageIdentifier: '',
    });
    const { ctx, fills } = recorder();
    paintReplayFrame(ctx, layout, shot(), noAssets, 0, DEFAULT_REPLAY_FRAME_STYLE, {
      width: 400,
      height: 400,
      gridSize: 50,
      imageIdentifier: '',
      backgroundImageIdentifier: '',
      pieces: [far('a', 0), far('b', 19_950)],
    });

    const squares = fills.filter((fill) => fill.width === fill.height);
    expect(squares[squares.length - 1].width).toBe(layout.board.minPiece);
  });

  it('コマのある辺りに寄せて大きく映すこと', () => {
    const assets: ReplayFrameAssets = { imageOf: () => image(100, 100) };
    const { ctx, images } = recorder();
    paintReplayFrame(ctx, layout, shot(), assets, 0, DEFAULT_REPLAY_FRAME_STYLE, {
      width: 200,
      height: 200,
      gridSize: 50,
      imageIdentifier: 'top',
      backgroundImageIdentifier: '',
      pieces: [
        {
          identifier: 'a',
          aliasName: 'character',
          x: 0,
          y: 0,
          z: 0,
          size: 1,
          rotate: 0,
          name: '',
          imageIdentifier: '',
        },
      ],
    });

    expect(images[0].width).toBeGreaterThan(layout.board.width);
  });

  it('移動には道筋と行き先の矢印を描くこと', () => {
    const marks: string[] = [];
    const { ctx } = recorder();
    const spy = ctx as unknown as Record<string, unknown>;
    spy['beginPath'] = () => marks.push('begin');
    spy['lineTo'] = () => marks.push('line');
    spy['closePath'] = () => marks.push('close');
    spy['fill'] = () => marks.push('fill');

    paintReplayFrame(
      ctx,
      layout,
      shot({
        move: {
          targetId: 'c1',
          route: [
            { x: 0, y: 0, z: 0 },
            { x: 300, y: 0, z: 0 },
          ],
        },
      }),
      noAssets,
      0,
      DEFAULT_REPLAY_FRAME_STYLE,
      {
        width: 10,
        height: 10,
        gridSize: 50,
        imageIdentifier: '',
        backgroundImageIdentifier: '',
        pieces: [
          {
            identifier: 'c1',
            aliasName: 'character',
            x: 300,
            y: 0,
            z: 0,
            size: 1,
            rotate: 0,
            name: '',
            imageIdentifier: '',
          },
        ],
      },
      0.5
    );

    expect(marks).toContain('close');
    expect(marks).toContain('fill');
  });

  it('話し手のコマがある側へ立ち絵を寄せること', () => {
    const assets: ReplayFrameAssets = { imageOf: () => image(1000, 2000) };
    const scene = (x: number) => ({
      width: 10,
      height: 10,
      gridSize: 50,
      imageIdentifier: '',
      backgroundImageIdentifier: '',
      pieces: [
        {
          identifier: 'c1',
          aliasName: 'character',
          x,
          y: 0,
          z: 0,
          size: 1,
          rotate: 0,
          name: 'アリス',
          imageIdentifier: '',
        },
      ],
    });

    const near = recorder();
    paintReplayFrame(near.ctx, layout, shot({ portraitId: 'p' }), assets, 0, DEFAULT_REPLAY_FRAME_STYLE, scene(0));
    const far = recorder();
    paintReplayFrame(far.ctx, layout, shot({ portraitId: 'p' }), assets, 0, DEFAULT_REPLAY_FRAME_STYLE, scene(450));

    const portrait = (images: { x: number; width: number }[]) => images[images.length - 1];
    expect(portrait(near.images).x).toBeLessThan(layout.width / 2);
    expect(portrait(far.images).x).toBeGreaterThan(layout.width / 2);
  });

  it('進み具合を帯で示すこと', () => {
    const { ctx, fills } = recorder();
    paintReplayFrame(ctx, layout, shot(), noAssets, 0.25);

    const bar = fills[fills.length - 1];
    expect(bar.y).toBe(layout.progress.y);
    expect(bar.width).toBe(layout.width * 0.25);
  });

  it('進み具合が範囲の外でも帯を溢れさせないこと', () => {
    const { ctx, fills } = recorder();
    paintReplayFrame(ctx, layout, shot(), noAssets, 9);
    expect(fills[fills.length - 1].width).toBe(layout.width);
  });

  it('カットの無い時間でも下地を敷くこと', () => {
    const { ctx, fills, texts } = recorder();
    paintReplayFrame(ctx, layout, null, noAssets, 1);

    expect(texts).toHaveLength(0);
    expect(fills[0]).toMatchObject({ x: 0, y: 0, width: layout.width, height: layout.height });
  });
});
