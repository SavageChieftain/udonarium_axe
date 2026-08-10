import { PeerRole } from '@axe/domain/peer/peer-role';
import { PUBLIC_VISIBILITY, type ReplayEvent, ReplayEventKind } from '@axe/domain/replay/replay-event';
import {
  collectReplayActorIds,
  DEFAULT_REPLAY_LOG_FILTER,
  filterReplayEvents,
  ReplayLogScope,
} from '@axe/features/replay/replay-log-filter';

const viewer = { userId: 'alice', role: PeerRole.Player };
const gm = { userId: 'gm', role: PeerRole.GameMaster };

function event(seq: number, kind: ReplayEventKind, overrides: Partial<ReplayEvent> = {}): ReplayEvent {
  return {
    seq,
    at: seq * 1000,
    t: seq * 1000,
    kind,
    actorId: 'alice',
    detail: {},
    visibility: PUBLIC_VISIBILITY,
    ...overrides,
  };
}

const events: ReplayEvent[] = [
  event(1, ReplayEventKind.ChatMessage),
  event(2, ReplayEventKind.ObjectMove),
  event(3, ReplayEventKind.ChatDice, { actorId: 'bob' }),
  event(4, ReplayEventKind.Marker),
  event(5, ReplayEventKind.ChatMessage, { visibility: { kind: 'gm-only' } }),
];

describe('filterReplayEvents()', () => {
  it('既定では見える物をすべて返すこと', () => {
    const filtered = filterReplayEvents(events, DEFAULT_REPLAY_LOG_FILTER, viewer);
    expect(filtered.map((e) => e.seq)).toEqual([1, 2, 3, 4]);
  });

  it('GM には秘匿のイベントも返すこと', () => {
    const filtered = filterReplayEvents(events, DEFAULT_REPLAY_LOG_FILTER, gm);
    expect(filtered.map((e) => e.seq)).toEqual([1, 2, 3, 4, 5]);
  });

  it('チャットに絞れること', () => {
    const filtered = filterReplayEvents(events, { ...DEFAULT_REPLAY_LOG_FILTER, scope: ReplayLogScope.Chat }, viewer);
    expect(filtered.map((e) => e.seq)).toEqual([1, 3, 4]);
  });

  it('盤面に絞れること', () => {
    const filtered = filterReplayEvents(events, { ...DEFAULT_REPLAY_LOG_FILTER, scope: ReplayLogScope.Board }, viewer);
    expect(filtered.map((e) => e.seq)).toEqual([2, 4]);
  });

  it('目印はどの絞り込みでも残すこと', () => {
    for (const scope of [ReplayLogScope.All, ReplayLogScope.Chat, ReplayLogScope.Board]) {
      const filtered = filterReplayEvents(events, { ...DEFAULT_REPLAY_LOG_FILTER, scope }, viewer);
      expect(filtered.some((e) => e.kind === ReplayEventKind.Marker)).toBe(true);
    }
  });

  it('人で絞れること', () => {
    const filtered = filterReplayEvents(events, { ...DEFAULT_REPLAY_LOG_FILTER, actorId: 'bob' }, viewer);
    expect(filtered.map((e) => e.seq)).toEqual([3]);
  });

  it('秘匿を隠せること', () => {
    const filtered = filterReplayEvents(events, { ...DEFAULT_REPLAY_LOG_FILTER, hideSecret: true }, gm);
    expect(filtered.map((e) => e.seq)).toEqual([1, 2, 3, 4]);
  });
});

describe('collectReplayActorIds()', () => {
  it('登場した人を重複なく集めること', () => {
    expect(collectReplayActorIds(events)).toEqual(['alice', 'bob']);
  });

  it('空なら空を返すこと', () => {
    expect(collectReplayActorIds([])).toEqual([]);
  });
});

describe('付随する音', () => {
  const withSe = [
    event(1, ReplayEventKind.ChatMessage),
    event(2, ReplayEventKind.ObjectMove),
    event(3, ReplayEventKind.MediaSoundEffect),
  ];

  it('既定では行として出さないこと', () => {
    expect(filterReplayEvents(withSe, DEFAULT_REPLAY_LOG_FILTER, viewer).map((e) => e.seq)).toEqual([1, 2]);
  });

  it('盤面だけに絞っても出さないこと', () => {
    const filter = { ...DEFAULT_REPLAY_LOG_FILTER, scope: ReplayLogScope.Board };
    expect(filterReplayEvents(withSe, filter, viewer).map((e) => e.seq)).toEqual([2]);
  });

  it('求められたときは出すこと', () => {
    const filter = { ...DEFAULT_REPLAY_LOG_FILTER, showIncidental: true };
    expect(filterReplayEvents(withSe, filter, viewer).map((e) => e.seq)).toEqual([1, 2, 3]);
  });
});
