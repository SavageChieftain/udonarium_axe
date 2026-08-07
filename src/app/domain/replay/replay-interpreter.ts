import {
  diffSyncData,
  flattenSyncData,
  hasChangedKey,
  type SyncData,
  type SyncDataDiff,
  syncValueOf,
} from '@axe/domain/replay/replay-diff';
import {
  ReplayDetailLevel,
  ReplayEventKind,
  type ReplayPatch,
  type ReplaySignal,
} from '@axe/domain/replay/replay-event';

export interface ReplayDraft {
  kind: ReplayEventKind;
  targetIdentifier?: string;
  detail: Record<string, unknown>;
  patch?: ReplayPatch;
  signal?: ReplaySignal;
  relatedIdentifiers?: readonly string[];
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
const CUT_IN_LAUNCHER_ALIAS = 'cut-in-launcher';
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
  const diff = diffSyncData(input.before ? flattenSyncData(input.before) : null, flattenSyncData(input.after));
  if (!diff) return null;

  const patch: ReplayPatch = {
    identifier: input.identifier,
    aliasName: input.aliasName,
    before: diff.before,
    after: diff.after,
  };
  const draft = describeChange(input, diff);
  return { ...draft, targetIdentifier: draft.targetIdentifier ?? input.identifier, patch };
}

export function interpretObjectRemove(identifier: string, aliasName: string): ReplayDraft {
  return { kind: ReplayEventKind.ObjectRemove, targetIdentifier: identifier, detail: { aliasName } };
}

