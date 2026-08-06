import { PUBLIC_VISIBILITY, type ReplayEvent, ReplayEventKind } from '@axe/domain/replay/replay-event';
import {
  formatReplayElapsed,
  formatReplayTime,
  type ReplayNameLookup,
  toReplayLogLine,
} from '@axe/features/replay/replay-log-line';

const names: ReplayNameLookup = {
  actorName: (userId) => ({ alice: 'アリス', bob: 'ボブ' })[userId] ?? userId,
  targetName: (identifier) => ({ c1: '盗賊', d1: 'ダイス' })[identifier] ?? identifier,
};

function event(
  kind: ReplayEventKind,
  detail: Record<string, unknown>,
  overrides: Partial<ReplayEvent> = {}
): ReplayEvent {
  return {
    seq: 1,
    at: 0,
    t: 0,
    kind,
    actorId: 'alice',
    targetId: 'c1',
    detail,
    visibility: PUBLIC_VISIBILITY,
    ...overrides,
  };
}

describe('formatReplayTime()', () => {
  it('時刻を時分秒で表すこと', () => {
    const at = new Date(2026, 0, 1, 9, 5, 3).getTime();
    expect(formatReplayTime(at)).toBe('09:05:03');
  });
});

describe('formatReplayElapsed()', () => {
  it('経過を時分秒で表すこと', () => {
    expect(formatReplayElapsed(0)).toBe('00:00:00');
    expect(formatReplayElapsed(65_000)).toBe('00:01:05');
    expect(formatReplayElapsed(3_725_000)).toBe('01:02:05');
  });

  it('負の値でも 0 として扱うこと', () => {
    expect(formatReplayElapsed(-5)).toBe('00:00:00');
  });
});

describe('toReplayLogLine()', () => {
  it('移動を行き先つきで表すこと', () => {
    const line = toReplayLogLine(
      event(ReplayEventKind.ObjectMove, { to: { name: 'table', x: 100.4, y: 49.6, z: 0 } }),
      names
    );
    expect(line.key).toBe('feature.replay.line.move');
    expect(line.params).toEqual({ actor: 'アリス', target: '盗賊', x: 100, y: 50 });
    expect(line.icon).toBe('open_with');
  });

  it('発言を話者と本文で表すこと', () => {
    const line = toReplayLogLine(event(ReplayEventKind.ChatMessage, { name: '盗賊', text: 'こんばんは' }), names);
    expect(line.key).toBe('feature.replay.line.chat');
    expect(line.params['speaker']).toBe('盗賊');
    expect(line.params['text']).toBe('こんばんは');
  });

  it('話者の無い発言では人の名前を使うこと', () => {
    const line = toReplayLogLine(event(ReplayEventKind.ChatMessage, { name: '', text: 'やあ' }), names);
    expect(line.params['speaker']).toBe('アリス');
  });

  it('リソースの増減を前後の値で表すこと', () => {
    const line = toReplayLogLine(
      event(ReplayEventKind.ObjectValue, { name: 'HP', current: { from: 12, to: 7 } }),
      names
    );
    expect(line.key).toBe('feature.replay.line.value');
    expect(line.params).toEqual({ actor: 'アリス', target: '盗賊', name: 'HP', from: '12', to: '7' });
  });

  it('回転を角度で表すこと', () => {
    const line = toReplayLogLine(event(ReplayEventKind.ObjectRotate, { rotate: { from: 0, to: 90.2 } }), names);
    expect(line.params['angle']).toBe(90);
  });

  it('固定と解除を別の行として表すこと', () => {
    expect(toReplayLogLine(event(ReplayEventKind.ObjectLock, { locked: true }), names).key).toBe(
      'feature.replay.line.lock'
    );
    expect(toReplayLogLine(event(ReplayEventKind.ObjectLock, { locked: false }), names).key).toBe(
      'feature.replay.line.unlock'
    );
  });

  it('持ち主の変更を相手の名前で表すこと', () => {
    const line = toReplayLogLine(event(ReplayEventKind.ObjectOwner, { from: '', to: 'bob' }), names);
    expect(line.params['owner']).toBe('ボブ');
  });

  it('目印を見出しとして表すこと', () => {
    const line = toReplayLogLine(event(ReplayEventKind.Marker, { label: '第二幕' }, { targetId: undefined }), names);
    expect(line.key).toBe('feature.replay.line.marker');
    expect(line.params['label']).toBe('第二幕');
  });

  it('秘匿のイベントに印を付けること', () => {
    const line = toReplayLogLine(
      event(ReplayEventKind.ChatMessage, { text: 'ないしょ' }, { visibility: { kind: 'direct', to: ['bob'] } }),
      names
    );
    expect(line.isSecret).toBe(true);
  });

  it('未知の種類でも落ちないこと', () => {
    const line = toReplayLogLine(event('object.unknown' as ReplayEventKind, {}), names);
    expect(line.key).toBe('feature.replay.line.update');
    expect(line.icon).toBe('radio_button_unchecked');
  });
});
