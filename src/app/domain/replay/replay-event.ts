import { PeerRole } from '@axe/domain/peer/peer-role';

export const REPLAY_FORMAT_VERSION = 1;

export const ReplayEventKind = {
  ChatMessage: 'chat.message',
  ChatDice: 'chat.dice',
  ObjectCreate: 'object.create',
  ObjectRemove: 'object.remove',
  ObjectMove: 'object.move',
  ObjectRotate: 'object.rotate',
  ObjectFace: 'object.face',
  ObjectDiceRoll: 'object.dice-roll',
  ObjectShuffle: 'object.shuffle',
  ObjectValue: 'object.value',
  ObjectImage: 'object.image',
  ObjectOwner: 'object.owner',
  ObjectLock: 'object.lock',
  ObjectUpdate: 'object.update',
  TableChange: 'table.change',
  MediaSoundEffect: 'media.se',
  MediaBgm: 'media.bgm',
  MediaCutIn: 'media.cutin',
  EffectCast: 'effect.cast',
  VnScene: 'vn.scene',
  VnPlayhead: 'vn.playhead',
  VnDirect: 'vn.direct',
  PeerJoin: 'peer.join',
  PeerLeave: 'peer.leave',
  Marker: 'marker',
} as const;

export type ReplayEventKind = (typeof ReplayEventKind)[keyof typeof ReplayEventKind];

export const ReplayDetailLevel = {
  ChatOnly: 'chat-only',
  Notable: 'notable',
  Full: 'full',
} as const;

export type ReplayDetailLevel = (typeof ReplayDetailLevel)[keyof typeof ReplayDetailLevel];

export type ReplayVisibility = { kind: 'public' } | { kind: 'gm-only' } | { kind: 'direct'; to: readonly string[] };

export const PUBLIC_VISIBILITY: ReplayVisibility = { kind: 'public' };
export const GM_ONLY_VISIBILITY: ReplayVisibility = { kind: 'gm-only' };

export interface ReplayActorSnapshot {
  userId: string;
  peerId: string;
  name: string;
  role: PeerRole;
  imageIdentifier: string;
  sinceSeq: number;
}

export interface ReplayTargetSnapshot {
  identifier: string;
  aliasName: string;
  name: string;
  ownerIdentifier?: string;
  sinceSeq: number;
}

export interface ReplayPatch {
  identifier: string;
  aliasName: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
}

export interface ReplaySignal {
  name: string;
  data: unknown;
}

export interface ReplayEvent {
  seq: number;
  at: number;
  t: number;
  kind: ReplayEventKind;
  actorId: string;
  targetId?: string;
  detail: Readonly<Record<string, unknown>>;
  patch?: ReplayPatch;
  signal?: ReplaySignal;
  visibility: ReplayVisibility;
  merged?: number;
}

export interface ReplayKeyframeMeta {
  seq: number;
  at: number;
  byteSize: number;
}

export interface ReplayChunkMeta {
  index: number;
  seqStart: number;
  seqEnd: number;
  eventCount: number;
  byteSize: number;
}

export interface ReplayManifest {
  formatVersion: number;
  roomName: string;
  startedAt: number;
  endedAt: number | null;
  recordedBy: ReplayActorSnapshot;
  detailLevel: ReplayDetailLevel;
  derivedFrom?: { roomName: string; startedAt: number };
  actors: readonly ReplayActorSnapshot[];
  targets: readonly ReplayTargetSnapshot[];
  keyframes: readonly ReplayKeyframeMeta[];
  chunks: readonly ReplayChunkMeta[];
}

export interface ReplayViewer {
  userId: string;
  role: PeerRole;
}

export function canViewReplayEvent(event: ReplayEvent, viewer: ReplayViewer): boolean {
  const visibility = event.visibility;
  if (visibility.kind === 'public') return true;
  if (viewer.role === PeerRole.GameMaster) return true;
  if (visibility.kind === 'gm-only') return false;
  return visibility.to.includes(viewer.userId) || event.actorId === viewer.userId;
}

export function resolveSnapshotAt<T extends { sinceSeq: number }>(snapshots: readonly T[], seq: number): T | null {
  let resolved: T | null = null;
  for (const snapshot of snapshots) {
    if (snapshot.sinceSeq > seq) continue;
    if (!resolved || snapshot.sinceSeq >= resolved.sinceSeq) resolved = snapshot;
  }
  return resolved ?? null;
}

export function findActorAt(
  manifest: Pick<ReplayManifest, 'actors'>,
  userId: string,
  seq: number
): ReplayActorSnapshot | null {
  return resolveSnapshotAt(
    manifest.actors.filter((actor) => actor.userId === userId),
    seq
  );
}

export function findTargetAt(
  manifest: Pick<ReplayManifest, 'targets'>,
  identifier: string,
  seq: number
): ReplayTargetSnapshot | null {
  return resolveSnapshotAt(
    manifest.targets.filter((target) => target.identifier === identifier),
    seq
  );
}
