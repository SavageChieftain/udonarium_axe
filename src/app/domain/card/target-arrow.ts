export interface TargetArrowPoint {
  x: number;
  y: number;
  z: number;
}

export interface TargetArrowGeometry {
  x: number;
  y: number;
  z: number;
  length: number;
  angle: number;
}

const MIN_ARROW_LENGTH = 16;

export function targetArrowGeometry(from: TargetArrowPoint, to: TargetArrowPoint): TargetArrowGeometry | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  if (!Number.isFinite(length) || length < MIN_ARROW_LENGTH) return null;

  return {
    x: from.x,
    y: from.y,
    z: Math.max(from.z, to.z),
    length,
    angle: (Math.atan2(dy, dx) * 180) / Math.PI,
  };
}
