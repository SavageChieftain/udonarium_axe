import { groupReplayChildren, replayValueOfNamed } from '@axe/domain/replay/replay-data-tree';
import { syncValueOf } from '@axe/domain/replay/replay-diff';
import type { ReplayObjectSnapshot } from '@axe/domain/replay/replay-keyframe';

export interface ReplayBoardPiece {
  identifier: string;
  aliasName: string;
  x: number;
  y: number;
  z: number;
  size: number;
  rotate: number;
  name: string;
  imageIdentifier: string;
}

export interface ReplayBoardScene {
  width: number;
  height: number;
  gridSize: number;
  imageIdentifier: string;
  backgroundImageIdentifier: string;
  pieces: readonly ReplayBoardPiece[];
}

const TABLE_ALIAS = 'game-table';
const SELECTER_ALIAS = 'TableSelecter';
const TABLE_PLACE = 'table';

const PIECE_ALIASES: ReadonlySet<string> = new Set([
  'character',
  'card',
  'card-stack',
  'terrain',
  'table-mask',
  'text-note',
  'dice-symbol',
  'coin',
]);

export function buildReplayBoardScene(snapshots: readonly ReplayObjectSnapshot[]): ReplayBoardScene | null {
  const table = viewTableOf(snapshots);
  if (!table) return null;

  const childrenOf = groupReplayChildren(snapshots);
  const pieces: ReplayBoardPiece[] = [];
  for (const snapshot of snapshots) {
    if (!PIECE_ALIASES.has(snapshot.aliasName)) continue;

    const location = syncValueOf(snapshot.syncData, 'location') as Record<string, unknown> | undefined;
    if (!location || String(location['name'] ?? '') !== TABLE_PLACE) continue;

    pieces.push({
      identifier: snapshot.identifier,
      aliasName: snapshot.aliasName,
      x: numberOf(location['x']),
      y: numberOf(location['y']),
      z: numberOf(syncValueOf(snapshot.syncData, 'posZ')),
      size: Math.max(0.25, numberOf(replayValueOfNamed(childrenOf, snapshot.identifier, ['common', 'size']), 1)),
      rotate: numberOf(syncValueOf(snapshot.syncData, 'rotate')),
      name: replayValueOfNamed(childrenOf, snapshot.identifier, ['common', 'name']),
      imageIdentifier: replayValueOfNamed(childrenOf, snapshot.identifier, ['image', 'imageIdentifier']),
    });
  }

  pieces.sort((a, b) => a.z - b.z || a.y - b.y);

  return {
    width: Math.max(1, numberOf(syncValueOf(table.syncData, 'width'), 20)),
    height: Math.max(1, numberOf(syncValueOf(table.syncData, 'height'), 20)),
    gridSize: Math.max(1, numberOf(syncValueOf(table.syncData, 'gridSize'), 50)),
    imageIdentifier: String(syncValueOf(table.syncData, 'imageIdentifier') ?? ''),
    backgroundImageIdentifier: String(syncValueOf(table.syncData, 'backgroundImageIdentifier') ?? ''),
    pieces,
  };
}

export function collectBoardAssetIds(scene: ReplayBoardScene | null): string[] {
  if (!scene) return [];
  return [
    scene.imageIdentifier,
    scene.backgroundImageIdentifier,
    ...scene.pieces.map((piece) => piece.imageIdentifier),
  ];
}

function viewTableOf(snapshots: readonly ReplayObjectSnapshot[]): ReplayObjectSnapshot | null {
  const tables = snapshots.filter((snapshot) => snapshot.aliasName === TABLE_ALIAS);
  if (tables.length < 1) return null;

  const selecter = snapshots.find((snapshot) => snapshot.aliasName === SELECTER_ALIAS);
  const wanted = selecter ? String(syncValueOf(selecter.syncData, 'viewTableIdentifier') ?? '') : '';
  return tables.find((table) => table.identifier === wanted) ?? tables[0];
}

function numberOf(value: unknown, fallback = 0): number {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
