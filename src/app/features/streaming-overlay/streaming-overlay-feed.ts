/**
 * 配信に重ねる画面に出す、直近のやり取り。
 *
 * 配信は流れていくものなので、画面には**新しいものを数件だけ**残す。
 * 古いものは、卓では読めても配信では読まれないまま流れるので落とす。
 *
 * 密談（宛先つき）と伏せたダイスは出さない。配信の画面は誰のものでもない場所に出るので、
 * 卓の中では隠れているものが、そのまま観客に見えてしまう。
 */

export interface OverlaySource {
  readonly identifier: string;
  readonly name: string;
  readonly text: string;
  readonly timestamp: number;
  /** 並べる順。同じ時刻の発言でも卓と同じ順で読めるように、チャットと同じ物差しを使う。 */
  readonly order: number;
  readonly color: string;
  readonly isDice: boolean;
  readonly isDirect: boolean;
  readonly isSecret: boolean;
  readonly isDisplayable: boolean;
}

export interface OverlayLine {
  readonly identifier: string;
  readonly name: string;
  readonly text: string;
  readonly color: string;
  readonly isDice: boolean;
}

export interface OverlayFeedOptions {
  /** 画面に残す件数。 */
  readonly limit: number;
  /** これより古いものは落とす。0 なら時間では落とさない。 */
  readonly maxAgeMs: number;
}

export const DEFAULT_OVERLAY_FEED_OPTIONS: OverlayFeedOptions = { limit: 6, maxAgeMs: 120_000 };

export function buildOverlayFeed(
  sources: readonly OverlaySource[],
  now: number,
  options: OverlayFeedOptions = DEFAULT_OVERLAY_FEED_OPTIONS
): OverlayLine[] {
  if (options.limit < 1) return [];

  const lines: OverlayLine[] = [];
  for (const source of sources) {
    if (!source.isDisplayable || source.isDirect || source.isSecret) continue;
    if (source.text.trim().length < 1) continue;
    if (options.maxAgeMs > 0 && now - source.timestamp > options.maxAgeMs) continue;

    lines.push({
      identifier: source.identifier,
      name: source.name,
      text: source.text,
      color: source.color,
      isDice: source.isDice,
    });
  }

  return lines.slice(-options.limit);
}
