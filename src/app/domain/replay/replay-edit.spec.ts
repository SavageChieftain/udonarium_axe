import {
  chatTabIdentifierNear,
  createReplayEntry,
  hasReplayEdits,
  insertReplayEvent,
  insertReplayEvents,
  insertTimeAt,
  isInsertableKind,
  isTextEditable,
  moveReplayEvent,
  nextInsertSeq,
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

describe('createReplayEntry()', () => {
  it('差し込む発言を組み立てること', () => {
    const entry = createReplayEntry(
      { kind: ReplayEventKind.ChatMessage, actorId: 'alice', speaker: '盗賊', text: 'やあ', tabIdentifier: 'tab1' },
      9,
      5000
    );
    expect(entry).toMatchObject({ seq: 9, at: 5000, kind: ReplayEventKind.ChatMessage, actorId: 'alice' });
    expect(entry.detail).toEqual({
      text: 'やあ',
      name: '盗賊',
      from: 'alice',
      to: '',
      tag: '',
      dicebot: '',
      timestamp: 5000,
      tabIdentifier: 'tab1',
    });
  });

  it('目印は見出しとして組み立てること', () => {
    const entry = createReplayEntry(
      { kind: ReplayEventKind.Marker, actorId: 'gm', speaker: '', text: '第二幕', tabIdentifier: 'tab1' },
      1,
      0
    );
    expect(entry.detail).toEqual({ label: '第二幕' });
  });

  it('発言に実体を作るパッチを添えること', () => {
    const entry = createReplayEntry(
      { kind: ReplayEventKind.ChatMessage, actorId: 'alice', speaker: '盗賊', text: 'やあ', tabIdentifier: 'tab1' },
      9,
      5000
    );
    expect(entry.patch?.aliasName).toBe('chat');
    expect(entry.patch?.identifier).toBe(entry.targetId);
    expect(entry.patch?.after).toMatchObject({
      value: 'やあ',
      parentIdentifier: 'tab1',
      'attributes.from': 'alice',
      'attributes.name': '盗賊',
      'attributes.timestamp': 5000,
    });
  });

  it('ダイスの行はダイスボットの発言として作ること', () => {
    const entry = createReplayEntry(
      { kind: ReplayEventKind.ChatDice, actorId: 'alice', speaker: '', text: '(1d100) ＞ 42', tabIdentifier: 'tab1' },
      9,
      5000
    );
    expect(entry.detail['from']).toBe('System-BCDice');
    expect(entry.patch?.after['attributes.from']).toBe('System-BCDice');
    expect(entry.patch?.after['attributes.tag']).toBe('system');
  });

  it('目印には実体を作らないこと', () => {
    const entry = createReplayEntry(
      { kind: ReplayEventKind.Marker, actorId: 'gm', speaker: '', text: '第二幕', tabIdentifier: 'tab1' },
      1,
      0
    );
    expect(entry.patch).toBeUndefined();
  });

  it('差し込むたびに別の識別子を振ること', () => {
    const draft = { kind: ReplayEventKind.ChatMessage, actorId: 'a', speaker: '', text: 'x', tabIdentifier: 't' };
    expect(createReplayEntry(draft, 1, 0).targetId).not.toBe(createReplayEntry(draft, 2, 0).targetId);
  });

  it('差し込んだ行も書き直せる種類であること', () => {
    for (const kind of [ReplayEventKind.ChatMessage, ReplayEventKind.ChatDice, ReplayEventKind.Marker]) {
      expect(isInsertableKind(kind)).toBe(true);
    }
    expect(isInsertableKind(ReplayEventKind.ObjectMove)).toBe(false);
  });
});

describe('chatTabIdentifierNear()', () => {
  const withTabs: ReplayEvent[] = [
    { ...event(1), detail: { text: '一', tabIdentifier: 'tab-a' } },
    { ...event(2), kind: ReplayEventKind.ObjectMove, detail: {} },
    { ...event(3), detail: { text: '三', tabIdentifier: 'tab-b' } },
  ];

  it('手前で一番近いタブを使うこと', () => {
    expect(chatTabIdentifierNear(withTabs, 2)).toBe('tab-a');
    expect(chatTabIdentifierNear(withTabs, 3)).toBe('tab-b');
  });

  it('手前に無ければ後ろを見ること', () => {
    expect(chatTabIdentifierNear(withTabs, 0)).toBe('tab-a');
  });

  it('どこにも無ければ空を返すこと', () => {
    expect(chatTabIdentifierNear([event(1)], 0)).toBe('');
  });
});

describe('insertReplayEvent()', () => {
  it('指定した位置に差し込むこと', () => {
    const entry = event(9);
    expect(insertReplayEvent(events, 1, entry).map((e) => e.seq)).toEqual([1, 9, 2, 3]);
  });

  it('先頭と末尾にも差し込めること', () => {
    expect(insertReplayEvent(events, 0, event(9)).map((e) => e.seq)).toEqual([9, 1, 2, 3]);
    expect(insertReplayEvent(events, 3, event(9)).map((e) => e.seq)).toEqual([1, 2, 3, 9]);
  });

  it('範囲の外を丸めること', () => {
    expect(insertReplayEvent(events, -5, event(9))[0].seq).toBe(9);
    expect(insertReplayEvent(events, 99, event(9))[3].seq).toBe(9);
  });

  it('元の配列を変えないこと', () => {
    insertReplayEvent(events, 1, event(9));
    expect(events.map((e) => e.seq)).toEqual([1, 2, 3]);
  });
});

describe('insertReplayEvents()', () => {
  it('まとめて差し込み、番号を続けて振ること', () => {
    const block = [event(90), event(91)];
    const merged = insertReplayEvents(events, 1, block);
    expect(merged.map((e) => e.seq)).toEqual([1, 4, 5, 2, 3]);
  });

  it('前後の時刻の間に等間隔で並べること', () => {
    const merged = insertReplayEvents(events, 1, [event(90), event(91)]);
    expect(merged[1].at).toBe(1333);
    expect(merged[2].at).toBe(1667);
  });

  it('末尾に足すときも時刻を進めること', () => {
    const merged = insertReplayEvents(events, 3, [event(90)]);
    expect(merged[3].at).toBeGreaterThanOrEqual(3000);
  });

  it('空なら何もしないこと', () => {
    expect(insertReplayEvents(events, 1, []).map((e) => e.seq)).toEqual([1, 2, 3]);
  });

  it('元の配列を変えないこと', () => {
    insertReplayEvents(events, 1, [event(90)]);
    expect(events).toHaveLength(3);
  });
});

describe('nextInsertSeq() / insertTimeAt()', () => {
  it('使われていない番号を返すこと', () => {
    expect(nextInsertSeq(events)).toBe(4);
    expect(nextInsertSeq([])).toBe(1);
  });

  it('前後の時刻の間に置くこと', () => {
    expect(insertTimeAt(events, 1)).toBe(1500);
  });

  it('端では隣の時刻を使うこと', () => {
    expect(insertTimeAt(events, 0)).toBe(1000);
    expect(insertTimeAt(events, 3)).toBe(3000);
  });

  it('空なら 0 を返すこと', () => {
    expect(insertTimeAt([], 0)).toBe(0);
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
