import { partyIdsOwnedBy } from '@axe/domain/party/party-membership';
import { PeerRole } from '@axe/domain/peer/peer-role';
import { syncValueOf } from '@axe/domain/replay/replay-diff';
import type { ReplayViewer } from '@axe/domain/replay/replay-event';
import type { ReplayObjectSnapshot } from '@axe/domain/replay/replay-keyframe';
import { perimeterSegments, rectangleSegments, type Segment } from '@axe/domain/tabletop/los/segments';
import {
  computeOverlayPlan,
  type OverlayPlan,
  type SceneLight,
  type SceneViewer,
  type SceneVisionSource,
  type ShadowCaster,
  type VisionScene,
} from '@axe/domain/tabletop/vision-scene';
import type { VisionType } from '@axe/domain/tabletop/vision-types';

/**
 * 記録した盤面から、そのときの暗闇・視界・光源を組み直す。
 *
 * 生きている卓では `VisionService` が `ObjectStore` を見て同じものを作る。ここは
 * キーフレームのスナップショットしか無いので、同じ形（`VisionScene`）へ写し替えて
 * 判定そのものは `domain/tabletop/vision-scene` に任せる。二重に実装すると必ずずれる。
 */

const TABLE_ALIAS = 'game-table';
const SELECTER_ALIAS = 'TableSelecter';
const CHARACTER_ALIAS = 'character';
const TERRAIN_ALIAS = 'terrain';
const LIGHT_ALIAS = 'light-source';
const TABLE_PLACE = 'table';
const FLOOR: string = 'floor';

export function replayViewTableOf(snapshots: readonly ReplayObjectSnapshot[]): ReplayObjectSnapshot | null {
  const tables = snapshots.filter((snapshot) => snapshot.aliasName === TABLE_ALIAS);
  if (tables.length < 1) return null;

  const selecter = snapshots.find((snapshot) => snapshot.aliasName === SELECTER_ALIAS);
  const wanted = selecter ? text(selecter, 'viewTableIdentifier') : '';
  return tables.find((table) => table.identifier === wanted) ?? tables[0];
}

/** 見る人。GM は全部見える。PL は自分の持ちコマと同行者の視界だけ。 */
export function replaySceneViewer(snapshots: readonly ReplayObjectSnapshot[], viewer: ReplayViewer): SceneViewer {
  const userId = viewer.userId;
  if (viewer.role === PeerRole.GameMaster) return { userId, isGameMaster: true };
  if (viewer.role === PeerRole.Guest) {
    // 見学者は誰の視界も持たないので、卓に居る PL の視界をまとめて借りる。
    const owners = new Set<string>();
    for (const snapshot of charactersOn(snapshots)) {
      const owner = text(snapshot, 'owner');
      if (owner.length > 0) owners.add(owner);
    }
    return { userId, isGameMaster: false, visionOwnerIds: [...owners] };
  }

  const members = charactersOn(snapshots).map((snapshot) => ({
    owner: text(snapshot, 'owner'),
    partyIdentifier: text(snapshot, 'partyIdentifier'),
  }));
  return { userId, isGameMaster: false, partyIds: partyIdsOwnedBy(members, userId) };
}

export function buildReplayVisionScene(snapshots: readonly ReplayObjectSnapshot[]): VisionScene | null {
  const table = replayViewTableOf(snapshots);
  if (!table) return null;

  const gridSize = number(table, 'gridSize', 50);
  if (gridSize <= 0) return null;

  const widthPx = number(table, 'width', 20) * gridSize;
  const heightPx = number(table, 'height', 20) * gridSize;
  const terrains = terrainsOf(snapshots, table.identifier);

  return {
    darknessEnabled: flag(table, 'darknessEnabled'),
    darknessLevel: number(table, 'darknessLevel', 1),
    ambientColor: text(table, 'ambientColor') || '#000000',
    globalIllumination: number(table, 'globalIllumination'),
    gridSize,
    gridType: number(table, 'gridType'),
    snapLightToGrid: flag(table, 'lightSnapToGrid'),
    widthPx,
    heightPx,
    lights: lightsOf(snapshots, terrains, gridSize),
    visionSources: visionSourcesOf(snapshots, gridSize),
    ...segmentsOf(table, terrains, gridSize, widthPx, heightPx),
    shadowCasters: shadowCastersOf(snapshots, gridSize),
  };
}