export function interpretSignal(eventName: string, data: unknown): ReplayDraft | null {
  const record = (data ?? {}) as Record<string, unknown>;
  const signal: ReplaySignal = { name: eventName, data };
  switch (eventName) {
    case 'ROLL_DICE_SYMBOL':
      return {
        kind: ReplayEventKind.ObjectDiceRoll,
        targetIdentifier: asString(record['identifier']),
        detail: {},
        signal,
      };
    case 'FLIP_COIN':
      return {
        kind: ReplayEventKind.ObjectFace,
        targetIdentifier: asString(record['identifier']),
        detail: { to: asString(record['face']) },
        signal,
      };
    case 'SHUFFLE_CARD_STACK':
      return {
        kind: ReplayEventKind.ObjectShuffle,
        targetIdentifier: asString(record['identifier']),
        detail: {},
        signal,
      };
    case 'SOUND_EFFECT':
      return { kind: ReplayEventKind.MediaSoundEffect, detail: { identifier: asString(data) }, signal };
    case 'EFFECT_CAST':
      return describeEffectCast(record, signal);
    case 'SELECT_GAME_TABLE':
      return {
        kind: ReplayEventKind.TableChange,
        targetIdentifier: asString(record['identifier']),
        detail: {},
        signal,
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
): { kind: ReplayEventKind; detail: Record<string, unknown>; targetIdentifier?: string } {
  const { aliasName, before, after } = input;
  const keys = new Set(diff.keys);

  if (aliasName === CHAT_ALIAS && !before) return describeChatMessage(after);
  if (aliasName === CUT_IN_LAUNCHER_ALIAS && before) {
    const cutIn = describeCutIn(before, after, keys);
    if (cutIn) return cutIn;
  }
  if (!before) return { kind: ReplayEventKind.ObjectCreate, detail: { aliasName } };

  if (hasChangedKey(keys, 'location') || hasChangedKey(keys, 'posZ')) return describeMove(before, after);
  if (hasChangedKey(keys, 'rotate') || hasChangedKey(keys, 'roll')) return describeRotate(before, after, keys);
  if (aliasName === 'card' && hasChangedKey(keys, 'state'))
    return describeFace(syncValueOf(before, 'state'), syncValueOf(after, 'state'));
  if (hasChangedKey(keys, 'face')) return describeFace(syncValueOf(before, 'face'), syncValueOf(after, 'face'));
  if (aliasName === DATA_ALIAS && (hasChangedKey(keys, 'value') || hasChangedKey(keys, 'currentValue')))
    return describeValue(before, after, keys);
  if (hasChangedKey(keys, 'owner'))
    return {
      kind: ReplayEventKind.ObjectOwner,
      detail: fromTo(syncValueOf(before, 'owner'), syncValueOf(after, 'owner')),
    };
  if (hasChangedKey(keys, 'isLock') || hasChangedKey(keys, 'isLocked'))
    return {
      kind: ReplayEventKind.ObjectLock,
      detail: { locked: Boolean(syncValueOf(after, 'isLock') ?? syncValueOf(after, 'isLocked')) },
    };
  if (hasChangedKey(keys, 'imageIdentifier'))
    return {
      kind: ReplayEventKind.ObjectImage,
      detail: fromTo(syncValueOf(before, 'imageIdentifier'), syncValueOf(after, 'imageIdentifier')),
    };

  return { kind: ReplayEventKind.ObjectUpdate, detail: { keys: [...keys] } };
}

function describeEffectCast(record: Record<string, unknown>, signal: ReplaySignal): ReplayDraft {
  const caster = asString(record['casterIdentifier']);
  const targets = (Array.isArray(record['targets']) ? record['targets'] : [])
    .map((target) => asString((target as Record<string, unknown>)?.['identifier']))
    .filter((identifier) => identifier.length > 0);

  return {
    kind: ReplayEventKind.EffectCast,
    targetIdentifier: asString(record['presetIdentifier']),
    detail: { caster, targets },
    relatedIdentifiers: [caster, ...targets].filter((identifier) => identifier.length > 0),
    signal,
  };
}

function describeCutIn(
  before: SyncData,
  after: SyncData,
  keys: ReadonlySet<string>
): { kind: ReplayEventKind; detail: Record<string, unknown>; targetIdentifier?: string } | null {
  if (hasChangedKey(keys, 'soundOnlyTimeStamp')) {
    return {
      kind: ReplayEventKind.MediaCutIn,
      targetIdentifier: asString(syncValueOf(after, 'soundOnlyCutInIdentifier')),
      detail: { soundOnly: true, isStart: true },
    };
  }
  if (hasChangedKey(keys, 'launchTimeStamp')) {
    return {
      kind: ReplayEventKind.MediaCutIn,
      targetIdentifier: asString(syncValueOf(after, 'launchCutInIdentifier')),
      detail: { soundOnly: false, isStart: Boolean(syncValueOf(after, 'launchIsStart')) },
    };
  }
  return null;
}

function describeChatMessage(after: SyncData): { kind: ReplayEventKind; detail: Record<string, unknown> } {
  const from = asString(syncValueOf(after, 'from'));
  const detail: Record<string, unknown> = {
    text: asString(after['value']),
    name: asString(syncValueOf(after, 'name')),
    from,
    to: asString(syncValueOf(after, 'to')),
    tag: asString(syncValueOf(after, 'tag')),
    dicebot: asString(syncValueOf(after, 'dicebot')),
    timestamp: Number(syncValueOf(after, 'timestamp') ?? 0),
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
  if (hasChangedKey(keys, 'rotate'))
    detail['rotate'] = fromTo(syncValueOf(before, 'rotate'), syncValueOf(after, 'rotate'));
  if (hasChangedKey(keys, 'roll')) detail['roll'] = fromTo(syncValueOf(before, 'roll'), syncValueOf(after, 'roll'));
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
  const detail: Record<string, unknown> = { name: asString(syncValueOf(after, 'name')) };
  if (hasChangedKey(keys, 'value')) detail['value'] = fromTo(before['value'], after['value']);
  if (hasChangedKey(keys, 'currentValue'))
    detail['current'] = fromTo(syncValueOf(before, 'currentValue'), syncValueOf(after, 'currentValue'));
  return { kind: ReplayEventKind.ObjectValue, detail };
}

function positionOf(data: SyncData): Record<string, unknown> {
  const location = (syncValueOf(data, 'location') ?? {}) as Record<string, unknown>;
  const position: Record<string, unknown> = {
    name: asString(location['name']),
    x: Number(location['x'] ?? 0),
    y: Number(location['y'] ?? 0),
    z: Number(syncValueOf(data, 'posZ') ?? 0),
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
