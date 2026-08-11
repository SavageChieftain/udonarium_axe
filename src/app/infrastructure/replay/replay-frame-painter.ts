import {
  REPLAY_BOARD_TOP_DOWN,
  type ReplayBoardCamera,
  replayBoardProjection,
} from '@axe/domain/replay/replay-board-camera';
import { framingOf, type ReplayBoardScene } from '@axe/domain/replay/replay-board-view';
import { containRect, coverRect, type ReplayFrameLayout, wrapReplayText } from '@axe/domain/replay/replay-frame-layout';
import { easeInOut, pointAlongRoute } from '@axe/domain/replay/replay-route';
import type { ReplayShot, ReplayShotMove } from '@axe/domain/replay/replay-storyboard';
import { readableOn } from '@axe/domain/replay/replay-text-color';
import { type DarknessCanvas, paintReplayDarkness } from '@axe/infrastructure/replay/replay-darkness-painter';

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
  boardSurface: string;
  boardEdge: string;
  boardGrid: string;
  boardTrail: string;
  boardPiece: string;
  boardLabel: string;
  progress: string;
  progressTrack: string;
  fontFamily: string;
  boxLuminance: [number, number, number];
}

export const REPLAY_FRAME_FONT_FAMILY =
  "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Verdana, Meiryo, 'M+ 1p', sans-serif";

export const DEFAULT_REPLAY_FRAME_STYLE: ReplayFrameStyle = {
  backdrop: '#0d0f14',
  veil: 'rgba(0, 0, 0, 0.35)',
  box: 'rgba(8, 10, 14, 0.78)',
  boxEdge: 'rgba(255, 255, 255, 0.22)',
  name: '#ffffff',
  body: 'rgba(255, 255, 255, 0.96)',
  chapter: 'rgba(255, 255, 255, 0.85)',
  boardSurface: 'rgba(255, 255, 255, 0.06)',
  boardEdge: 'rgba(255, 255, 255, 0.28)',
  boardGrid: 'rgba(255, 255, 255, 0.14)',
  boardTrail: 'rgba(122, 162, 255, 0.85)',
  boardPiece: 'rgba(122, 162, 255, 0.85)',
  boardLabel: 'rgba(255, 255, 255, 0.92)',
  progress: '#7aa2ff',
  progressTrack: 'rgba(255, 255, 255, 0.16)',
  fontFamily: REPLAY_FRAME_FONT_FAMILY,
  boxLuminance: [0.03, 0.04, 0.055],
};

export function paintReplayFrame(
  ctx: ReplayFrameCanvas,
  layout: ReplayFrameLayout,
  shot: ReplayShot | null,
  assets: ReplayFrameAssets,
  progress: number,
  style: ReplayFrameStyle = DEFAULT_REPLAY_FRAME_STYLE,
  board: ReplayBoardScene | null = null,
  shotProgress = 1,
  camera: ReplayBoardCamera = REPLAY_BOARD_TOP_DOWN
): void {
  paintBackdrop(ctx, layout, shot, assets, style);
  if (board) paintBoard(ctx, layout, board, assets, style, shot?.move ?? null, shotProgress, camera);
  paintCutIn(ctx, layout, shot, assets);
  if (shot) {
    if (shot.isChapterStart) paintChapterCard(ctx, layout, shot, style);
    else paintDialogue(ctx, layout, shot, assets, style, board !== null, sideOf(board, shot));
  }
  paintProgress(ctx, layout, progress, style);
}

