import { generateUuid } from '@axe/core/util/uuid';
import { PUBLIC_VISIBILITY, type ReplayEvent, ReplayEventKind } from '@axe/domain/replay/replay-event';

export const INSERTABLE_KINDS: readonly ReplayEventKind[] = [
  ReplayEventKind.ChatMessage,
  ReplayEventKind.ChatDice,
  ReplayEventKind.Marker,
];

const TEXTABLE_KINDS: ReadonlySet<ReplayEventKind> = new Set(INSERTABLE_KINDS);

export interface ReplayEntryDraft {
  kind: ReplayEventKind;
  actorId: string;
  speaker: string;
  text: string;
  tabIdentifier: string;
  imageIdentifier?: string;
  chatColor?: string;
}

export const DICEBOT_SENDER = 'System-BCDice';

export function chatTabIdentifierNear(events: readonly ReplayEvent[], atIndex: number): string {
  for (let index = Math.min(atIndex, events.length) - 1; index >= 0; index--) {
    const tab = String(events[index].detail['tabIdentifier'] ?? '');
    if (tab.length > 0) return tab;
  }
  for (let index = Math.max(0, atIndex); index < events.length; index++) {
    const tab = String(events[index].detail['tabIdentifier'] ?? '');
    if (tab.length > 0) return tab;
  }
  return '';
}

export function isInsertableKind(kind: ReplayEventKind): boolean {
  return INSERTABLE_KINDS.includes(kind);
}

export function createReplayEntry(draft: ReplayEntryDraft, seq: number, at: number): ReplayEvent {
  if (draft.kind === ReplayEventKind.Marker) {
    return {
      seq,
      at,
      t: 0,
      kind: draft.kind,
      actorId: draft.actorId,
      detail: { label: draft.text },
      visibility: PUBLIC_VISIBILITY,
    };
  }

  const isDice = draft.kind === ReplayEventKind.ChatDice;
  const from = isDice ? DICEBOT_SENDER : draft.actorId;
  const tag = isDice ? 'system' : '';
  const identifier = generateUuid();
  const imageIdentifier = isDice ? '' : (draft.imageIdentifier ?? '');
  const chatColor = isDice ? '' : (draft.chatColor ?? '');

  return {
    seq,
    at,
    t: 0,
    kind: draft.kind,
    actorId: draft.actorId,
    targetId: identifier,
    detail: {
      text: draft.text,
      name: draft.speaker,
      from,
      to: '',
      tag,
      dicebot: '',
      timestamp: at,
      tabIdentifier: draft.tabIdentifier,
      imageIdentifier,
      messColor: chatColor,
    },
    patch: {
      identifier,
      aliasName: 'chat',
      before: {},
      after: {
        value: draft.text,
        parentIdentifier: draft.tabIdentifier,
        majorIndex: 0,
        minorIndex: 0,
        'attributes.from': from,
        'attributes.to': '',
        'attributes.name': draft.speaker,
        'attributes.tag': tag,
        'attributes.dicebot': '',
        'attributes.timestamp': at,
        'attributes.imageIdentifier': imageIdentifier,
        'attributes.messColor': chatColor,
        'attributes.originFrom': draft.actorId,
      },
    },
    visibility: PUBLIC_VISIBILITY,
  };
}

export function restampReplayTimes(events: readonly ReplayEvent[]): ReplayEvent[] {
  const origin = events[0]?.at ?? 0;
  return events.map((event) => ({ ...event, t: Math.max(0, event.at - origin) }));
}

export function insertReplayEvent(events: readonly ReplayEvent[], atIndex: number, event: ReplayEvent): ReplayEvent[] {
  const next = [...events];
  next.splice(Math.max(0, Math.min(next.length, atIndex)), 0, event);
  return restampReplayTimes(next);
}

export function insertReplayEvents(
  events: readonly ReplayEvent[],
  atIndex: number,
  entries: readonly ReplayEvent[]
): ReplayEvent[] {
  if (entries.length < 1) return [...events];

  const index = Math.max(0, Math.min(events.length, atIndex));
  const seqBase = nextInsertSeq(events);
  const times = spreadInsertTimes(events, index, entries.length);
  const placed = entries.map((entry, offset) => ({ ...entry, seq: seqBase + offset, at: times[offset] }));

  const next = [...events];
  next.splice(index, 0, ...placed);
  return restampReplayTimes(next);
}

export function spreadInsertTimes(events: readonly ReplayEvent[], atIndex: number, count: number): number[] {
  const before = events[atIndex - 1]?.at;
  const after = events[atIndex]?.at;
  const start = before ?? after ?? 0;
  const end = after ?? (before ?? 0) + count;
  const span = Math.max(0, end - start);
  const step = span > 0 ? span / (count + 1) : 1;
  return Array.from({ length: count }, (_, offset) => Math.round(start + step * (offset + 1)));
}

export function nextInsertSeq(events: readonly ReplayEvent[]): number {
  return events.reduce((highest, event) => Math.max(highest, event.seq), 0) + 1;
}

export function insertTimeAt(events: readonly ReplayEvent[], atIndex: number): number {
  if (events.length < 1) return 0;
  const before = events[atIndex - 1];
  const after = events[atIndex];
  if (before && after) return Math.round((before.at + after.at) / 2);
  return before ? before.at : after.at;
}

export function isTextEditable(event: ReplayEvent): boolean {
  return TEXTABLE_KINDS.has(event.kind);
}

export function textOf(event: ReplayEvent): string {
  const key = event.kind === ReplayEventKind.Marker ? 'label' : 'text';
  return String(event.detail[key] ?? '');
}

export function removeReplayEvent(events: readonly ReplayEvent[], seq: number): ReplayEvent[] {
  return restampReplayTimes(events.filter((event) => event.seq !== seq));
}

export function moveReplayEvent(events: readonly ReplayEvent[], seq: number, offset: number): ReplayEvent[] {
  const index = events.findIndex((event) => event.seq === seq);
  if (index < 0) return [...events];

  const target = index + offset;
  if (offset === 0 || target < 0 || target >= events.length) return [...events];

  const next = [...events];
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, { ...moved, at: insertTimeAt(next, target) });
  return restampReplayTimes(next);
}

export function retextReplayEvent(events: readonly ReplayEvent[], seq: number, text: string): ReplayEvent[] {
  return events.map((event) => {
    if (event.seq !== seq || !isTextEditable(event)) return event;
    if (event.kind === ReplayEventKind.Marker) {
      return { ...event, detail: { ...event.detail, label: text } };
    }
    return {
      ...event,
      detail: { ...event.detail, text },
      patch: event.patch ? { ...event.patch, after: { ...event.patch.after, value: text } } : undefined,
    };
  });
}

export function resequenceReplayEvents(events: readonly ReplayEvent[]): ReplayEvent[] {
  const origin = events[0]?.at ?? 0;
  return events.map((event, index) => ({ ...event, seq: index + 1, t: Math.max(0, event.at - origin) }));
}

export function hasReplayEdits(original: readonly ReplayEvent[], edited: readonly ReplayEvent[]): boolean {
  if (original.length !== edited.length) return true;
  return original.some((event, index) => {
    const other = edited[index];
    return event.seq !== other.seq || textOf(event) !== textOf(other);
  });
}
