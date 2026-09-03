import { ShapeGeneratorKind } from '@axe/features/map-editor/model/editor-tool';
import { MapScene, SceneGuideLine, ShapeItem } from '@axe/features/map-editor/model/scene';
import { addShape, addStroke, removeImage, removeText } from '@axe/features/map-editor/model/scene-ops';
import {
  anchorFor,
  angleFrom,
  arrowBetween,
  BoardPoint,
  BoardTool,
  boxAround,
  boxOf,
  dropJoint,
  freehandLayer,
  guidesFor,
  guideUnder,
  Handle,
  handleUnder,
  highlighterStyle,
  imageLayer,
  jointedShape,
  jointUnder,
  MarkBox,
  MarkRef,
  MarkStyle,
  marksWithin,
  markUnder,
  moveJoint,
  moveMark,
  penStroke,
  rubOutStrokes,
  scaleMark,
  shapeBetween,
  shapeLayer,
  smoothStroke,
  SnapGuide,
  snapPoint,
  squareOff,
  straightLine,
  stretchBy,
  textLayer,
  turnMark,
} from '@axe/features/tabletop/white-board/white-board-scene';

const TURN_SNAP = 15;
const MIN_TRIM = 8;

export interface GestureHost {
  scene(): MapScene;
  activeLayerId(): string | null;
  tool(): BoardTool;
  style(): MarkStyle;
  shapeKind(): ShapeGeneratorKind;
  filled(): boolean;
  strokeWidth(): number;
  keepingShape(): boolean;
  guiding(): boolean;
  guides(): SceneGuideLine[];
  grip(): number;
  held(): MarkRef[];
  selected(): MarkRef | null;
  trimming(): MarkBox | null;
  trimTo(window: MarkBox): void;
  laying(): BoardPoint[];
  layTo(points: BoardPoint[]): void;
  hold(marks: MarkRef[]): void;
  show(guides: SnapGuide[]): void;
  startTyping(at: BoardPoint): void;
  redraw(pending?: number[]): void;
  touched(): void;
}

interface Grabbed {
  refs: MarkRef[];
  grabX: number;
  grabY: number;
  handle: Handle | null;
  box: MarkBox;
  turnedTo: number;
}

export function boxBetweenPoints(from: BoardPoint, to: BoardPoint): MarkBox {
  return {
    x: Math.min(from.x, to.x),
    y: Math.min(from.y, to.y),
    w: Math.abs(to.x - from.x),
    h: Math.abs(to.y - from.y),
  };
}

export function pullWindow(window: MarkBox, grip: Handle, dx: number, dy: number, picture: MarkBox): MarkBox {
  const next = { ...window };
  if (grip.includes('w')) {
    const left = Math.max(0, Math.min(next.x + dx, next.x + next.w - MIN_TRIM));
    next.w += next.x - left;
    next.x = left;
  }
  if (grip.includes('e')) next.w = Math.max(MIN_TRIM, Math.min(next.w + dx, picture.w - next.x));
  if (grip.includes('n')) {
    const top = Math.max(0, Math.min(next.y + dy, next.y + next.h - MIN_TRIM));
    next.h += next.y - top;
    next.y = top;
  }
  if (grip.includes('s')) next.h = Math.max(MIN_TRIM, Math.min(next.h + dy, picture.h - next.y));
  return next;
}

export class BoardGesture {
  private drawingPoints: number[] = [];
  private dragFrom: BoardPoint | null = null;
  private dragTo: BoardPoint | null = null;
  private grabbed: Grabbed | null = null;
  private hovering: BoardPoint | null = null;
  private bending: { ref: MarkRef; joint: number } | null = null;
  private draggingGuide: SceneGuideLine | null = null;
  private bandFrom: BoardPoint | null = null;
  private bandTo: BoardPoint | null = null;

  constructor(private readonly host: GestureHost) {}

  get hover(): BoardPoint | null {
    return this.hovering;
  }

  band(): MarkBox | null {
    return this.bandFrom && this.bandTo ? boxBetweenPoints(this.bandFrom, this.bandTo) : null;
  }

  isPenning(): boolean {
    return this.host.tool() === 'pen' || this.host.tool() === 'marker';
  }

  dragGuide(guide: SceneGuideLine): void {
    this.draggingGuide = guide;
  }

  pendingMark(): ShapeItem | null {
    const from = this.dragFrom;
    const to = this.dragTo;
    if (!from || !to) return null;
    const tool = this.host.tool();
    if (tool === 'line') return straightLine(from, to, this.host.style());
    if (tool === 'arrow') return arrowBetween(from, to, this.host.style());
    if (tool === 'shape') return shapeBetween(this.host.shapeKind(), from, to, this.host.style(), this.host.filled());
    return null;
  }

