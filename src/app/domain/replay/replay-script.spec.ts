import type { ReplayCastMember } from '@axe/domain/replay/replay-cast';
import { PUBLIC_VISIBILITY, type ReplayEvent, ReplayEventKind } from '@axe/domain/replay/replay-event';
import {
  buildReplayScriptLines,
  buildReplayScriptMarkdown,
  DEFAULT_REPLAY_SCRIPT_OPTIONS,
  replayScriptElapsed,
  ReplayScriptFormat,
} from '@axe/domain/replay/replay-script';
import {
  buildReplayStoryboard,
  EMPTY_REPLAY_STORYBOARD,
  REPLAY_SHOT_MAX_CHARS,
} from '@axe/domain/replay/replay-storyboard';

function say(seq: number, text: string, name = 'アリス'): ReplayEvent {
  return {
    seq,
    at: seq * 1000,
    t: seq * 1000,
    kind: ReplayEventKind.ChatMessage,
    actorId: 'alice',
    detail: { text, name },
    visibility: PUBLIC_VISIBILITY,
  };
}

function marker(seq: number, label: string): ReplayEvent {
  return { ...say(seq, ''), kind: ReplayEventKind.Marker, detail: { label } };
}

const cast: ReplayCastMember[] = [
  { identifier: 'c1', name: 'アリス', imageIdentifier: 'img-alice', chatColor: '#112233' },
];

function storyboardOf(events: readonly ReplayEvent[]) {
  return buildReplayStoryboard(events, cast);
}

describe('buildReplayScriptLines()', () => {
  it('発言を 1 行ずつ並べること', () => {
    const lines = buildReplayScriptLines(storyboardOf([say(1, 'やあ'), say(2, 'こんばんは', 'ボブ')]));

    expect(lines.map((line) => [line.speaker, line.text])).toEqual([
      ['アリス', 'やあ'],
      ['ボブ', 'こんばんは'],
    ]);
  });

  it('動画のために割られた長い発言を 1 つに戻すこと', () => {
    const long = 'あ'.repeat(REPLAY_SHOT_MAX_CHARS * 2 + 10);
    const lines = buildReplayScriptLines(storyboardOf([say(1, long)]));

    // 読み物では、読める長さに割った切れ目が邪魔になる。
    expect(lines).toHaveLength(1);
    expect(lines[0].text).toBe(long);
  });

  it('同じ人が続けて喋った別の発言は分けたままにすること', () => {
    const lines = buildReplayScriptLines(storyboardOf([say(1, '一言目'), say(2, '二言目')]));

    expect(lines.map((line) => line.text)).toEqual(['一言目', '二言目']);
  });

  it('章の見出しそのものは行にしないこと', () => {
    const lines = buildReplayScriptLines(storyboardOf([say(1, 'やあ'), marker(2, '第二幕'), say(3, 'ここから')]));

    expect(lines.map((line) => line.text)).toEqual(['やあ', 'ここから']);
    expect(lines.map((line) => line.chapter)).toEqual(['', '第二幕']);
  });

  it('名前の無い発言を地の文として扱うこと', () => {
    const lines = buildReplayScriptLines(storyboardOf([say(1, 'しんと静まり返った', '')]));

    expect(lines[0].isNarration).toBe(true);
  });

  it('何も無ければ空にすること', () => {
    expect(buildReplayScriptLines(EMPTY_REPLAY_STORYBOARD)).toEqual([]);
  });
});

describe('buildReplayScriptMarkdown()', () => {
  const events = [say(1, 'やあ'), marker(2, '第二幕'), say(3, 'ここから'), say(4, '風が吹いた', '')];

  it('小説として組むこと', () => {
    const text = buildReplayScriptMarkdown(storyboardOf(events), {
      ...DEFAULT_REPLAY_SCRIPT_OPTIONS,
      title: '第一夜',
    });

    expect(text).toContain('# 第一夜');
    expect(text).toContain('## 第二幕');
    expect(text).toContain('アリス「やあ」');
    // 地の文は鉤括弧を付けない。
    expect(text).toContain('\n風が吹いた');
    expect(text).not.toContain('「風が吹いた」');
  });

  it('台本として組むこと', () => {
    const text = buildReplayScriptMarkdown(storyboardOf(events), {
      ...DEFAULT_REPLAY_SCRIPT_OPTIONS,
      format: ReplayScriptFormat.Script,
    });

    expect(text).toContain('**アリス**');
    expect(text).not.toContain('「やあ」');
  });

  it('表題を付けなければ見出しを置かないこと', () => {
    expect(buildReplayScriptMarkdown(storyboardOf(events)).startsWith('#\n')).toBe(false);
    expect(buildReplayScriptMarkdown(storyboardOf(events)).startsWith('アリス「やあ」')).toBe(true);
  });

  it('頼まれたときだけ章に経過時間を添えること', () => {
    const withTime = buildReplayScriptMarkdown(storyboardOf(events), {
      ...DEFAULT_REPLAY_SCRIPT_OPTIONS,
      withTime: true,
    });

    expect(withTime).toContain('## 第二幕 <!-- 00:00:0');
    expect(buildReplayScriptMarkdown(storyboardOf(events))).not.toContain('<!--');
  });

  it('何も無ければ空文字にすること', () => {
    expect(buildReplayScriptMarkdown(EMPTY_REPLAY_STORYBOARD)).toBe('');
  });
});

describe('replayScriptElapsed()', () => {
  it('時分秒に組むこと', () => {
    expect(replayScriptElapsed(0)).toBe('00:00:00');
    expect(replayScriptElapsed(65_000)).toBe('00:01:05');
    expect(replayScriptElapsed(3_725_000)).toBe('01:02:05');
    expect(replayScriptElapsed(-1)).toBe('00:00:00');
  });
});
