import { type ReplayEvent, ReplayEventKind } from '@axe/domain/replay/replay-event';

export interface ReplayNameLookup {
  actorName(userId: string): string;
  targetName(identifier: string): string;
}

export interface ReplayLogLine {
  key: string;
  params: Record<string, string | number>;
  paramKeys?: Record<string, string>;
  icon: string;
  isSecret: boolean;
}

const TABLE_PLACE = 'table';
const DEFAULT_SURFACE = 'floor';

const ICONS: Record<string, string> = {
  [ReplayEventKind.ChatMessage]: 'chat_bubble',
  [ReplayEventKind.ChatDice]: 'casino',
  [ReplayEventKind.ObjectCreate]: 'add_circle',
  [ReplayEventKind.ObjectRemove]: 'delete',
  [ReplayEventKind.ObjectMove]: 'open_with',
  [ReplayEventKind.ObjectRotate]: 'rotate_right',
  [ReplayEventKind.ObjectFace]: 'flip',
  [ReplayEventKind.ObjectDiceRoll]: 'casino',
  [ReplayEventKind.ObjectShuffle]: 'shuffle',
  [ReplayEventKind.ObjectValue]: 'exposure',
  [ReplayEventKind.ObjectImage]: 'image',
  [ReplayEventKind.ObjectOwner]: 'person',
  [ReplayEventKind.ObjectLock]: 'lock',
  [ReplayEventKind.ObjectUpdate]: 'edit',
  [ReplayEventKind.TableChange]: 'grid_on',
  [ReplayEventKind.MediaSoundEffect]: 'volume_up',
  [ReplayEventKind.MediaCutIn]: 'movie',
  [ReplayEventKind.EffectCast]: 'auto_awesome',
  [ReplayEventKind.PeerJoin]: 'login',
  [ReplayEventKind.PeerLeave]: 'logout',
  [ReplayEventKind.Marker]: 'bookmark',
};

export function formatReplayTime(at: number): string {
  const date = new Date(at);
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function formatReplayElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor(total / 60) % 60)}:${pad(total % 60)}`;
}

export function toReplayLogLine(event: ReplayEvent, names: ReplayNameLookup): ReplayLogLine {
  const actor = names.actorName(event.actorId);
  const target = event.targetId ? names.targetName(event.targetId) : '';
  const detail = event.detail;
  const isSecret = event.visibility.kind !== 'public';
  const icon = ICONS[event.kind] ?? 'radio_button_unchecked';
  const line = (
    key: string,
    params: Record<string, string | number> = {},
    paramKeys?: Record<string, string>
  ): ReplayLogLine => ({
    key: `feature.replay.line.${key}`,
    params: { actor, target, ...params },
    ...(paramKeys ? { paramKeys } : {}),
    icon,
    isSecret,
  });

  switch (event.kind) {
    case ReplayEventKind.ChatMessage:
      return line('chat', { speaker: text(detail['name']) || actor, text: text(detail['text']) });
    case ReplayEventKind.ChatDice:
      return line('dice', { text: text(detail['text']) });
    case ReplayEventKind.ObjectMove:
      return describeMoveLine(line, detail, names);
    case ReplayEventKind.ObjectRotate:
      return line('rotate', { angle: Math.round(numberOf(pick(detail['rotate'], 'to'))) });
    case ReplayEventKind.ObjectFace:
      return line('face', { face: text(detail['to']) });
    case ReplayEventKind.ObjectDiceRoll:
      return line('diceRoll');
    case ReplayEventKind.ObjectShuffle:
      return line('shuffle');
    case ReplayEventKind.ObjectValue:
      return line('value', {
        name: text(detail['name']),
        from: text(pick(detail['current'] ?? detail['value'], 'from')),
        to: text(pick(detail['current'] ?? detail['value'], 'to')),
      });
    case ReplayEventKind.ObjectImage:
      return line('image');
    case ReplayEventKind.ObjectOwner:
      return line('owner', { owner: names.actorName(text(detail['to'])) });
    case ReplayEventKind.ObjectLock:
      return line(detail['locked'] === true ? 'lock' : 'unlock');
    case ReplayEventKind.ObjectCreate:
      return line('create');
    case ReplayEventKind.ObjectRemove:
      return line('remove');
    case ReplayEventKind.TableChange:
      return line('table');
    case ReplayEventKind.MediaSoundEffect:
      return line('soundEffect');
    case ReplayEventKind.MediaCutIn:
      return line('cutIn');
    case ReplayEventKind.EffectCast:
      return describeEffectLine(line, detail, names, target);
    case ReplayEventKind.PeerJoin:
      return line('join');
    case ReplayEventKind.PeerLeave:
      return line('leave');
    case ReplayEventKind.Marker:
      return line('marker', { label: text(detail['label']) });
    default:
      return line('update');
  }
}

function describeEffectLine(
  line: LineFactory,
  detail: Readonly<Record<string, unknown>>,
  names: ReplayNameLookup,
  presetName: string
): ReplayLogLine {
  const targetNames = (Array.isArray(detail['targets']) ? detail['targets'] : [])
    .map((identifier) => names.targetName(text(identifier)) || text(identifier))
    .filter((name) => name.length > 0);
  const casterId = text(detail['caster']);
  const caster = casterId.length > 0 ? names.targetName(casterId) || casterId : '';
  const params = { effect: presetName, targets: targetNames.join('、') };

  if (targetNames.length < 1) return line('effect', { effect: presetName });
  if (caster.length > 0) return line('effectFrom', { ...params, caster });
  return line('effectOn', params);
}

type LineFactory = (
  key: string,
  params?: Record<string, string | number>,
  paramKeys?: Record<string, string>
) => ReplayLogLine;

function describeMoveLine(
  line: LineFactory,
  detail: Readonly<Record<string, unknown>>,
  names: ReplayNameLookup
): ReplayLogLine {
  const from = position(detail['from']);
  const to = position(detail['to']);
  const params = { fromX: from.x, fromY: from.y, toX: to.x, toY: to.y };

  if (from.place !== to.place) {
    const placeParams: Record<string, string | number> = { ...params };
    const placeKeys: Record<string, string> = {};
    assignPlace(placeParams, placeKeys, 'fromPlace', from.place, names);
    assignPlace(placeParams, placeKeys, 'toPlace', to.place, names);
    return line('movePlace', placeParams, placeKeys);
  }

  if (from.surface !== to.surface) {
    return line('moveSurface', params, {
      fromSurface: `feature.replay.surface.${from.surface}`,
      toSurface: `feature.replay.surface.${to.surface}`,
    });
  }

  if (from.z !== to.z) return line('moveHeight', { ...params, fromZ: from.z, toZ: to.z });

  return line('move', params);
}

function assignPlace(
  params: Record<string, string | number>,
  paramKeys: Record<string, string>,
  name: string,
  place: string,
  names: ReplayNameLookup
): void {
  if (place === TABLE_PLACE) {
    paramKeys[name] = 'feature.replay.place.table';
    return;
  }
  params[name] = names.targetName(place) || place;
}

function position(value: unknown): { x: number; y: number; z: number; place: string; surface: string } {
  const record = (value ?? {}) as Record<string, unknown>;
  return {
    x: Math.round(numberOf(record['x'])),
    y: Math.round(numberOf(record['y'])),
    z: Math.round(numberOf(record['z'])),
    place: text(record['name']) || TABLE_PLACE,
    surface: text(record['surface']) || DEFAULT_SURFACE,
  };
}

function pick(value: unknown, key: string): unknown {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>)[key] : undefined;
}

function numberOf(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function text(value: unknown): string {
  return value == null ? '' : String(value);
}
