import { TableSurface } from '@axe/domain/tabletop/tabletop-object';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface SurfaceFrame {
  origin: Vec3;
  u: Vec3;
  v: Vec3;
  normal: Vec3;
}

export interface SurfaceDims {
  widthPx: number;
  depthPx: number;
  wallHeightPx: number;
}

export function surfaceFrame(surface: TableSurface, dims: SurfaceDims): SurfaceFrame {
  const { widthPx, depthPx, wallHeightPx } = dims;
  switch (surface) {
    case 'north-wall':
      return {
        origin: { x: 0, y: 0, z: wallHeightPx },
        u: { x: 1, y: 0, z: 0 },
        v: { x: 0, y: 0, z: -1 },
        normal: { x: 0, y: 1, z: 0 },
      };
    case 'south-wall':
      return {
        origin: { x: widthPx, y: depthPx, z: wallHeightPx },
        u: { x: -1, y: 0, z: 0 },
        v: { x: 0, y: 0, z: -1 },
        normal: { x: 0, y: -1, z: 0 },
      };
    case 'west-wall':
      return {
        origin: { x: 0, y: 0, z: wallHeightPx },
        u: { x: 0, y: 1, z: 0 },
        v: { x: 0, y: 0, z: -1 },
        normal: { x: 1, y: 0, z: 0 },
      };
    case 'east-wall':
      return {
        origin: { x: widthPx, y: depthPx, z: wallHeightPx },
        u: { x: 0, y: -1, z: 0 },
        v: { x: 0, y: 0, z: -1 },
        normal: { x: -1, y: 0, z: 0 },
      };
    default:
      return {
        origin: { x: 0, y: 0, z: 0 },
        u: { x: 1, y: 0, z: 0 },
        v: { x: 0, y: 1, z: 0 },
        normal: { x: 0, y: 0, z: 1 },
      };
  }
}

export function surfacePointTo3D(
  surface: TableSurface,
  localX: number,
  localY: number,
  dims: SurfaceDims,
  heightAbove = 0
): Vec3 {
  const f = surfaceFrame(surface, dims);
  return {
    x: f.origin.x + f.u.x * localX + f.v.x * localY + f.normal.x * heightAbove,
    y: f.origin.y + f.u.y * localX + f.v.y * localY + f.normal.y * heightAbove,
    z: f.origin.z + f.u.z * localX + f.v.z * localY + f.normal.z * heightAbove,
  };
}

export function surfaceInwardDirection(surface: TableSurface): number {
  const n = surfaceFrame(surface, { widthPx: 0, depthPx: 0, wallHeightPx: 0 }).normal;
  return (Math.atan2(n.y, n.x) * 180) / Math.PI;
}