/** 描くための計画。暗闇を使っていない卓では null。 */
export function replayOverlayPlan(
  snapshots: readonly ReplayObjectSnapshot[],
  viewer: ReplayViewer
): OverlayPlan | null {
  const scene = buildReplayVisionScene(snapshots);
  if (!scene || !scene.darknessEnabled) return null;
  return computeOverlayPlan(scene, replaySceneViewer(snapshots, viewer));
}

function charactersOn(snapshots: readonly ReplayObjectSnapshot[]): ReplayObjectSnapshot[] {
  return snapshots.filter((snapshot) => snapshot.aliasName === CHARACTER_ALIAS && onTable(snapshot));
}

function terrainsOf(snapshots: readonly ReplayObjectSnapshot[], tableIdentifier: string): ReplayObjectSnapshot[] {
  return snapshots.filter((snapshot) => {
    if (snapshot.aliasName !== TERRAIN_ALIAS) return false;
    const parent = String(snapshot.syncData['parentIdentifier'] ?? '');
    return parent.length < 1 || parent === tableIdentifier;
  });
}

function lightsOf(
  snapshots: readonly ReplayObjectSnapshot[],
  terrains: readonly ReplayObjectSnapshot[],
  gridSize: number
): SceneLight[] {
  const lights: SceneLight[] = [];

  for (const source of snapshots) {
    if (source.aliasName !== LIGHT_ALIAS) continue;
    if (!flag(source, 'isVisibleOnTable') || !flag(source, 'lightEnabled')) continue;

    // コマに付いて回る灯りは、そのコマの居る場所で光る。
    const following = text(source, 'followingCharacterIdentifier');
    const anchor = following
      ? (snapshots.find((one) => one.identifier === following && flag(one, 'isVisibleOnTable')) ?? source)
      : source;
    const centre = anchor === source ? gridSize / 2 : (gridSize * Math.max(number(anchor, 'size', 1), 0.25)) / 2;
    lights.push(lightAt(source, anchor, centre, gridSize));
  }

  for (const character of snapshots) {
    if (character.aliasName !== CHARACTER_ALIAS) continue;
    if (!flag(character, 'isVisibleOnTable') || !flag(character, 'lightEnabled')) continue;
    const centre = (gridSize * Math.max(number(character, 'size', 1), 0.25)) / 2;
    lights.push(lightAt(character, character, centre, gridSize));
  }

  for (const terrain of terrains) {
    if (!flag(terrain, 'lightEnabled')) continue;
    lights.push(
      lightAt(terrain, terrain, (number(terrain, 'width', 1) * gridSize) / 2, gridSize, {
        centreY: (number(terrain, 'depth', 1) * gridSize) / 2,
      })
    );
  }

  return lights;
}

function lightAt(
  spec: ReplayObjectSnapshot,
  anchor: ReplayObjectSnapshot,
  centreX: number,
  gridSize: number,
  options: { centreY?: number } = {}
): SceneLight {
  const location = locationOf(anchor);
  const centreY = options.centreY ?? centreX;
  const dim = Math.max(number(spec, 'lightBrightRadius'), number(spec, 'lightDimRadius'));
  return {
    x: location.x + centreX,
    y: location.y + centreY,
    z: number(anchor, 'posZ') + number(anchor, 'altitude') * gridSize,
    brightPx: number(spec, 'lightBrightRadius') * gridSize,
    dimPx: dim * gridSize,
    color: text(spec, 'lightColor') || '#ffffff',
    angle: number(spec, 'lightAngle', 360),
    direction: number(spec, 'rotate') + number(spec, 'lightDirection'),
    pitch: number(spec, 'lightPitch'),
    revealToAll: flag(spec, 'lightRevealToAll'),
    castShadows: true,
    ignoreOcclusion: false,
    animation: text(spec, 'lightAnimation'),
    sourceId: spec.identifier,
    surface: FLOOR,
  } as SceneLight;
}

