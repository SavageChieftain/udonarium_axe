import type { ShapeGeneratorKind } from '@axe/features/map-editor/editor/map-editor-state';
export function regularPolygonPoints(
  cx: number,
  cy: number,
  radius: number,
  sides: number,
  startAngleRad: number
): number[] {
  const count = Math.max(3, Math.floor(sides));
  const points: number[] = [];
  for (let i = 0; i < count; i += 1) {
    const angle = startAngleRad + (i * 2 * Math.PI) / count;
    points.push(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
  }
  return points;
}

export function starPoints(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  points: number,
  startAngleRad: number
): number[] {
  const count = Math.max(2, Math.floor(points));
  const result: number[] = [];
  const step = Math.PI / count;
  for (let i = 0; i < count * 2; i += 1) {
    const radius = i % 2 === 0 ? outerR : innerR;
    const angle = startAngleRad + i * step;
    result.push(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
  }
  return result;
}

/** 図形の種類から輪郭の点を作る。矩形と楕円は canvas 側で描くので空を返す。 */
export function generateShapePoints(kind: ShapeGeneratorKind, x: number, y: number, w: number, h: number): number[] {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const rx = w / 2;
  const ry = h / 2;
  let unit: number[];
  if (kind === 'triangle') unit = regularPolygonPoints(0, 0, 1, 3, -Math.PI / 2);
  else if (kind === 'pentagon') unit = regularPolygonPoints(0, 0, 1, 5, -Math.PI / 2);
  else if (kind === 'hexagon') unit = regularPolygonPoints(0, 0, 1, 6, 0);
  else if (kind === 'star5') unit = starPoints(0, 0, 1, 0.382, 5, -Math.PI / 2);
  else if (kind === 'star6') unit = starPoints(0, 0, 1, 0.577, 6, -Math.PI / 2);
  else return [];
  const scaled: number[] = [];
  for (let i = 0; i + 1 < unit.length; i += 2) {
    scaled.push(cx + unit[i] * rx, cy + unit[i + 1] * ry);
  }
  return scaled;
}