  begin(at: BoardPoint, adding: boolean): void {
    switch (this.host.tool()) {
      case 'pen':
      case 'marker':
        this.drawingPoints = [at.x, at.y];
        break;
      case 'eraser':
        this.rubOut(at);
        break;
      case 'line':
      case 'arrow':
      case 'shape':
        this.dragFrom = at;
        break;
      case 'text':
      case 'note':
        this.host.startTyping(at);
        break;
      case 'path': {
        const points = this.host.laying();
        this.host.layTo(
          this.host.keepingShape() && points.length > 0
            ? [...points, squareOff(points[points.length - 1], at)]
            : [...points, at]
        );
        this.host.redraw();
        break;
      }
      case 'select':
        this.take(at, adding);
        break;
      case 'sticker':
        break;
    }
  }

  drag(at: BoardPoint, pressing: boolean): void {
    if (this.draggingGuide) {
      const guide = this.draggingGuide;
      guide.at = guide.axis === 'x' ? at.x : at.y;
      this.host.redraw();
      return;
    }
    if (this.host.laying().length > 0) {
      this.hovering = at;
      this.host.redraw();
      return;
    }
    if (this.isPenning() && this.drawingPoints.length > 0) {
      this.drawingPoints.push(at.x, at.y);
      this.host.redraw(this.drawingPoints);
      return;
    }
    if (this.host.tool() === 'eraser' && pressing) {
      this.rubOut(at);
      return;
    }
    if (this.bending) {
      const scene = this.host.scene();
      const bent = this.host.guiding() ? snapPoint(scene, at, [this.bending.ref], this.host.guides()) : null;
      if (bent) this.host.show(bent.guides);
      moveJoint(scene, this.bending.ref, this.bending.joint, bent?.at ?? at);
      this.host.redraw();
      return;
    }
    if (this.grabbed) {
      this.shift(at);
      return;
    }
    if (this.bandFrom) {
      this.bandTo = at;
      this.host.redraw();
      return;
    }
    if (this.dragFrom) {
      this.dragTo = this.reachedTo(at);
      this.host.redraw();
    }
  }

  end(at: BoardPoint): void {
    const scene = this.host.scene();
    if (this.isPenning() && this.drawingPoints.length > 3) {
      addStroke(
        freehandLayer(scene, this.host.activeLayerId()),
        penStroke(smoothStroke(this.drawingPoints), this.inkStyle())
      );
    }
    this.drawingPoints = [];

    if (this.dragFrom) {
      const from = this.dragFrom;
      const to = this.dragTo ?? this.reachedTo(at);
      this.dragFrom = null;
      this.dragTo = null;
      const far = Math.hypot(to.x - from.x, to.y - from.y) > 4;
      if (far) {
        const tool = this.host.tool();
        const mark =
          tool === 'line'
            ? straightLine(from, to, this.host.style())
            : tool === 'arrow'
              ? arrowBetween(from, to, this.host.style())
              : shapeBetween(this.host.shapeKind(), from, to, this.host.style(), this.host.filled());
        addShape(shapeLayer(scene, this.host.activeLayerId()), mark);
        this.host.hold([{ kind: 'shape', id: mark.id }]);
      }
    }
    if (this.bandFrom && this.bandTo) {
      const area = boxBetweenPoints(this.bandFrom, this.bandTo);
      if (area.w > 3 || area.h > 3) this.host.hold(marksWithin(scene, area));
      this.bandFrom = null;
      this.bandTo = null;
    }
    this.grabbed = null;
    this.bending = null;
    this.draggingGuide = null;
    this.host.show([]);
    this.host.touched();
  }

  private inkStyle(): MarkStyle {
    return this.host.tool() === 'marker' ? highlighterStyle(this.host.style()) : this.host.style();
  }

  private rubOut(at: BoardPoint): void {
    const scene = this.host.scene();
    const layerId = this.host.activeLayerId();
    rubOutStrokes(freehandLayer(scene, layerId), at.x, at.y, this.host.strokeWidth() * 2);
    const mark = markUnder(scene, at);
    if (mark?.kind === 'image') removeImage(imageLayer(scene, layerId), mark.id);
    if (mark?.kind === 'text') removeText(textLayer(scene, layerId), mark.id);
    this.host.redraw();
  }

