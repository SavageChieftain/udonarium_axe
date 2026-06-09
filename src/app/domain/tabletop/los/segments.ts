export interface Point {
  x: number;
  y: number;
}

export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export function rectangleSegments(x: number, y: number, width: number, height: number, rotateDeg: number): Segment[] {
  const cx = x + width / 2;
  const cy = y + height / 2;
  const rad = (rotateDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const halfW = width / 2;
  const halfH = height / 2;
  const local: Point[] = [
    { x: -halfW, y: -halfH },
    { x: halfW, y: -halfH },
    { x: halfW, y: halfH },
    { x: -halfW, y: halfH },
  ];
  const corners = local.map((p) => ({ x: cx + p.x * cos - p.y * sin, y: cy + p.x * sin + p.y * cos }));
  const segments: Segment[] = [];
  for (let i = 0; i < corners.length; i++) {
    const a = corners[i];
    const b = corners[(i + 1) % corners.length];
    segments.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
  }
  return segments;
}

export function perimeterSegments(widthPx: number, heightPx: number): Segment[] {
  return rectangleSegments(0, 0, widthPx, heightPx, 0);
}

function cross(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): number {
  return (by - ay) * (cx - bx) - (bx - ax) * (cy - by);
}

export function segmentsCross(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  dx: number,
  dy: number
): boolean {
  const d1 = cross(cx, cy, dx, dy, ax, ay);
  const d2 = cross(cx, cy, dx, dy, bx, by);
  const d3 = cross(ax, ay, bx, by, cx, cy);
  const d4 = cross(ax, ay, bx, by, dx, dy);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

export function segmentClear(ax: number, ay: number, bx: number, by: number, segments: readonly Segment[]): boolean {
  for (const seg of segments) {
    if (segmentsCross(ax, ay, bx, by, seg.x1, seg.y1, seg.x2, seg.y2)) return false;
  }
  return true;
}
