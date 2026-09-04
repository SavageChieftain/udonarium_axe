export const BOARD_ZOOMS: readonly number[] = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 8;
export const ZOOM_STEP = 1.15;

export const RULER_WIDTH = 16;
const RULER_STEPS: readonly number[] = [50, 100, 200, 500, 1000];
const RULER_ROOM = 44;
const STAGE_MARGIN = 24;

export interface RulerTick {
  at: number;
  px: number;
}

export interface Scrollable {
  scrollLeft: number;
  scrollTop: number;
  clientWidth: number;
  clientHeight: number;
}

export function clampZoom(next: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
}

export function rulerTicks(span: number, zoom: number): RulerTick[] {
  const step = RULER_STEPS.find((size) => size * zoom >= RULER_ROOM) ?? RULER_STEPS[RULER_STEPS.length - 1];
  const marks: RulerTick[] = [];
  for (let at = 0; at <= span; at += step) marks.push({ at, px: at * zoom });
  return marks;
}

export function fitZoom(stage: Scrollable, sceneWidth: number, sceneHeight: number): number {
  return Math.min((stage.clientWidth - STAGE_MARGIN) / sceneWidth, (stage.clientHeight - STAGE_MARGIN) / sceneHeight);
}

export function scrollKeepingPoint(
  stage: Scrollable,
  box: { left: number; top: number },
  at: { x: number; y: number } | null,
  was: number,
  now: number
): { scrollLeft: number; scrollTop: number } {
  const holdX = at ? at.x - box.left : stage.clientWidth / 2;
  const holdY = at ? at.y - box.top : stage.clientHeight / 2;
  const sheetX = (stage.scrollLeft + holdX) / was;
  const sheetY = (stage.scrollTop + holdY) / was;
  return { scrollLeft: sheetX * now - holdX, scrollTop: sheetY * now - holdY };
}
