import { Point, Segment, segmentClear } from '@axe/domain/tabletop/los/segments';
import { computeVisibilityPolygon } from '@axe/domain/tabletop/los/visibility-polygon';
import { surfaceFrame } from '@axe/domain/tabletop/surface-space';
import { TableSurface } from '@axe/domain/tabletop/tabletop-object';
import { VisionType } from '@axe/domain/tabletop/vision-types';

const LIGHT_SAMPLE_COUNT = 64;
const VISION_SAMPLE_COUNT = 64;
const GM_DIM_FACTOR = 0.4;
const THERMAL_COLOR = '#ff5a1e';

export interface SceneLight {
  x: number;
  y: number;
  z: number;
  brightPx: number;
  dimPx: number;
  color: string;
  angle: number;
  direction: number;
  pitch: number;
  revealToAll: boolean;
  castShadows: boolean;
  ignoreOcclusion: boolean;
  animation: string;
  sourceId: string;
  surface: TableSurface;
}

export interface SceneVisionSource {
  x: number;
  y: number;
  type: VisionType;
  rangePx: number;
  owner: string;
}

export interface SceneViewer {
  userId: string;
  isGameMaster: boolean;
}

export interface ShadowCaster {
  ownerId: string;
  x: number;
  y: number;
  radiusPx: number;
  segments: Segment[];
  imageUrl: string;
}

export interface ShadowShape {
  x: number;
  y: number;
  fx: number;
  fy: number;
  width: number;
  points: Point[];
  color: string;
  imageUrl: string;
  clipPolygon?: Point[];
}

export interface WallFace {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  nx: number;
  ny: number;
  heightPx: number;
}

export interface WallSilhouette {
  localX: number;
  width: number;
  height: number;
  alpha: number;
  imageUrl: string;
}

export interface WallLight {
  localX: number;
  localY: number;
  radiusX: number;
  radiusY: number;
  color: string;
  intensity: number;
}

export interface VisionScene {
  darknessEnabled: boolean;
  darknessLevel: number;
  ambientColor: string;
  globalIllumination: number;
  gridSize: number;
  widthPx: number;
  heightPx: number;
  lights: SceneLight[];
  visionSources: SceneVisionSource[];
  sightSegments: Segment[];
  lightSegments: Segment[];
  shadowCasters: ShadowCaster[];
}

export interface OverlayShape {
  x: number;
  y: number;
  brightPx: number;
  dimPx: number;
  angle: number;
  direction: number;
  color: string;
  full: boolean;
  clipPolygon?: Point[];
  animation?: string;
}

export interface OverlayPlan {
  darknessAlpha: number;
  darknessColor: string;
  baseRevealAlpha: number;
  reveals: OverlayShape[];
  glows: OverlayShape[];
  shadows: ShadowShape[];
}

export interface LightBeam {
  width: number;
  height: number;
  clip: string;
  color: string;
  fins: string[];
}

export interface LightGlow {
  x: number;
  y: number;
  z: number;
  size: number;
  color: string;
  transform: string | null;
}

const BEAM_FIN_COUNT = 3;
const GLOW_MAX_RADIUS_PX = 450;

const SHADOW_SPREAD = 2.2;

