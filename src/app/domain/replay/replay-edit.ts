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
}

export function isInsertableKind(kind: ReplayEventKind): boolean {
  return INSERTABLE_KINDS.includes(kind);
}

export function createReplayEntry(draft: ReplayEntryDraft, seq: number, at: number): ReplayEvent {
  const detail =
    draft.kind === ReplayEventKind.Marker
      ? { label: draft.text }
      : { text: draft.text, name: draft.speaker, from: draft.actorId, to: '', tag: '' };

  return {
    seq,
    at,
    t: 0,
    kind: draft.kind,
    actorId: draft.actorId,
    detail,
    visibility: PUBLIC_VISIBILITY,
  };
}

export function insertReplayEvent(events: readonly ReplayEvent[], atIndex: number, event: ReplayEvent): ReplayEvent[] {
  const next = [...events];
  next.splice(Math.max(0, Math.min(next.length, atIndex)), 0, event);
  return next;
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
  return events.filter((event) => event.seq !== seq);
}

export function moveReplayEvent(events: readonly ReplayEvent[], seq: number, offset: number): ReplayEvent[] {
  const index = events.findIndex((event) => event.seq === seq);
  if (index < 0) return [...events];

  const target = index + offset;
  if (target < 0 || target >= events.length) return [...events];

  const next = [...events];
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved);
  return next;
}

export function retextReplayEvent(events: readonly ReplayEvent[], seq: number, text: string): ReplayEvent[] {
  return events.map((event) => {
    if (event.seq !== seq || !isTextEditable(event)) return event;
    const key = event.kind === ReplayEventKind.Marker ? 'label' : 'text';
    return { ...event, detail: { ...event.detail, [key]: text } };
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
