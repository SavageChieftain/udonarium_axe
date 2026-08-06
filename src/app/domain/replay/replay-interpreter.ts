import { diffSyncData, type SyncData, type SyncDataDiff } from '@axe/domain/replay/replay-diff';
import { ReplayDetailLevel, ReplayEventKind, type ReplayPatch } from '@axe/domain/replay/replay-event';

export interface ReplayDraft {
  kind: ReplayEventKind;
  targetIdentifier?: string;
  detail: Record<string, unknown>;
  patch?: ReplayPatch;
}

export interface ObjectChangeInput {
  aliasName: string;
  identifier: string;
  before: SyncData | null;
  after: SyncData;
}

export const REPLAY_IGNORED_EVENT_NAMES: ReadonlySet<string> = new Set([
  'CURSOR_MOVE',
  'HEART_BEAT',
  'WRITING_A_MESSAGE',
  'WRITING_A_MESSAGE_DETAIL',
  'LOCAL_OBJECT_UPDATED',
  'NETWORK_ERROR',
  'PEER_RECONNECT',
  'OPEN_NETWORK',
  'CLOSE_NETWORK',
  'REQUEST_CATALOG',
  'REQUEST_GAME_OBJECT',
  'SYNCHRONIZE_GAME_OBJECT',
  'SYNCHRONIZE_FILE_LIST',
  'SYNCHRONIZE_AUDIO_LIST',
  'UPDATE_FILE_RESOURE',
  'UPDATE_AUDIO_RESOURE',
  'START_FILE_TRANSMISSION',
  'START_AUDIO_TRANSMISSION',
]);

const CHAT_ALIAS = 'chat';
const DATA_ALIAS = 'data';
const DICEBOT_SENDER = 'System-BCDice';

const CHAT_ONLY_KINDS: ReadonlySet<ReplayEventKind> = new Set([
  ReplayEventKind.ChatMessage,
  ReplayEventKind.ChatDice,
  ReplayEventKind.Marker,
]);

export function isIgnoredReplayEvent(eventName: string): boolean {
  if (REPLAY_IGNORED_EVENT_NAMES.has(eventName)) return true;
  return eventName.startsWith('FILE_') || eventName.startsWith('AUDIO_') || eventName.startsWith('CANCEL_TASK_');
}

export function isRecordableKind(kind: ReplayEventKind, level: ReplayDetailLevel): boolean {
  if (level === ReplayDetailLevel.Full) return true;
  if (level === ReplayDetailLevel.ChatOnly) return CHAT_ONLY_KINDS.has(kind);
  return kind !== ReplayEventKind.ObjectUpdate;
}

export function interpretObjectChange(input: ObjectChangeInput): ReplayDraft | null {
  const diff = diffSyncData(input.before, input.after);
  if (!diff) return null;

  const patch: ReplayPatch = {
    identifier: input.identifier,
    aliasName: input.aliasName,
    before: diff.before,
    after: diff.after,
  };
  const draft = describeChange(input, diff);
  return { ...draft, targetIdentifier: input.identifier, patch };
}

export function interpretObjectRemove(identifier: string, aliasName: string): ReplayDraft {
  return { kind: ReplayEventKind.ObjectRemove, targetIdentifier: identifier, detail: { aliasName } };
}

export function interpretSignal(eventName: string, data: unknown): ReplayDraft | null {
  const record = (data ?? {}) as Record<string, unknown>;
  switch (eventName) {
    case 'ROLL_DICE_SYMBOL':
      return {
        kind: ReplayEventKind.ObjectDiceRoll,
        targetIdentifier: asString(record['identifier']),
        detail: {},
      };
    case 'FLIP_COIN':
      return {
        kind: ReplayEventKind.ObjectFace,
        targetIdentifier: asString(record['identifier']),
        detail: { to: asString(record['face']) },
      };
    case 'SHUFFLE_CARD_STACK':
      return {
        kind: ReplayEventKind.ObjectShuffle,
        targetIdentifier: asString(record['identifier']),
        detail: {},
      };
    case 'SOUND_EFFECT':
      return { kind: ReplayEventKind.MediaSoundEffect, detail: { identifier: asString(data) } };
    case 'EFFECT_CAST':
      return { kind: ReplayEventKind.EffectCast, detail: { cast: data } };
    case 'SELECT_GAME_TABLE':
      return {
        kind: ReplayEventKind.TableChange,
        targetIdentifier: asString(record['identifier']),
        detail: {},
      };
    case 'RESOURCE_CHANGE':
      return {
        kind: ReplayEventKind.ObjectValue,
        targetIdentifier: asString(record['characterIdentifier']),
        detail: { changes: record['changes'] ?? [] },
      };
    case 'CONNECT_PEER':
      return { kind: ReplayEventKind.PeerJoin, detail: { peerId: asString(record['peerId']) } };
    case 'DISCONNECT_PEER':
      return { kind: ReplayEventKind.PeerLeave, detail: { peerId: asString(record['peerId']) } };
    default:
      return null;
  }
}

