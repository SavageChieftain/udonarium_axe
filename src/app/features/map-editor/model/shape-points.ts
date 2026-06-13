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
