import { canMergeReplayEvents, DEFAULT_COALESCE_WINDOWS, mergeReplayEvents } from '@axe/domain/replay/replay-coalescer';
import { PUBLIC_VISIBILITY, type ReplayEvent, ReplayEventKind } from '@axe/domain/replay/replay-event';

function moveEvent(seq: number, at: number, x: number, previousX: number, actorId = 'alice'): ReplayEvent {
  return {
    seq,
    at,
    t: at,
    kind: ReplayEventKind.ObjectMove,
    actorId,
    targetId: 'c1',
    detail: { from: { name: 'table', x: previousX, y: 0, z: 0 }, to: { name: 'table', x, y: 0, z: 0 } },
    patch: {
      identifier: 'c1',
      aliasName: 'character',
      before: { location: { name: 'table', x: previousX, y: 0 } },
      after: { location: { name: 'table', x, y: 0 } },
    },
    visibility: PUBLIC_VISIBILITY,
  };
}

describe('canMergeReplayEvents()', () => {
  it('同じ人が同じコマを続けて動かしたら畳めること', () => {
    expect(canMergeReplayEvents(moveEvent(1, 0, 10, 0), moveEvent(2, 200, 20, 10))).toBe(true);
  });

  it('間が空いたら畳まないこと', () => {
    const gap = DEFAULT_COALESCE_WINDOWS.move + 1;
    expect(canMergeReplayEvents(moveEvent(1, 0, 10, 0), moveEvent(2, gap, 20, 10))).toBe(false);
  });

  it('別の人の操作は畳まないこと', () => {
    expect(canMergeReplayEvents(moveEvent(1, 0, 10, 0), moveEvent(2, 100, 20, 10, 'bob'))).toBe(false);
  });

  it('別のコマは畳まないこと', () => {
    const next = { ...moveEvent(2, 100, 20, 10), targetId: 'c2' };
    expect(canMergeReplayEvents(moveEvent(1, 0, 10, 0), next)).toBe(false);
  });

  it('種類が違えば畳まないこと', () => {
    const next = { ...moveEvent(2, 100, 20, 10), kind: ReplayEventKind.ObjectRotate };
    expect(canMergeReplayEvents(moveEvent(1, 0, 10, 0), next)).toBe(false);
  });

  it('チャットは畳まないこと', () => {
    const chat: ReplayEvent = {
      seq: 1,
      at: 0,
      t: 0,
      kind: ReplayEventKind.ChatMessage,
      actorId: 'alice',
      targetId: 'm1',
      detail: {},
      visibility: PUBLIC_VISIBILITY,
    };
    expect(canMergeReplayEvents(chat, { ...chat, seq: 2, at: 10 })).toBe(false);
  });
});

describe('mergeReplayEvents()', () => {
  it('最初の始点と最後の終点を残すこと', () => {
    const merged = mergeReplayEvents(moveEvent(1, 0, 10, 0), moveEvent(2, 200, 90, 10));
    expect(merged.detail['from']).toEqual({ name: 'table', x: 0, y: 0, z: 0 });
    expect(merged.detail['to']).toEqual({ name: 'table', x: 90, y: 0, z: 0 });
  });

  it('最初のイベントの位置と時刻を保つこと', () => {
    const merged = mergeReplayEvents(moveEvent(1, 500, 10, 0), moveEvent(2, 700, 90, 10));
    expect(merged.seq).toBe(1);
    expect(merged.at).toBe(500);
    expect(merged.t).toBe(500);
  });

  it('パッチの before は最初、after は最後を採ること', () => {
    const merged = mergeReplayEvents(moveEvent(1, 0, 10, 0), moveEvent(2, 200, 90, 10));
    expect(merged.patch?.before).toEqual({ location: { name: 'table', x: 0, y: 0 } });
    expect(merged.patch?.after).toEqual({ location: { name: 'table', x: 90, y: 0 } });
  });

  it('通った経路を残すこと', () => {
    const first = mergeReplayEvents(moveEvent(1, 0, 100, 0), moveEvent(2, 100, 200, 100));
    const second = mergeReplayEvents(first, moveEvent(3, 200, 300, 200));

    expect(second.detail['path']).toEqual([
      { x: 100, y: 0, z: 0 },
      { x: 200, y: 0, z: 0 },
      { x: 300, y: 0, z: 0 },
    ]);
  });

  it('動きの小さい刻みで経路を膨らませないこと', () => {
    let merged = moveEvent(1, 0, 1, 0);
    for (let x = 2; x <= 10; x++) merged = mergeReplayEvents(merged, moveEvent(x, x * 10, x, x - 1));
    expect((merged.detail['path'] as unknown[]).length).toBeLessThan(3);
  });

  it('移動以外では経路を作らないこと', () => {
    const previous: ReplayEvent = {
      seq: 1,
      at: 0,
      t: 0,
      kind: ReplayEventKind.ObjectValue,
      actorId: 'alice',
      targetId: 'hp1',
      detail: { name: 'HP', current: { from: 12, to: 11 } },
      visibility: PUBLIC_VISIBILITY,
    };
    const next: ReplayEvent = { ...previous, seq: 2, at: 100, detail: { name: 'HP', current: { from: 11, to: 7 } } };
    expect(mergeReplayEvents(previous, next).detail['path']).toBeUndefined();
  });

  it('畳んだ件数を数えること', () => {
    const first = mergeReplayEvents(moveEvent(1, 0, 10, 0), moveEvent(2, 100, 20, 10));
    const second = mergeReplayEvents(first, moveEvent(3, 200, 30, 20));
    expect(first.merged).toBe(2);
    expect(second.merged).toBe(3);
  });

  it('入れ子の from/to も端点を残すこと', () => {
    const previous: ReplayEvent = {
      seq: 1,
      at: 0,
      t: 0,
      kind: ReplayEventKind.ObjectValue,
      actorId: 'alice',
      targetId: 'hp1',
      detail: { name: 'HP', current: { from: 12, to: 11 } },
      visibility: PUBLIC_VISIBILITY,
    };
    const next: ReplayEvent = { ...previous, seq: 2, at: 100, detail: { name: 'HP', current: { from: 11, to: 7 } } };
    const merged = mergeReplayEvents(previous, next);
    expect(merged.detail['current']).toEqual({ from: 12, to: 7 });
  });
});
