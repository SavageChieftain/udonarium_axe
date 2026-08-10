import {
  canViewReplayEvent,
  isIncidentalReplayEvent,
  type ReplayEvent,
  ReplayEventKind,
  type ReplayViewer,
} from '@axe/domain/replay/replay-event';

export const ReplayLogScope = {
  All: 'all',
  Chat: 'chat',
  Board: 'board',
} as const;

export type ReplayLogScope = (typeof ReplayLogScope)[keyof typeof ReplayLogScope];

export interface ReplayLogFilter {
  scope: ReplayLogScope;
  actorId: string;
  hideSecret: boolean;
  showIncidental: boolean;
}

export const DEFAULT_REPLAY_LOG_FILTER: ReplayLogFilter = {
  scope: ReplayLogScope.All,
  actorId: '',
  hideSecret: false,
  showIncidental: false,
};

const CHAT_KINDS: ReadonlySet<ReplayEventKind> = new Set([ReplayEventKind.ChatMessage, ReplayEventKind.ChatDice]);

const ALWAYS_SHOWN: ReadonlySet<ReplayEventKind> = new Set([ReplayEventKind.Marker]);

export function matchesReplayLogFilter(event: ReplayEvent, filter: ReplayLogFilter, viewer: ReplayViewer): boolean {
  if (!canViewReplayEvent(event, viewer)) return false;
  if (filter.hideSecret && event.visibility.kind !== 'public') return false;
  if (filter.actorId.length > 0 && event.actorId !== filter.actorId) return false;
  if (!filter.showIncidental && isIncidentalReplayEvent(event.kind)) return false;
  if (ALWAYS_SHOWN.has(event.kind)) return true;
  if (filter.scope === ReplayLogScope.Chat) return CHAT_KINDS.has(event.kind);
  if (filter.scope === ReplayLogScope.Board) return !CHAT_KINDS.has(event.kind);
  return true;
}

export function filterReplayEvents(
  events: readonly ReplayEvent[],
  filter: ReplayLogFilter,
  viewer: ReplayViewer
): ReplayEvent[] {
  return events.filter((event) => matchesReplayLogFilter(event, filter, viewer));
}

export function collectReplayActorIds(events: readonly ReplayEvent[]): string[] {
  const seen = new Set<string>();
  for (const event of events) seen.add(event.actorId);
  return [...seen];
}
