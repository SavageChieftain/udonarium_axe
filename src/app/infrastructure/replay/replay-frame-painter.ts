import { containRect, coverRect, type ReplayFrameLayout, wrapReplayText } from '@axe/domain/replay/replay-frame-layout';
import type { ReplayShot } from '@axe/domain/replay/replay-storyboard';

export type ReplayFrameCanvas = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
export type ReplayFrameImage = CanvasImageSource & { width: number; height: number };

export interface ReplayFrameAssets {
  imageOf(identifier: string): ReplayFrameImage | null;
}

export interface ReplayFrameStyle {
  backdrop: string;
  veil: string;
  box: string;
  boxEdge: string;
  name: string;
  body: string;
  chapter: string;
  progress: string;
  progressTrack: string;
  fontFamily: string;
}

export const DEFAULT_REPLAY_FRAME_STYLE: ReplayFrameStyle = {
  backdrop: '#0d0f14',
  veil: 'rgba(0, 0, 0, 0.35)',
  box: 'rgba(8, 10, 14, 0.78)',
  boxEdge: 'rgba(255, 255, 255, 0.22)',
  name: '#ffffff',
  body: 'rgba(255, 255, 255, 0.96)',
  chapter: 'rgba(255, 255, 255, 0.85)',
  progress: '#7aa2ff',
  progressTrack: 'rgba(255, 255, 255, 0.16)',
  fontFamily: "'Noto Sans JP', 'Hiragino Sans', 'Meiryo', sans-serif",
};

export function paintReplayFrame(
  ctx: ReplayFrameCanvas,
  layout: ReplayFrameLayout,
  shot: ReplayShot | null,
  assets: ReplayFrameAssets,
  progress: number,
  style: ReplayFrameStyle = DEFAULT_REPLAY_FRAME_STYLE
): void {
  paintBackdrop(ctx, layout, shot, assets, style);
  if (shot) {
    if (shot.isChapterStart) paintChapterCard(ctx, layout, shot, style);
    else paintDialogue(ctx, layout, shot, assets, style);
  }
  paintProgress(ctx, layout, progress, style);
}

function paintBackdrop(
  ctx: ReplayFrameCanvas,
  layout: ReplayFrameLayout,
  shot: ReplayShot | null,
  assets: ReplayFrameAssets,
  style: ReplayFrameStyle
): void {
  ctx.fillStyle = style.backdrop;
  ctx.fillRect(0, 0, layout.width, layout.height);

  const background = shot?.backgroundId ? assets.imageOf(shot.backgroundId) : null;
  if (background) {
    const rect = coverRect(background, layout);
    ctx.drawImage(background, rect.x, rect.y, rect.width, rect.height);
  }

  ctx.fillStyle = style.veil;
  ctx.fillRect(0, 0, layout.width, layout.height);
}

function paintChapterCard(
  ctx: ReplayFrameCanvas,
  layout: ReplayFrameLayout,
  shot: ReplayShot,
  style: ReplayFrameStyle
): void {
  const fontSize = Math.round(layout.body.fontSize * 1.6);
  ctx.fillStyle = style.name;
  ctx.font = `700 ${fontSize}px ${style.fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const lines = wrapReplayText((text) => ctx.measureText(text).width, shot.text, layout.width * 0.8, 2);
  const top = layout.height / 2 - ((lines.length - 1) * fontSize * 1.35) / 2;
  lines.forEach((line, index) => {
    ctx.fillText(line, layout.width / 2, top + index * fontSize * 1.35);
  });

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function paintDialogue(
  ctx: ReplayFrameCanvas,
  layout: ReplayFrameLayout,
  shot: ReplayShot,
  assets: ReplayFrameAssets,
  style: ReplayFrameStyle
): void {
  paintPortrait(ctx, layout, shot, assets);
  paintChapterLabel(ctx, layout, shot, style);
  paintBox(ctx, layout, style);

  let bodyY = layout.body.y;
  if (shot.speaker.length > 0) {
    ctx.fillStyle = shot.speakerColor.length > 0 ? shot.speakerColor : style.name;
    ctx.font = `700 ${layout.name.fontSize}px ${style.fontFamily}`;
    ctx.fillText(shot.speaker, layout.name.x, layout.name.y);
  } else {
    bodyY = layout.name.y + Math.round((layout.body.y - layout.name.y) / 2);
  }

  ctx.fillStyle = style.body;
  ctx.font = `400 ${layout.body.fontSize}px ${style.fontFamily}`;
  const lines = wrapReplayText(
    (text) => ctx.measureText(text).width,
    shot.text,
    layout.body.width,
    layout.body.maxLines
  );
  lines.forEach((line, index) => {
    ctx.fillText(line, layout.body.x, bodyY + index * layout.body.lineHeight);
  });
}

function paintPortrait(
  ctx: ReplayFrameCanvas,
  layout: ReplayFrameLayout,
  shot: ReplayShot,
  assets: ReplayFrameAssets
): void {
  if (shot.portraitId.length < 1) return;
  const portrait = assets.imageOf(shot.portraitId);
  if (!portrait) return;

  const size = containRect(portrait, layout.portrait.maxWidth, layout.portrait.maxHeight);
  if (size.width < 1 || size.height < 1) return;
  ctx.drawImage(portrait, layout.portrait.x, layout.portrait.y - size.height, size.width, size.height);
}

function paintChapterLabel(
  ctx: ReplayFrameCanvas,
  layout: ReplayFrameLayout,
  shot: ReplayShot,
  style: ReplayFrameStyle
): void {
  if (shot.chapter.length < 1) return;
  ctx.fillStyle = style.chapter;
  ctx.font = `500 ${layout.chapter.fontSize}px ${style.fontFamily}`;
  ctx.fillText(shot.chapter, layout.chapter.x, layout.chapter.y);
}

function paintBox(ctx: ReplayFrameCanvas, layout: ReplayFrameLayout, style: ReplayFrameStyle): void {
  const { x, y, width, height, radius } = layout.box;
  ctx.fillStyle = style.box;
  ctx.strokeStyle = style.boxEdge;
  ctx.lineWidth = Math.max(1, Math.round(layout.scale * 2));

  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.fill();
    ctx.stroke();
    return;
  }
  ctx.fillRect(x, y, width, height);
  ctx.strokeRect(x, y, width, height);
}

function paintProgress(
  ctx: ReplayFrameCanvas,
  layout: ReplayFrameLayout,
  progress: number,
  style: ReplayFrameStyle
): void {
  const { x, y, width, height } = layout.progress;
  ctx.fillStyle = style.progressTrack;
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = style.progress;
  ctx.fillRect(x, y, width * Math.max(0, Math.min(1, progress)), height);
}