function visionSourcesOf(snapshots: readonly ReplayObjectSnapshot[], gridSize: number): SceneVisionSource[] {
  const sources: SceneVisionSource[] = [];
  for (const character of charactersOn(snapshots)) {
    const owner = text(character, 'owner');
    if (owner.length < 1) continue;

    const centre = (gridSize * Math.max(number(character, 'size', 1), 0.25)) / 2;
    const location = locationOf(character);
    sources.push({
      x: location.x + centre,
      y: location.y + centre,
      type: text(character, 'visionType') as VisionType,
      rangePx: number(character, 'visionRange') * gridSize,
      owner,
      partyId: text(character, 'partyIdentifier') || undefined,
    });
  }
  return sources;
}

function shadowCastersOf(snapshots: readonly ReplayObjectSnapshot[], gridSize: number): ShadowCaster[] {
  const casters: ShadowCaster[] = [];
  for (const character of charactersOn(snapshots)) {
    if (!flag(character, 'castsShadow')) continue;

    const size = Math.max(number(character, 'size', 1), 0.25) * gridSize;
    const half = size / 2;
    const location = locationOf(character);
    casters.push({
      ownerId: character.identifier,
      x: location.x + half,
      y: location.y + half,
      radiusPx: half,
      segments: rectangleSegments(location.x, location.y, size, size, 0),
      imageUrl: '',
    });
  }
  return casters;
}

function segmentsOf(
  table: ReplayObjectSnapshot,
  terrains: readonly ReplayObjectSnapshot[],
  gridSize: number,
  widthPx: number,
  heightPx: number
): { sightSegments: Segment[]; lightSegments: Segment[] } {
  const sightSegments: Segment[] = [...perimeterSegments(widthPx, heightPx)];
  const lightSegments: Segment[] = [];

  const walls: [string, Segment][] = [
    ['showNorthWall', { x1: 0, y1: 0, x2: widthPx, y2: 0 }],
    ['showSouthWall', { x1: 0, y1: heightPx, x2: widthPx, y2: heightPx }],
    ['showWestWall', { x1: 0, y1: 0, x2: 0, y2: heightPx }],
    ['showEastWall', { x1: widthPx, y1: 0, x2: widthPx, y2: heightPx }],
  ];
  for (const [name, segment] of walls) {
    if (flag(table, name)) lightSegments.push(segment);
  }

  for (const terrain of terrains) {
    if (!flag(terrain, 'hasWall')) continue;
    if (surfaceOf(terrain) !== FLOOR) continue;

    const location = locationOf(terrain);
    const edges = rectangleSegments(
      location.x,
      location.y,
      number(terrain, 'width', 1) * gridSize,
      number(terrain, 'depth', 1) * gridSize,
      number(terrain, 'rotate')
    );
    if (flag(terrain, 'blocksSight')) sightSegments.push(...edges);
    if (flag(terrain, 'blocksLight') && !flag(terrain, 'lightEnabled')) lightSegments.push(...edges);
  }

  return { sightSegments, lightSegments };
}

function locationOf(snapshot: ReplayObjectSnapshot): { x: number; y: number; name: string; surface: string } {
  const location = (syncValueOf(snapshot.syncData, 'location') ?? {}) as Record<string, unknown>;
  return {
    x: toNumber(location['x']),
    y: toNumber(location['y']),
    name: String(location['name'] ?? ''),
    surface: String(location['surface'] ?? FLOOR),
  };
}

function surfaceOf(snapshot: ReplayObjectSnapshot): string {
  return locationOf(snapshot).surface || FLOOR;
}

function onTable(snapshot: ReplayObjectSnapshot): boolean {
  const location = locationOf(snapshot);
  return location.name === TABLE_PLACE && (location.surface || FLOOR) === FLOOR;
}

function text(snapshot: ReplayObjectSnapshot, name: string): string {
  return String(syncValueOf(snapshot.syncData, name) ?? '');
}

function flag(snapshot: ReplayObjectSnapshot, name: string): boolean {
  const value = syncValueOf(snapshot.syncData, name);
  return value === true || value === 'true';
}

function number(snapshot: ReplayObjectSnapshot, name: string, fallback = 0): number {
  return toNumber(syncValueOf(snapshot.syncData, name), fallback);
}

function toNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