function describeChange(
  input: ObjectChangeInput,
  diff: SyncDataDiff
): { kind: ReplayEventKind; detail: Record<string, unknown> } {
  const { aliasName, before, after } = input;
  const keys = new Set(diff.keys);

  if (aliasName === CHAT_ALIAS && !before) return describeChatMessage(after);
  if (!before) return { kind: ReplayEventKind.ObjectCreate, detail: { aliasName } };

  if (keys.has('location') || keys.has('posZ')) return describeMove(before, after);
  if (keys.has('rotate') || keys.has('roll')) return describeRotate(before, after, keys);
  if (aliasName === 'card' && keys.has('state')) return describeFace(before['state'], after['state']);
  if (keys.has('face')) return describeFace(before['face'], after['face']);
  if (aliasName === DATA_ALIAS && (keys.has('value') || keys.has('currentValue')))
    return describeValue(before, after, keys);
  if (keys.has('owner')) return { kind: ReplayEventKind.ObjectOwner, detail: fromTo(before['owner'], after['owner']) };
  if (keys.has('isLock') || keys.has('isLocked'))
    return {
      kind: ReplayEventKind.ObjectLock,
      detail: { locked: Boolean(after['isLock'] ?? after['isLocked']) },
    };
  if (keys.has('imageIdentifier'))
    return {
      kind: ReplayEventKind.ObjectImage,
      detail: fromTo(before['imageIdentifier'], after['imageIdentifier']),
    };

  return { kind: ReplayEventKind.ObjectUpdate, detail: { keys: [...keys] } };
}

function describeChatMessage(after: SyncData): { kind: ReplayEventKind; detail: Record<string, unknown> } {
  const attributes = (after['attributes'] ?? {}) as Record<string, unknown>;
  const from = asString(after['from']);
  const detail: Record<string, unknown> = {
    text: asString(after['value']),
    name: asString(after['name']),
    from,
    to: asString(after['to']),
    tag: asString(after['tag']),
    dicebot: asString(after['dicebot']),
    timestamp: Number(attributes['timestamp'] ?? 0),
    tabIdentifier: asString(after['parentIdentifier']),
  };
  const kind = from === DICEBOT_SENDER ? ReplayEventKind.ChatDice : ReplayEventKind.ChatMessage;
  return { kind, detail };
}

function describeMove(before: SyncData, after: SyncData): { kind: ReplayEventKind; detail: Record<string, unknown> } {
  return {
    kind: ReplayEventKind.ObjectMove,
    detail: { from: positionOf(before), to: positionOf(after) },
  };
}

function describeRotate(
  before: SyncData,
  after: SyncData,
  keys: ReadonlySet<string>
): { kind: ReplayEventKind; detail: Record<string, unknown> } {
  const detail: Record<string, unknown> = {};
  if (keys.has('rotate')) detail['rotate'] = fromTo(before['rotate'], after['rotate']);
  if (keys.has('roll')) detail['roll'] = fromTo(before['roll'], after['roll']);
  return { kind: ReplayEventKind.ObjectRotate, detail };
}

function describeFace(before: unknown, after: unknown): { kind: ReplayEventKind; detail: Record<string, unknown> } {
  return { kind: ReplayEventKind.ObjectFace, detail: fromTo(before, after) };
}

function describeValue(
  before: SyncData,
  after: SyncData,
  keys: ReadonlySet<string>
): { kind: ReplayEventKind; detail: Record<string, unknown> } {
  const attributes = (after['attributes'] ?? {}) as Record<string, unknown>;
  const detail: Record<string, unknown> = { name: asString(attributes['name']) };
  if (keys.has('value')) detail['value'] = fromTo(before['value'], after['value']);
  if (keys.has('currentValue')) detail['current'] = fromTo(before['currentValue'], after['currentValue']);
  return { kind: ReplayEventKind.ObjectValue, detail };
}

function positionOf(data: SyncData): Record<string, unknown> {
  const location = (data['location'] ?? {}) as Record<string, unknown>;
  const position: Record<string, unknown> = {
    name: asString(location['name']),
    x: Number(location['x'] ?? 0),
    y: Number(location['y'] ?? 0),
    z: Number(data['posZ'] ?? 0),
  };
  if (location['surface'] != null) position['surface'] = asString(location['surface']);
  return position;
}

function fromTo(before: unknown, after: unknown): Record<string, unknown> {
  return { from: before ?? null, to: after ?? null };
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}
