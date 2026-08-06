import {
  hasReplayEdits,
  isTextEditable,
  moveReplayEvent,
  removeReplayEvent,
  resequenceReplayEvents,
  retextReplayEvent,
  textOf,
} from '@axe/domain/replay/replay-edit';
import { PUBLIC_VISIBILITY, type ReplayEvent, ReplayEventKind } from '@axe/domain/replay/replay-event';

function event(seq: number, kind: ReplayEventKind = ReplayEventKind.ChatMessage, at = seq * 1000): ReplayEvent {
  return {
    seq,
    at,
    t: at,
    kind,
    actorId: 'alice',
    detail: kind === ReplayEventKind.Marker ? { label: `章 ${seq}` } : { text: `発言 ${seq}` },
    visibility: PUBLIC_VISIBILITY,
  };
}

const events = [event(1), event(2), event(3)];

describe('isTextEditable() / textOf()', () => {
  it('発言と目印は書き直せること', () => {
    expect(isTextEditable(event(1))).toBe(true);
    expect(isTextEditable(event(1, ReplayEventKind.Marker))).toBe(true);
  });

  it('盤面の操作は書き直せないこと', () => {
    expect(isTextEditable(event(1, ReplayEventKind.ObjectMove))).toBe(false);
  });

  it('種類ごとの置き場所から本文を取ること', () => {
    expect(textOf(event(1))).toBe('発言 1');
    expect(textOf(event(1, ReplayEventKind.Marker))).toBe('章 1');
  });
});

describe('removeReplayEvent()', () => {
  it('指定した 1 件だけ落とすこと', () => {
    expect(removeReplayEvent(events, 2).map((e) => e.seq)).toEqual([1, 3]);
  });

  it('元の配列を変えないこと', () => {
    removeReplayEvent(events, 2);
    expect(events.map((e) => e.seq)).toEqual([1, 2, 3]);
  });

  it('無い seq では何も落とさないこと', () => {
    expect(removeReplayEvent(events, 9).map((e) => e.seq)).toEqual([1, 2, 3]);
  });
});

describe('moveReplayEvent()', () => {
  it('前後に動かせること', () => {
    expect(moveReplayEvent(events, 2, -1).map((e) => e.seq)).toEqual([2, 1, 3]);
    expect(moveReplayEvent(events, 2, 1).map((e) => e.seq)).toEqual([1, 3, 2]);
  });

  it('端から外へは出さないこと', () => {
    expect(moveReplayEvent(events, 1, -1).map((e) => e.seq)).toEqual([1, 2, 3]);
    expect(moveReplayEvent(events, 3, 1).map((e) => e.seq)).toEqual([1, 2, 3]);
  });

  it('無い seq では並びを変えないこと', () => {
    expect(moveReplayEvent(events, 9, 1).map((e) => e.seq)).toEqual([1, 2, 3]);
  });
});

describe('retextReplayEvent()', () => {
  it('発言を書き直せること', () => {
    const edited = retextReplayEvent(events, 2, 'あらためて');
    expect(textOf(edited[1])).toBe('あらためて');
    expect(textOf(edited[0])).toBe('発言 1');
  });

  it('目印の見出しを書き直せること', () => {
    const marked = [event(1, ReplayEventKind.Marker)];
    expect(textOf(retextReplayEvent(marked, 1, '第二幕')[0])).toBe('第二幕');
  });

  it('書き直せない種類には触れないこと', () => {
    const moves = [event(1, ReplayEventKind.ObjectMove)];
    expect(retextReplayEvent(moves, 1, 'むり')[0]).toBe(moves[0]);
  });

  it('元のイベントを書き換えないこと', () => {
    retextReplayEvent(events, 2, 'あらためて');
    expect(textOf(events[1])).toBe('発言 2');
  });
});

describe('resequenceReplayEvents()', () => {
  it('並べ替えたあとに番号を振り直すこと', () => {
    const reordered = moveReplayEvent(events, 3, -2);
    expect(resequenceReplayEvents(reordered).map((e) => e.seq)).toEqual([1, 2, 3]);
  });

  it('先頭を起点に経過を測り直すこと', () => {
    const trimmed = removeReplayEvent(events, 1);
    const resequenced = resequenceReplayEvents(trimmed);
    expect(resequenced.map((e) => e.t)).toEqual([0, 1000]);
  });

  it('もとの時刻は残すこと', () => {
    const resequenced = resequenceReplayEvents(removeReplayEvent(events, 1));
    expect(resequenced.map((e) => e.at)).toEqual([2000, 3000]);
  });

  it('空でも落ちないこと', () => {
    expect(resequenceReplayEvents([])).toEqual([]);
  });
});

describe('hasReplayEdits()', () => {
  it('手を入れていなければ false を返すこと', () => {
    expect(hasReplayEdits(events, [...events])).toBe(false);
  });

  it('消したら true を返すこと', () => {
    expect(hasReplayEdits(events, removeReplayEvent(events, 2))).toBe(true);
  });

  it('並べ替えたら true を返すこと', () => {
    expect(hasReplayEdits(events, moveReplayEvent(events, 1, 1))).toBe(true);
  });

  it('書き直したら true を返すこと', () => {
    expect(hasReplayEdits(events, retextReplayEvent(events, 2, '別の台詞'))).toBe(true);
  });
});