const TWO_PI = Math.PI * 2;

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function distance(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

export function lightAxis(light: SceneLight): { x: number; y: number; z: number } {
  const dir = (light.direction * Math.PI) / 180;
  const pit = (light.pitch * Math.PI) / 180;
  const cp = Math.cos(pit);
  return { x: Math.cos(dir) * cp, y: Math.sin(dir) * cp, z: Math.sin(pit) };
}

export function floorRadii(light: SceneLight): { brightFloor: number; dimFloor: number } {
  const z2 = light.z * light.z;
  return {
    brightFloor: Math.sqrt(Math.max(0, light.brightPx * light.brightPx - z2)),
    dimFloor: Math.sqrt(Math.max(0, light.dimPx * light.dimPx - z2)),
  };
}

export function computeLightBeam(light: SceneLight): LightBeam | null {
  if (light.angle >= 360 || light.z < 1) return null;
  const axis = lightAxis(light);
  if (axis.z > -0.05) return null;
  const half = (light.angle * Math.PI) / 360;
  const tanHalf = Math.tan(half);
  const tFloor = -light.z / axis.z;
  const slant = Math.min(tFloor, light.dimPx);
  const height = Math.max(slant, 1);
  const width = Math.max(2 * slant * tanHalf, 1);
  let ux = axis.y;
  let uy = -axis.x;
  let uz = 0;
  let ulen = Math.hypot(ux, uy, uz);
  if (ulen < 1e-6) {
    ux = 1;
    uy = 0;
    uz = 0;
    ulen = 1;
  }
  ux /= ulen;
  uy /= ulen;
  uz /= ulen;
  const vx = axis.y * uz - axis.z * uy;
  const vy = axis.z * ux - axis.x * uz;
  const vz = axis.x * uy - axis.y * ux;
  const fins: string[] = [];
  for (let k = 0; k < BEAM_FIN_COUNT; k++) {
    const beta = (k / BEAM_FIN_COUNT) * Math.PI;
    const cb = Math.cos(beta);
    const sb = Math.sin(beta);
    const px = ux * cb + vx * sb;
    const py = uy * cb + vy * sb;
    const pz = uz * cb + vz * sb;
    const nx = py * axis.z - pz * axis.y;
    const ny = pz * axis.x - px * axis.z;
    const nz = px * axis.y - py * axis.x;
    const tx = light.x - px * (width / 2);
    const ty = light.y - py * (width / 2);
    const tz = light.z - pz * (width / 2);
    fins.push(`matrix3d(${px},${py},${pz},0,${axis.x},${axis.y},${axis.z},0,${nx},${ny},${nz},0,${tx},${ty},${tz},1)`);
  }
  return { width, height, clip: 'polygon(50% 0%, 0% 100%, 100% 100%)', color: light.color, fins };
}

export function computeLightGlow(light: SceneLight, gridSize: number): LightGlow | null {
  if (light.angle < 360 || light.dimPx < 1 || light.brightPx > GLOW_MAX_RADIUS_PX) return null;
  const r = Math.min(gridSize, Math.max(0.4 * gridSize, light.brightPx * 0.3));
  const size = 2 * r;
  if (light.surface === 'floor') {
    return { x: light.x, y: light.y, z: light.z, size, color: light.color, transform: null };
  }
  const f = surfaceFrame(light.surface, { widthPx: 0, depthPx: 0, wallHeightPx: 0 });
  const tx = light.x - f.u.x * r - f.v.x * r;
  const ty = light.y - f.u.y * r - f.v.y * r;
  const tz = light.z - f.u.z * r - f.v.z * r;
  const transform =
    `matrix3d(${f.u.x},${f.u.y},${f.u.z},0,${f.v.x},${f.v.y},${f.v.z},0,` +
    `${f.normal.x},${f.normal.y},${f.normal.z},0,${tx},${ty},${tz},1)`;
  return { x: light.x, y: light.y, z: light.z, size, color: light.color, transform };
}

export function withinCone(light: SceneLight, x: number, y: number, pz = 0): boolean {
  if (light.angle >= 360) return true;
  const vx = x - light.x;
  const vy = y - light.y;
  const vz = pz - light.z;
  const len = Math.hypot(vx, vy, vz);
  if (len < 1e-9) return true;
  const axis = lightAxis(light);
  const dot = (vx * axis.x + vy * axis.y + vz * axis.z) / len;
  return dot >= Math.cos((light.angle * Math.PI) / 360);
}

export function seesInDark(type: VisionType): boolean {
  return type === VisionType.DARKVISION || type === VisionType.TRUESIGHT || type === VisionType.THERMAL;
}

function occludersFor(scene: VisionScene, light: SceneLight, ignoreShadowCasters = false): Segment[] {
  const walls = light.ignoreOcclusion ? [] : scene.lightSegments;
  if (ignoreShadowCasters || !light.castShadows) return walls;
  const shadowSegments: Segment[] = [];
  for (const caster of scene.shadowCasters) {
    if (caster.ownerId === light.sourceId) continue;
    shadowSegments.push(...caster.segments);
  }
  if (shadowSegments.length === 0) return walls;
  return [...walls, ...shadowSegments];
}

export function lightReaches(
  scene: VisionScene,
  light: SceneLight,
  x: number,
  y: number,
  ignoreShadowCasters = false,
  pz = 0
): boolean {
  if (Math.hypot(x - light.x, y - light.y, pz - light.z) > light.dimPx) return false;
  if (!withinCone(light, x, y, pz)) return false;
  const occluders = occludersFor(scene, light, ignoreShadowCasters);
  if (occluders.length === 0) return true;
  return segmentClear(light.x, light.y, x, y, occluders);
}

export function lightLevelAt(scene: VisionScene, x: number, y: number, ignoreShadowCasters = false, pz = 0): number {
  let level = clamp01(scene.globalIllumination);
  for (const light of scene.lights) {
    if (!lightReaches(scene, light, x, y, ignoreShadowCasters, pz)) continue;
    const contribution = Math.hypot(x - light.x, y - light.y, pz - light.z) <= light.brightPx ? 1 : 0.5;
    if (contribution > level) level = contribution;
  }
  return level;
}

export function isLit(scene: VisionScene, x: number, y: number, ignoreShadowCasters = false, pz = 0): boolean {
  return lightLevelAt(scene, x, y, ignoreShadowCasters, pz) > 0;
}

function ownedSources(scene: VisionScene, userId: string): SceneVisionSource[] {
  return scene.visionSources.filter((source) => source.owner === userId && source.type !== VisionType.BLIND);
}

export function computeWallSilhouettes(scene: VisionScene, face: WallFace, casterHeightPx: number): WallSilhouette[] {
  const result: WallSilhouette[] = [];
  const dax = face.bx - face.ax;
  const day = face.by - face.ay;
  const len = Math.hypot(dax, day);
  if (len < 1) return result;

  for (const light of scene.lights) {
    if ((light.x - face.ax) * face.nx + (light.y - face.ay) * face.ny <= 0) continue;
    for (const caster of scene.shadowCasters) {
      if (caster.ownerId === light.sourceId) continue;
      if ((caster.x - face.ax) * face.nx + (caster.y - face.ay) * face.ny <= 0) continue;
      const toLight = Math.hypot(light.x - caster.x, light.y - caster.y);
      let lx = caster.x;
      let ly = caster.y;
      if (toLight > caster.radiusPx) {
        const u = caster.radiusPx / toLight;
        lx = caster.x + (light.x - caster.x) * u;
        ly = caster.y + (light.y - caster.y) * u;
      }
      if (!lightReaches(scene, light, lx, ly, true)) continue;

      const dx = caster.x - light.x;
      const dy = caster.y - light.y;
      const denom = dx * day - dy * dax;
      if (Math.abs(denom) < 1e-9) continue;
      const t = ((face.ax - light.x) * day - (face.ay - light.y) * dax) / denom;
      const s = ((face.ax - light.x) * dy - (face.ay - light.y) * dx) / denom;
      if (t <= 1) continue;

      const width = caster.radiusPx * 2 * t;
      const center = s * len;
      if (center + width / 2 <= 0 || center - width / 2 >= len) continue;
      const height = Math.min(casterHeightPx * t, face.heightPx);
      result.push({ localX: center, width, height, alpha: 0.75, imageUrl: caster.imageUrl });
    }
  }
  return result;
}

export function computeWallLights(scene: VisionScene, face: WallFace): WallLight[] {
  const result: WallLight[] = [];
  const dax = face.bx - face.ax;
  const day = face.by - face.ay;
  const len = Math.hypot(dax, day);
  if (len < 1) return result;
  const ux = dax / len;
  const uy = day / len;

  for (const light of scene.lights) {
    const rel = (light.x - face.ax) * face.nx + (light.y - face.ay) * face.ny;
    if (rel <= 0 || rel > light.dimPx) continue;
    const along = (light.x - face.ax) * ux + (light.y - face.ay) * uy;
    const footX = face.ax + ux * along;
    const footY = face.ay + uy * along;
    if (!lightReaches(scene, light, footX, footY, true)) continue;
    const half = Math.sqrt(Math.max(0, light.dimPx * light.dimPx - rel * rel));
    if (half < 1) continue;
    result.push({
      localX: along,
      localY: face.heightPx - light.z,
      radiusX: half,
      radiusY: half,
      color: light.color,
      intensity: rel <= light.brightPx ? 1 : 0.6,
    });
  }
  return result;
}

export function darknessAlphaFor(scene: VisionScene, viewer: SceneViewer): number {
  if (!scene.darknessEnabled) return 0;
  const global = clamp01(scene.globalIllumination);
  const base = clamp01(scene.darknessLevel) * (1 - global);
  return viewer.isGameMaster ? base * GM_DIM_FACTOR : base;
}

export function isPointVisible(scene: VisionScene, x: number, y: number, viewer: SceneViewer): boolean {
  if (viewer.isGameMaster) return true;

  const sources = ownedSources(scene, viewer.userId);
  const lit = isLit(scene, x, y, true);
  if (sources.length === 0) return lit;

  for (const source of sources) {
    const withinRange = source.rangePx > 0 && distance(x, y, source.x, source.y) <= source.rangePx;
    if (source.type === VisionType.TRUESIGHT && withinRange) return true;
    if (!segmentClear(source.x, source.y, x, y, scene.sightSegments)) continue;
    if (lit) return true;
    if (seesInDark(source.type) && withinRange) return true;
  }
  return false;
}

export function objectLightLevel(
  scene: VisionScene,
  x: number,
  y: number,
  radiusPx: number,
  ignoreShadowCasters = false,
  pz = 0
): number {
  let level = clamp01(scene.globalIllumination);
  for (const light of scene.lights) {
    const dx = light.x - x;
    const dy = light.y - y;
    const dist = Math.hypot(dx, dy, light.z - pz);
    if (dist - radiusPx > light.dimPx) continue;
    let sx = x;
    let sy = y;
    const dist2d = Math.hypot(dx, dy);
    if (radiusPx > 0 && dist2d > radiusPx) {
      const u = radiusPx / dist2d;
      sx = x + dx * u;
      sy = y + dy * u;
    }
    if (!lightReaches(scene, light, sx, sy, ignoreShadowCasters, pz)) continue;
    const reach = Math.hypot(light.x - sx, light.y - sy, light.z - pz);
    const contribution = reach <= light.brightPx ? 1 : 0.5;
    if (contribution > level) level = contribution;
  }
  return level;
}

export function objectBrightnessFor(
  scene: VisionScene,
  viewer: SceneViewer,
  x: number,
  y: number,
  radiusPx: number,
  ignoreShadowCasters = false
): number {
  const base = 1 - darknessAlphaFor(scene, viewer);
  const level = objectLightLevel(scene, x, y, radiusPx, ignoreShadowCasters);
  if (level >= 1) return 1;
  if (level > 0) return Math.max(base, 0.7);
  if (isPointVisible(scene, x, y, viewer)) return Math.max(base, 0.4);
  return base;
}

function lightClipPolygon(scene: VisionScene, light: SceneLight, radius: number = light.dimPx): Point[] | undefined {
  const occluders = occludersFor(scene, light, true);
  if (occluders.length === 0) return undefined;
  return computeVisibilityPolygon(light.x, light.y, occluders, radius, LIGHT_SAMPLE_COUNT);
}

function coneFloorFootprint(
  scene: VisionScene,
  light: SceneLight
): { cx: number; cy: number; maxR: number; points: Point[] } | null {
  const axis = lightAxis(light);
  if (axis.z > -0.05) return null;
  const t = -light.z / axis.z;
  const cx = light.x + axis.x * t;
  const cy = light.y + axis.y * t;
  const occluders = occludersFor(scene, light, true);
  const points: Point[] = [];
  let maxR = 0;
  for (let i = 0; i < LIGHT_SAMPLE_COUNT; i++) {
    const a = (i / LIGHT_SAMPLE_COUNT) * TWO_PI;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    let lo = 0;
    let hi = light.dimPx;
    for (let it = 0; it < 16; it++) {
      const mid = (lo + hi) / 2;
      const px = cx + dx * mid;
      const py = cy + dy * mid;
      const inCone = withinCone(light, px, py, 0);
      const inReach = Math.hypot(px - light.x, py - light.y, light.z) <= light.dimPx;
      const clear = occluders.length === 0 || segmentClear(light.x, light.y, px, py, occluders);
      if (inCone && inReach && clear) lo = mid;
      else hi = mid;
    }
    points.push({ x: cx + dx * lo, y: cy + dy * lo });
    if (lo > maxR) maxR = lo;
  }
  if (maxR < 1) return null;
  return { cx, cy, maxR, points };
}

function lightOverlayShape(scene: VisionScene, light: SceneLight): OverlayShape | null {
  if (light.angle < 360) {
    const fp = coneFloorFootprint(scene, light);
    if (!fp) return null;
    const ratio = light.dimPx > 0 ? light.brightPx / light.dimPx : 1;
    return {
      x: fp.cx,
      y: fp.cy,
      brightPx: fp.maxR * ratio,
      dimPx: fp.maxR,
      angle: 360,
      direction: 0,
      color: light.color,
      full: false,
      clipPolygon: fp.points,
      animation: light.animation,
    };
  }
  const { brightFloor, dimFloor } = floorRadii(light);
  if (dimFloor < 1) return null;
  return {
    x: light.x,
    y: light.y,
    brightPx: brightFloor,
    dimPx: dimFloor,
    angle: 360,
    direction: 0,
    color: light.color,
    full: false,
    clipPolygon: lightClipPolygon(scene, light, dimFloor),
    animation: light.animation,
  };
}

function addLightShadows(
  scene: VisionScene,
  light: SceneLight,
  clipPolygon: Point[] | undefined,
  shadows: ShadowShape[]
): void {
  for (const caster of scene.shadowCasters) {
    if (caster.ownerId === light.sourceId) continue;
    const dx = caster.x - light.x;
    const dy = caster.y - light.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1 || dist - caster.radiusPx > light.dimPx) continue;
    if (!withinCone(light, caster.x, caster.y)) continue;
    const ux = dx / dist;
    const uy = dy / dist;
    const px = -uy;
    const py = ux;
    const len = Math.max(caster.radiusPx * 2, light.dimPx - dist);
    const nearR = caster.radiusPx;
    const farR = caster.radiusPx * SHADOW_SPREAD;
    const fx = caster.x + ux * len;
    const fy = caster.y + uy * len;
    shadows.push({
      x: caster.x,
      y: caster.y,
      fx,
      fy,
      width: caster.radiusPx * 2,
      color: scene.ambientColor,
      imageUrl: caster.imageUrl,
      points: [
        { x: caster.x + px * nearR, y: caster.y + py * nearR },
        { x: fx + px * farR, y: fy + py * farR },
        { x: fx - px * farR, y: fy - py * farR },
        { x: caster.x - px * nearR, y: caster.y - py * nearR },
      ],
      clipPolygon,
    });
  }
}

