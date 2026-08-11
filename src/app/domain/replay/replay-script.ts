import type { ReplayStoryboard } from '@axe/domain/replay/replay-storyboard';

/**
 * 記録を読み物として書き出す。
 *
 * 動画と同じ絵コンテ（`buildReplayStoryboard`）を使う。あちらは canvas に描き、こちらは文字にする。
 * 別々に組み立てると、動画と読み物で章の切れ目や地の文の扱いが食い違う。
 */

export enum ReplayScriptFormat {
  /** 台本。話者を行頭に置く。 */
  Script = 'script',
  /** 小説。地の文と鉤括弧で組む。 */
  Novel = 'novel',
}

export interface ReplayScriptOptions {
  format: ReplayScriptFormat;
  /** 表題。空なら見出しを置かない。 */
  title: string;
  /** 章の頭に経過時間を添える。 */
  withTime: boolean;
}

export const DEFAULT_REPLAY_SCRIPT_OPTIONS: ReplayScriptOptions = {
  format: ReplayScriptFormat.Novel,
  title: '',
  withTime: false,
};

/** 続きのカットは 1 つの発言に戻す。動画では読める長さに割ってあるが、読み物では切れ目が邪魔になる。 */
export interface ReplayScriptLine {
  /** 元の発言。割られたカットは同じ番号を持つ。 */
  seq: number;
  chapter: string;
  speaker: string;
  text: string;
  isNarration: boolean;
  startMs: number;
}

export function buildReplayScriptLines(storyboard: ReplayStoryboard): ReplayScriptLine[] {
  const lines: ReplayScriptLine[] = [];

  for (const shot of storyboard.shots) {
    if (shot.isChapterStart) continue;

    const text = shot.text.trim();
    if (text.length < 1) continue;

    // 割られたカットは元の発言と同じ番号を持つ。話者で見ると、続けて喋った別の発言まで繋がる。
    const previous = lines[lines.length - 1];
    if (previous && previous.seq === shot.seq) {
      previous.text += text;
      continue;
    }

    lines.push({
      seq: shot.seq,
      chapter: shot.chapter,
      speaker: shot.speaker,
      text,
      isNarration: shot.isNarration,
      startMs: shot.startMs,
    });
  }

  return lines;
}

export function buildReplayScriptMarkdown(
  storyboard: ReplayStoryboard,
  options: ReplayScriptOptions = DEFAULT_REPLAY_SCRIPT_OPTIONS
): string {
  const lines = buildReplayScriptLines(storyboard);
  const parts: string[] = [];
  if (options.title.trim().length > 0) parts.push(`# ${options.title.trim()}`);

  let chapter: string | null = null;
  for (const line of lines) {
    if (line.chapter !== chapter) {
      chapter = line.chapter;
      if (chapter.length > 0) {
        const at = options.withTime ? ` <!-- ${replayScriptElapsed(line.startMs)} -->` : '';
        parts.push(`## ${chapter}${at}`);
      }
    }
    parts.push(sentenceOf(line, options.format));
  }

  return parts.join('\n\n') + (parts.length > 0 ? '\n' : '');
}

/** 1 行ぶんの言い回し。 */
function sentenceOf(line: ReplayScriptLine, format: ReplayScriptFormat): string {
  if (line.isNarration || line.speaker.length < 1) return line.text;
  if (format === ReplayScriptFormat.Script) return `**${line.speaker}**　${line.text}`;
  return `${line.speaker}「${line.text}」`;
}

/** 経過時間の表記。読み物では章の頭にだけ添える。 */
export function replayScriptElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor(total / 60) % 60)}:${pad(total % 60)}`;
}
