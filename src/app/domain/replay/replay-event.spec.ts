import { PeerRole } from '@axe/domain/peer/peer-role';
import {
  canViewReplayEvent,
  findActorAt,
  findTargetAt,
  GM_ONLY_VISIBILITY,
  PUBLIC_VISIBILITY,
  type ReplayActorSnapshot,
  type ReplayEvent,
  ReplayEventKind,
  type ReplayTargetSnapshot,
  type ReplayVisibility,
  resolveSnapshotAt,
} from '@axe/domain/replay/replay-event';

function makeEvent(visibility: ReplayVisibility, actorId = 'alice'): ReplayEvent {
  return {
    seq: 1,
    at: 1_000,
    t: 0,
    kind: ReplayEventKind.ChatMessage,
    actorId,
    detail: {},
    visibility,
  };
}

describe('canViewReplayEvent()', () => {
  it('公開イベントは誰でも見られること', () => {
    const event = makeEvent(PUBLIC_VISIBILITY);
    expect(canViewReplayEvent(event, { userId: 'bob', role: PeerRole.Guest })).toBe(true);
  });

  it('GM 限定イベントは GM だけが見られること', () => {
    const event = makeEvent(GM_ONLY_VISIBILITY);
    expect(canViewReplayEvent(event, { userId: 'gm', role: PeerRole.GameMaster })).toBe(true);
    expect(canViewReplayEvent(event, { userId: 'bob', role: PeerRole.Player })).toBe(false);
  });

  it('内緒話は宛先と発言者だけが見られること', () => {
    const event = makeEvent({ kind: 'direct', to: ['bob'] }, 'alice');
    expect(canViewReplayEvent(event, { userId: 'bob', role: PeerRole.Player })).toBe(true);
    expect(canViewReplayEvent(event, { userId: 'alice', role: PeerRole.Player })).toBe(true);
    expect(canViewReplayEvent(event, { userId: 'carol', role: PeerRole.Player })).toBe(false);
  });

  it('内緒話も GM は見られること', () => {
    const event = makeEvent({ kind: 'direct', to: ['bob'] }, 'alice');
    expect(canViewReplayEvent(event, { userId: 'gm', role: PeerRole.GameMaster })).toBe(true);
  });
});

describe('resolveSnapshotAt()', () => {
  const snapshots = [
    { sinceSeq: 0, label: '初期' },
    { sinceSeq: 10, label: '改名後' },
    { sinceSeq: 20, label: '再改名後' },
  ];

  it('その時点で有効な版を返すこと', () => {
    expect(resolveSnapshotAt(snapshots, 5)?.label).toBe('初期');
    expect(resolveSnapshotAt(snapshots, 10)?.label).toBe('改名後');
    expect(resolveSnapshotAt(snapshots, 19)?.label).toBe('改名後');
    expect(resolveSnapshotAt(snapshots, 999)?.label).toBe('再改名後');
  });

  it('どの版よりも前の seq では null を返すこと', () => {
    expect(resolveSnapshotAt([{ sinceSeq: 5 }], 1)).toBeNull();
  });

  it('空配列では null を返すこと', () => {
    expect(resolveSnapshotAt([], 1)).toBeNull();
  });
});

describe('findActorAt() / findTargetAt()', () => {
  const actors: ReplayActorSnapshot[] = [
    { userId: 'alice', peerId: 'p1', name: 'アリス', role: PeerRole.Player, imageIdentifier: '', sinceSeq: 0 },
    { userId: 'alice', peerId: 'p1', name: 'アリス改', role: PeerRole.Player, imageIdentifier: '', sinceSeq: 30 },
    { userId: 'bob', peerId: 'p2', name: 'ボブ', role: PeerRole.GameMaster, imageIdentifier: '', sinceSeq: 0 },
  ];
  const targets: ReplayTargetSnapshot[] = [
    { identifier: 'c1', aliasName: 'character', name: '盗賊', sinceSeq: 0 },
    { identifier: 'c1', aliasName: 'character', name: '盗賊（負傷）', sinceSeq: 50 },
  ];

  it('当時の名前で人物を引けること', () => {
    expect(findActorAt({ actors }, 'alice', 10)?.name).toBe('アリス');
    expect(findActorAt({ actors }, 'alice', 40)?.name).toBe('アリス改');
    expect(findActorAt({ actors }, 'bob', 40)?.name).toBe('ボブ');
  });

  it('当時の名前でコマを引けること', () => {
    expect(findTargetAt({ targets }, 'c1', 10)?.name).toBe('盗賊');
    expect(findTargetAt({ targets }, 'c1', 60)?.name).toBe('盗賊（負傷）');
  });

  it('未知の id では null を返すこと', () => {
    expect(findActorAt({ actors }, 'zoe', 10)).toBeNull();
    expect(findTargetAt({ targets }, 'x9', 10)).toBeNull();
  });
});