export function computeOverlayPlan(scene: VisionScene, viewer: SceneViewer): OverlayPlan {
  const glows: OverlayShape[] = [];
  const reveals: OverlayShape[] = [];
  const shadows: ShadowShape[] = [];
  const isGm = viewer.isGameMaster;
  const global = clamp01(scene.globalIllumination);

  for (const light of scene.lights) {
    const shape = lightOverlayShape(scene, light);
    if (!shape) continue;
    reveals.push(shape);
    glows.push(shape);
    if (light.castShadows) addLightShadows(scene, light, shape.clipPolygon, shadows);
  }

  if (!isGm) {
    for (const source of ownedSources(scene, viewer.userId)) {
      if (!seesInDark(source.type) || source.rangePx <= 0) continue;
      const clipPolygon =
        source.type === VisionType.TRUESIGHT
          ? undefined
          : computeVisibilityPolygon(source.x, source.y, scene.sightSegments, source.rangePx, VISION_SAMPLE_COUNT);
      reveals.push({
        x: source.x,
        y: source.y,
        brightPx: source.rangePx,
        dimPx: source.rangePx,
        angle: 360,
        direction: 0,
        color: scene.ambientColor,
        full: true,
        clipPolygon,
      });
      if (source.type === VisionType.THERMAL) {
        glows.push({
          x: source.x,
          y: source.y,
          brightPx: source.rangePx,
          dimPx: source.rangePx,
          angle: 360,
          direction: 0,
          color: THERMAL_COLOR,
          full: false,
          clipPolygon,
        });
      }
    }
  }

  return {
    darknessAlpha: darknessAlphaFor(scene, viewer),
    darknessColor: scene.ambientColor,
    baseRevealAlpha: global,
    reveals,
    glows,
    shadows,
  };
}