  private reachedTo(to: BoardPoint): BoardPoint {
    const from = this.dragFrom;
    if (!from) return to;
    const tool = this.host.tool();
    if (this.host.keepingShape() && (tool === 'line' || tool === 'arrow')) {
      this.host.show([]);
      return squareOff(from, to);
    }
    if (!this.host.guiding()) return to;

    const snap = guidesFor(this.host.scene(), boxBetweenPoints(from, to), [], this.host.guides());
    this.host.show(snap.guides);
    return { x: to.x + snap.dx, y: to.y + snap.dy };
  }

  private take(at: BoardPoint, adding: boolean): void {
    const scene = this.host.scene();
    const laid = guideUnder(this.host.guides(), at);
    if (laid) {
      this.draggingGuide = laid;
      return;
    }
    const chosen = this.host.selected();
    const window = this.host.trimming();
    const picture = chosen && window ? boxOf(scene, chosen) : null;
    if (chosen && window && picture) {
      const onScreen = { x: picture.x + window.x, y: picture.y + window.y, w: window.w, h: window.h };
      const grip = handleUnder(at, onScreen, this.host.grip());
      if (grip && grip !== 'turn') {
        this.grabbed = { refs: [chosen], grabX: at.x, grabY: at.y, handle: grip, box: onScreen, turnedTo: 0 };
      }
      return;
    }
    if (chosen && jointedShape(scene, chosen)) {
      const joint = jointUnder(scene, chosen, at, this.host.grip());
      if (joint !== null) {
        if (adding) {
          if (dropJoint(scene, chosen, joint)) this.host.touched();
          return;
        }
        this.bending = { ref: chosen, joint };
        return;
      }
    }

    const box = chosen ? boxOf(scene, chosen) : null;
    const handle = box ? handleUnder(at, box, this.host.grip()) : null;
    if (chosen && box && handle) {
      this.grabbed = { refs: [chosen], grabX: at.x, grabY: at.y, handle, box, turnedTo: angleFrom(box, at) };
      return;
    }

    const mark = markUnder(scene, at);
    if (!mark) {
      if (!adding) this.host.hold([]);
      this.bandFrom = at;
      this.bandTo = at;
      return;
    }

    const already = this.host.held();
    const has = already.some((entry) => entry.kind === mark.kind && entry.id === mark.id);
    const next = adding
      ? has
        ? already.filter((entry) => !(entry.kind === mark.kind && entry.id === mark.id))
        : [...already, mark]
      : has
        ? already
        : [mark];
    this.host.hold(next);
    const bounds = boxAround(scene, next);
    if (bounds) {
      this.grabbed = { refs: next, grabX: at.x, grabY: at.y, handle: null, box: bounds, turnedTo: 0 };
    }
  }

  private shift(at: BoardPoint): void {
    const held = this.grabbed;
    if (!held) return;
    const scene = this.host.scene();
    const dx = at.x - held.grabX;
    const dy = at.y - held.grabY;
    held.grabX = at.x;
    held.grabY = at.y;

    const window = this.host.trimming();
    if (window && held.handle) {
      const picture = boxOf(scene, held.refs[0]);
      if (!picture) return;
      this.host.trimTo(pullWindow(window, held.handle, dx, dy, picture));
      this.host.redraw();
      return;
    }

    if (!held.handle) {
      let stepX = dx;
      let stepY = dy;
      const was = boxAround(scene, held.refs);
      if (this.host.guiding() && was) {
        const snap = guidesFor(scene, { ...was, x: was.x + dx, y: was.y + dy }, held.refs, this.host.guides());
        stepX += snap.dx;
        stepY += snap.dy;
        this.host.show(snap.guides);
      }
      for (const ref of held.refs) moveMark(scene, ref, stepX, stepY);
      this.host.redraw();
      return;
    }

    const box = boxAround(scene, held.refs);
    if (!box) return;

    if (held.handle === 'turn') {
      this.host.show([]);
      const now = angleFrom(box, at);
      const turned = this.host.keepingShape() ? Math.round(now / TURN_SNAP) * TURN_SNAP : now;
      for (const ref of held.refs) turnMark(scene, ref, turned - held.turnedTo);
      held.turnedTo = turned;
      this.host.redraw();
      return;
    }

    let reach = at;
    if (this.host.guiding()) {
      const snap = snapPoint(scene, at, held.refs, this.host.guides());
      reach = snap.at;
      this.host.show(snap.guides);
    }
    const { kx, ky } = stretchBy(box, held.handle, reach);
    const anchor = anchorFor(box, held.handle);
    const anchored = { x: anchor.x, y: anchor.y, w: box.w, h: box.h };
    const even = this.host.keepingShape() && held.handle.length === 2 ? Math.max(kx, ky) : 0;
    for (const ref of held.refs) {
      scaleMark(scene, ref, anchored, even || kx, even || ky);
    }
    this.host.redraw();
  }
}
