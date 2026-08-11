import { Injectable, signal } from '@angular/core';
import type { ReplayRetention } from '@axe/core/storage/replay-log-store';
import { ReplayDetailLevel } from '@axe/domain/replay/replay-event';

const STORAGE_KEY = 'axe-replay-preference';

/** 端末に残す本数。`null` は「残す本数を決めない」＝勝手に消さない。 */
export type ReplayKeepCount = number | null;

export const REPLAY_KEEP_CHOICES: readonly ReplayKeepCount[] = [null, 20, 10, 5];

export interface ReplayPreference {
  readonly detailLevel: ReplayDetailLevel;
  readonly keepCount: ReplayKeepCount;
}

export const DEFAULT_REPLAY_PREFERENCE: ReplayPreference = {
  detailLevel: ReplayDetailLevel.Notable,
  // 既定は消さない。消すかどうかは記録した人が決める。
  keepCount: null,
};

function isDetailLevel(value: unknown): value is ReplayDetailLevel {
  return (
    value === ReplayDetailLevel.ChatOnly || value === ReplayDetailLevel.Notable || value === ReplayDetailLevel.Full
  );
}

function isKeepCount(value: unknown): value is ReplayKeepCount {
  return value === null || (typeof value === 'number' && Number.isInteger(value) && value > 0);
}

export function parseReplayPreference(raw: string | null): ReplayPreference {
  if (!raw) return DEFAULT_REPLAY_PREFERENCE;
  try {
    const parsed = JSON.parse(raw) as Partial<ReplayPreference>;
    return {
      detailLevel: isDetailLevel(parsed?.detailLevel) ? parsed.detailLevel : DEFAULT_REPLAY_PREFERENCE.detailLevel,
      keepCount: isKeepCount(parsed?.keepCount) ? parsed.keepCount : DEFAULT_REPLAY_PREFERENCE.keepCount,
    };
  } catch {
    return DEFAULT_REPLAY_PREFERENCE;
  }
}

@Injectable({ providedIn: 'root' })
export class ReplayPreferenceService {
  private readonly restored = parseReplayPreference(localStorage.getItem(STORAGE_KEY));

  readonly detailLevel = signal<ReplayDetailLevel>(this.restored.detailLevel);
  readonly keepCount = signal<ReplayKeepCount>(this.restored.keepCount);

  /** 消す条件。本数だけで決め、容量では消さない（空きはブラウザが見る）。 */
  get retention(): ReplayRetention {
    return { maxCount: this.keepCount(), maxTotalBytes: null };
  }

  setDetailLevel(level: ReplayDetailLevel): void {
    this.detailLevel.set(level);
    this.persist();
  }

  setKeepCount(count: ReplayKeepCount): void {
    this.keepCount.set(count);
    this.persist();
  }

  private persist(): void {
    const state: ReplayPreference = { detailLevel: this.detailLevel(), keepCount: this.keepCount() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}
