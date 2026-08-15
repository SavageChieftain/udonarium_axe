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
  { identifier: 'c1', name: 'アリス', imageIdentifier: 'img-alice', chatColor: '#112233', onTable: true },
];

function storyboardOf(events: readonly ReplayEvent[]) {
  return buildReplayStoryboard(events, cast);
}

describe('buildReplayScriptLines()', () => {
  it('lays the lines out one at a time', () => {
    const lines = buildReplayScriptLines(storyboardOf([say(1, 'やあ'), say(2, 'こんばんは', 'ボブ')]));

    expect(lines.map((line) => [line.speaker, line.text])).toEqual([
      ['アリス', 'やあ'],
      ['ボブ', 'こんばんは'],
    ]);
  });

  it('puts a long line split for the video back together', () => {
    const long = 'あ'.repeat(REPLAY_SHOT_MAX_CHARS * 2 + 10);
    const lines = buildReplayScriptLines(storyboardOf([say(1, long)]));

    // In something to read, the breaks made to keep it readable get in the way.
    expect(lines).toHaveLength(1);
    expect(lines[0].text).toBe(long);
  });

  it('leaves two lines by one person apart', () => {
    const lines = buildReplayScriptLines(storyboardOf([say(1, '一言目'), say(2, '二言目')]));

    expect(lines.map((line) => line.text)).toEqual(['一言目', '二言目']);
  });

  it('makes no line of a chapter heading itself', () => {
    const lines = buildReplayScriptLines(storyboardOf([say(1, 'やあ'), marker(2, '第二幕'), say(3, 'ここから')]));

    expect(lines.map((line) => line.text)).toEqual(['やあ', 'ここから']);
    expect(lines.map((line) => line.chapter)).toEqual(['', '第二幕']);
  });

  it('reads a line with no name as narration', () => {
    const lines = buildReplayScriptLines(storyboardOf([say(1, 'しんと静まり返った', '')]));

    expect(lines[0].isNarration).toBe(true);
  });

  it('returns nothing for nothing', () => {
    expect(buildReplayScriptLines(EMPTY_REPLAY_STORYBOARD)).toEqual([]);
  });
});

describe('buildReplayScriptMarkdown()', () => {
  const events = [say(1, 'やあ'), marker(2, '第二幕'), say(3, 'ここから'), say(4, '風が吹いた', '')];

  it('sets it as prose', () => {
    const text = buildReplayScriptMarkdown(storyboardOf(events), {
      ...DEFAULT_REPLAY_SCRIPT_OPTIONS,
      title: '第一夜',
    });

    expect(text).toContain('# 第一夜');
    expect(text).toContain('## 第二幕');
    expect(text).toContain('アリス「やあ」');
    // Narration takes no quotation marks.
    expect(text).toContain('\n風が吹いた');
    expect(text).not.toContain('「風が吹いた」');
  });

  it('sets it as a script', () => {
    const text = buildReplayScriptMarkdown(storyboardOf(events), {
      ...DEFAULT_REPLAY_SCRIPT_OPTIONS,
      format: ReplayScriptFormat.Script,
    });

    expect(text).toContain('**アリス**');
    expect(text).not.toContain('「やあ」');
  });

  it('writes no heading without a title', () => {
    expect(buildReplayScriptMarkdown(storyboardOf(events)).startsWith('#\n')).toBe(false);
    expect(buildReplayScriptMarkdown(storyboardOf(events)).startsWith('アリス「やあ」')).toBe(true);
  });

  it('puts the elapsed time on a chapter only when it is asked to', () => {
    const withTime = buildReplayScriptMarkdown(storyboardOf(events), {
      ...DEFAULT_REPLAY_SCRIPT_OPTIONS,
      withTime: true,
    });

    expect(withTime).toContain('## 第二幕 <!-- 00:00:0');
    expect(buildReplayScriptMarkdown(storyboardOf(events))).not.toContain('<!--');
  });

  it('writes nothing for nothing', () => {
    expect(buildReplayScriptMarkdown(EMPTY_REPLAY_STORYBOARD)).toBe('');
  });
});

describe('replayScriptElapsed()', () => {
  it('sets it as hours, minutes and seconds', () => {
    expect(replayScriptElapsed(0)).toBe('00:00:00');
    expect(replayScriptElapsed(65_000)).toBe('00:01:05');
    expect(replayScriptElapsed(3_725_000)).toBe('01:02:05');
    expect(replayScriptElapsed(-1)).toBe('00:00:00');
  });
});
