import { TableViewRotation } from '@axe/application/ui/ui-signal.service';

export interface BillboardTransformOptions {
  readonly rotation: TableViewRotation | null;
  readonly pieceRotate: number;
  readonly pieceRoll?: number;
  readonly parentInverseRotation: string;
  readonly verticalOffset3D: number;
  readonly mode2d: boolean;
}

const DEFAULT_TABLE_X = 50;
const DEFAULT_TABLE_Y = 0;
const DEFAULT_TABLE_Z = 10;
const COS_DENOM_MIN = 0.05;

export function makeBillboardTransform(opts: BillboardTransformOptions): string {
  const tableX = opts.rotation?.x ?? DEFAULT_TABLE_X;
  const tableY = opts.rotation?.y ?? DEFAULT_TABLE_Y;
  const tableZ = opts.rotation?.z ?? DEFAULT_TABLE_Z;
  const tx = (tableX * Math.PI) / 180;
  const sinRx = Math.sin(tx);
  const cosRx = Math.cos(tx);
  const denom = Math.max(COS_DENOM_MIN, cosRx);
  const compensateZ = opts.mode2d ? '0.00' : ((-opts.verticalOffset3D * (1 - sinRx)) / denom).toFixed(2);
  const rollPart = opts.pieceRoll != null ? `rotateZ(${-opts.pieceRoll}deg) ` : '';
  return (
    `translateZ(${compensateZ}px) ` +
    rollPart +
    `${opts.parentInverseRotation} ` +
    `rotateZ(${-opts.pieceRotate}deg) ` +
    `rotateZ(${-tableZ}deg) rotateX(${-tableX}deg) rotateY(${-tableY}deg)`
  );
}

export interface LabelOrbitTransformOptions {
  readonly rotation: TableViewRotation | null;
  readonly distance3d: number;
  readonly distance2d: number;
  readonly mode2d: boolean;
}

export function makeLabelOrbitTransform(opts: LabelOrbitTransformOptions): string {
  if (!opts.mode2d) {
    return `translateY(${-opts.distance3d}px)`;
  }
  const yawRad = ((opts.rotation?.z ?? DEFAULT_TABLE_Z) * Math.PI) / 180;
  const sin = Math.sin(yawRad);
  const cos = Math.cos(yawRad);
  return `translateX(${(-opts.distance2d * sin).toFixed(2)}px) translateZ(${(-opts.distance2d * cos).toFixed(2)}px)`;
}
