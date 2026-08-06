import { type ReplayEvent, ReplayEventKind } from '@axe/domain/replay/replay-event';

const TEXTABLE_KINDS: ReadonlySet<ReplayEventKind> = new Set([
  ReplayEventKind.ChatMessage,
  ReplayEventKind.ChatDice,
  ReplayEventKind.Marker,
]);

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