function paintBoard(
  ctx: ReplayFrameCanvas,
  layout: ReplayFrameLayout,
  board: ReplayBoardScene,
  assets: ReplayFrameAssets,
  style: ReplayFrameStyle,
  move: ReplayShotMove | null,
  shotProgress: number,
  camera: ReplayBoardCamera = REPLAY_BOARD_TOP_DOWN
): void {
  const tableWidth = board.width * board.gridSize;
  const tableHeight = board.height * board.gridSize;
  const framing = framingOf(board);
  const view = replayBoardProjection(camera, framing, layout.board);
  const tilted = camera.tilt > 0 || camera.spin !== 0;
  const scale = view.scale;
  const onBoard = (value: number): number => value * scale;

  // 地面に貼り付くもの（卓の絵・マス目・移動の跡・暗闇）は卓の座標のまま描き、
  // 傾きは行列に任せる。コマだけは倒さずに立てる。
  ctx.save();
  ctx.setTransform(...view.matrix);

  const surface = board.imageIdentifier.length > 0 ? assets.imageOf(board.imageIdentifier) : null;
  ctx.fillStyle = style.boardSurface;
  ctx.fillRect(0, 0, tableWidth, tableHeight);
  if (surface) ctx.drawImage(surface, 0, 0, tableWidth, tableHeight);

  paintGrid(ctx, board, style, 0, 0, (value) => value, 1 / scale);

  ctx.strokeStyle = style.boardEdge;
  ctx.lineWidth = Math.max(1, Math.round(layout.scale * 2)) / scale;
  ctx.strokeRect(0, 0, tableWidth, tableHeight);

  if (move) paintTrail(ctx, style, move, board, 0, 0, (value) => value, layout.scale / scale);

  // 暗闇はコマの下。見えない所のコマは、その上から暗幕で隠れる。
  if (board.overlay) {
    paintReplayDarkness(ctx as unknown as DarknessCanvas, board.overlay, {
      left: 0,
      top: 0,
      width: tableWidth,
      height: tableHeight,
      onBoard: (value) => value,
    });
  }
  ctx.restore();

  const sliding = move ? pointAlongRoute(move.route, easeInOut(shotProgress)) : null;
  const span0 = Math.max(layout.board.minPiece, onBoard(board.gridSize));
  const labelSize = Math.max(10, Math.round(span0 * 0.34));
  const standing = [...board.pieces].sort((a, b) => view.depthOf(a.x, a.y) - view.depthOf(b.x, b.y));
  for (const piece of tilted ? standing : board.pieces) {
    const span = Math.max(layout.board.minPiece, onBoard(piece.size * board.gridSize));
    if (span < 1) continue;
    const at = sliding && move?.targetId === piece.identifier ? sliding : piece;
    const centre = piece.size * board.gridSize * 0.5;
    const foot = view.at(at.x + centre, at.y + centre);
    // 真上からのときは今までどおり。傾けたときは足元を接地させて立てる。
    const x = foot.x - span / 2;
    const y = tilted ? foot.y - span : foot.y - span / 2;

    const image = piece.imageIdentifier.length > 0 ? assets.imageOf(piece.imageIdentifier) : null;
    if (image) {
      ctx.drawImage(image, x, y, span, span);
    } else {
      ctx.fillStyle = style.boardPiece;
      ctx.fillRect(x, y, span, span);
    }

    if (piece.name.length < 1) continue;
    ctx.fillStyle = style.boardLabel;
    ctx.font = `500 ${labelSize}px ${style.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.fillText(piece.name, x + span / 2, y + span + labelSize);
    ctx.textAlign = 'left';
  }
}

/** 出ていたカットインの絵。盤面の上に、台詞窓は隠さない大きさで重ねる。 */
function paintCutIn(
  ctx: ReplayFrameCanvas,
  layout: ReplayFrameLayout,
  shot: ReplayShot | null,
  assets: ReplayFrameAssets
): void {
  const picture = shot?.cutInId ? assets.imageOf(shot.cutInId) : null;
  if (!picture) return;

  const size = containRect(picture, layout.board.width, layout.board.height);
  const x = layout.board.x + (layout.board.width - size.width) / 2;
  const y = layout.board.y + (layout.board.height - size.height) / 2;
  ctx.drawImage(picture, x, y, size.width, size.height);
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

function paintTrail(
  ctx: ReplayFrameCanvas,
  style: ReplayFrameStyle,
  move: ReplayShotMove,
  board: ReplayBoardScene,
  left: number,
  top: number,
  onBoard: (value: number) => number,
  scale: number
): void {
  const piece = board.pieces.find((one) => one.identifier === move.targetId);
  const centre = onBoard((piece?.size ?? 1) * board.gridSize) / 2;
  const at = (point: { x: number; y: number }) => ({
    x: left + onBoard(point.x) + centre,
    y: top + onBoard(point.y) + centre,
  });

  const points = move.route.map(at);
  if (points.length < 2) return;

  ctx.strokeStyle = style.boardTrail;
  ctx.lineWidth = Math.max(2, Math.round(scale * 4));
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (const point of points.slice(1)) ctx.lineTo(point.x, point.y);
  ctx.stroke();

  const head = points[points.length - 1];
  const tail = points[points.length - 2];
  const angle = Math.atan2(head.y - tail.y, head.x - tail.x);
  const wing = Math.max(8, Math.round(scale * 20));

  ctx.fillStyle = style.boardTrail;
  ctx.beginPath();
  ctx.moveTo(head.x, head.y);
  ctx.lineTo(head.x - wing * Math.cos(angle - Math.PI / 7), head.y - wing * Math.sin(angle - Math.PI / 7));
  ctx.lineTo(head.x - wing * Math.cos(angle + Math.PI / 7), head.y - wing * Math.sin(angle + Math.PI / 7));
  ctx.closePath();
  ctx.fill();
}

function paintGrid(
  ctx: ReplayFrameCanvas,
  board: ReplayBoardScene,
  style: ReplayFrameStyle,
  left: number,
  top: number,
  onBoard: (value: number) => number,
  lineWidth = 1
): void {
  const step = onBoard(board.gridSize);
  // 行列で描いているときは、画面に出る幅で細かすぎないかを見る。
  if (step / lineWidth < 6) return;

  ctx.strokeStyle = style.boardGrid;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  for (let column = 0; column <= board.width; column += 1) {
    const x = left + step * column;
    ctx.moveTo(x, top);
    ctx.lineTo(x, top + step * board.height);
  }
  for (let row = 0; row <= board.height; row += 1) {
    const y = top + step * row;
    ctx.moveTo(left, y);
    ctx.lineTo(left + step * board.width, y);
  }
  ctx.stroke();
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
  style: ReplayFrameStyle,
  hasBoard: boolean,
  side: 'left' | 'right'
): void {
  paintPortrait(ctx, layout, shot, assets, hasBoard, side);
  paintChapterLabel(ctx, layout, shot, style);
  paintBox(ctx, layout, style);

  let bodyY = layout.body.y;
  if (shot.speaker.length > 0) {
    ctx.fillStyle =
      shot.speakerColor.length > 0 ? readableOn(shot.speakerColor, style.boxLuminance, style.name) : style.name;
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
  assets: ReplayFrameAssets,
  besideBoard: boolean,
  side: 'left' | 'right'
): void {
  if (shot.portraitId.length < 1) return;
  const portrait = assets.imageOf(shot.portraitId);
  if (!portrait) return;

  const shrink = besideBoard ? 0.55 : 1;
  const size = containRect(portrait, layout.portrait.maxWidth * shrink, layout.portrait.maxHeight * shrink);
  if (size.width < 1 || size.height < 1) return;

  const x = side === 'right' ? layout.width - layout.portrait.x - size.width : layout.portrait.x;
  ctx.drawImage(portrait, x, layout.portrait.y - size.height, size.width, size.height);
}

function sideOf(board: ReplayBoardScene | null, shot: ReplayShot): 'left' | 'right' {
  if (!board || shot.speaker.length < 1) return 'left';
  const speaking = board.pieces.find((piece) => piece.name === shot.speaker);
  if (!speaking) return 'left';
  return speaking.x + (speaking.size * board.gridSize) / 2 > (board.width * board.gridSize) / 2 ? 'right' : 'left';
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
