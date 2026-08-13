import {
  PUBLIC_VISIBILITY,
  type ReplayEvent,
  ReplayEventKind,
  type ReplayPatch,
} from '@axe/domain/replay/replay-event';
import type { ReplayObjectSnapshot } from '@axe/domain/replay/replay-keyframe';
import { applyReplayEvents, applyReplayPatch, indexOfSeq } from '@axe/domain/replay/replay-patch';

function patchEvent(seq: number, patch: ReplayPatch, kind: ReplayEventKind = ReplayEventKind.ObjectMove): ReplayEvent {
  return {
    seq,
    at: seq * 1000,
    t: seq * 1000,
    kind,
    actorId: 'alice',
    targetId: patch.identifier,
    detail: {},
    patch,
    visibility: PUBLIC_VISIBILITY,
  };
}

describe('applyReplayPatch()', () => {
  it('入れ子の属性を経路で書き換えること', () => {
    const next = applyReplayPatch(
      { value: '', attributes: { posZ: 0, rotate: 45, owner: 'alice' } },
      {
        identifier: 'c1',
        aliasName: 'character',
        before: { 'attributes.posZ': 0 },
        after: { 'attributes.posZ': 30 },
      }
    );
    expect(next).toEqual({ value: '', attributes: { posZ: 30, rotate: 45, owner: 'alice' } });
  });

  it('後に無いキーを取り除くこと', () => {
    const next = applyReplayPatch(
      { attributes: { posZ: 0, owner: 'alice' } },
      { identifier: 'c1', aliasName: 'character', before: { 'attributes.owner': 'alice' }, after: {} }
    );
    expect(next).toEqual({ attributes: { posZ: 0 } });
  });

  it('元が無ければ後の値だけで作ること', () => {
    const next = applyReplayPatch(null, {
      identifier: 'c1',
      aliasName: 'character',
      before: {},
      after: { 'attributes.posZ': 10 },
    });
    expect(next).toEqual({ attributes: { posZ: 10 } });
  });

  it('元の値を書き換えないこと', () => {
    const source = { attributes: { location: { x: 0, y: 0 } } };
    const next = applyReplayPatch(source, {
      identifier: 'c1',
      aliasName: 'character',
      before: { 'attributes.location': { x: 0, y: 0 } },
      after: { 'attributes.location': { x: 5, y: 0 } },
    });
    expect(source.attributes.location).toEqual({ x: 0, y: 0 });
    expect((next['attributes'] as Record<string, unknown>)['location']).toEqual({ x: 5, y: 0 });
  });
});

describe('applyReplayEvents()', () => {
  const start: ReplayObjectSnapshot[] = [
    { identifier: 'c1', aliasName: 'character', syncData: { attributes: { posZ: 0, rotate: 0 } } },
    { identifier: 'c2', aliasName: 'character', syncData: { attributes: { posZ: 0 } } },
  ];

  it('順に適用して盤面を進めること', () => {
    const result = applyReplayEvents(start, [
      patchEvent(1, {
        identifier: 'c1',
        aliasName: 'character',
        before: { 'attributes.posZ': 0 },
        after: { 'attributes.posZ': 30 },
      }),
      patchEvent(2, {
        identifier: 'c1',
        aliasName: 'character',
        before: { 'attributes.rotate': 0 },
        after: { 'attributes.rotate': 90 },
      }),
    ]);
    expect(result.find((o) => o.identifier === 'c1')?.syncData).toEqual({ attributes: { posZ: 30, rotate: 90 } });
  });

  it('途中で現れたオブジェクトを足すこと', () => {
    const result = applyReplayEvents(start, [
      patchEvent(
        1,
        { identifier: 'c3', aliasName: 'card', before: {}, after: { 'attributes.state': 'front' } },
        ReplayEventKind.ObjectCreate
      ),
    ]);
    expect(result.find((o) => o.identifier === 'c3')).toEqual({
      identifier: 'c3',
      aliasName: 'card',
      syncData: { attributes: { state: 'front' } },
    });
  });

  it('片づけられたオブジェクトを外すこと', () => {
    const removal: ReplayEvent = {
      seq: 1,
      at: 1000,
      t: 1000,
      kind: ReplayEventKind.ObjectRemove,
      actorId: 'alice',
      targetId: 'c2',
      detail: {},
      visibility: PUBLIC_VISIBILITY,
    };
    const result = applyReplayEvents(start, [removal]);
    expect(result.map((o) => o.identifier)).toEqual(['c1']);
  });

  it('元の盤面を書き換えないこと', () => {
    applyReplayEvents(start, [
      patchEvent(1, {
        identifier: 'c1',
        aliasName: 'character',
        before: { 'attributes.posZ': 0 },
        after: { 'attributes.posZ': 99 },
      }),
    ]);
    expect(start[0].syncData).toEqual({ attributes: { posZ: 0, rotate: 0 } });
  });

  it('パッチの無いイベントを読み飛ばすこと', () => {
    const marker: ReplayEvent = {
      seq: 1,
      at: 1000,
      t: 1000,
      kind: ReplayEventKind.Marker,
      actorId: 'alice',
      detail: { label: '第二幕' },
      visibility: PUBLIC_VISIBILITY,
    };
    expect(applyReplayEvents(start, [marker])).toHaveLength(2);
  });
});

describe('indexOfSeq()', () => {
  const events = [1, 4, 9].map((seq) =>
    patchEvent(seq, { identifier: 'c1', aliasName: 'character', before: {}, after: {} })
  );

  it('その seq 以下で一番後ろの位置を返すこと', () => {
    expect(indexOfSeq(events, 0)).toBe(-1);
    expect(indexOfSeq(events, 1)).toBe(0);
    expect(indexOfSeq(events, 5)).toBe(1);
    expect(indexOfSeq(events, 100)).toBe(2);
  });

  it('空なら -1 を返すこと', () => {
    expect(indexOfSeq([], 5)).toBe(-1);
  });
});

describe('applyReplayEvents() の複製', () => {
  const board: ReplayObjectSnapshot[] = [
    { identifier: 'c1', aliasName: 'character', syncData: { attributes: { name: 'アリス' } } },
  ];

  it('既定では結果を書き換えても元が変わらないこと', () => {
    const applied = applyReplayEvents(board, []);
    (applied[0].syncData['attributes'] as Record<string, unknown>)['name'] = 'ボブ';

    expect((board[0].syncData['attributes'] as Record<string, unknown>)['name']).toBe('アリス');
  });

  it('読むだけと分かっているときは複製しないこと', () => {
    const applied = applyReplayEvents(board, [], { shareInput: true });

    expect(applied[0]).toBe(board[0]);
  });

  it('複製しない指定でも、当てた物は別の物になること', () => {
    const applied = applyReplayEvents(
      board,
      [
        patchEvent(1, {
          identifier: 'c1',
          aliasName: 'character',
          before: { 'attributes.name': 'アリス' },
          after: { 'attributes.name': 'ボブ' },
        }),
      ],
      { shareInput: true }
    );

    expect(applied[0]).not.toBe(board[0]);
    expect((board[0].syncData['attributes'] as Record<string, unknown>)['name']).toBe('アリス');
  });
});
