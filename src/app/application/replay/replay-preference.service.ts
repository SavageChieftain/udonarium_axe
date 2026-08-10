import { Injectable, signal } from '@angular/core';
import { ReplayDetailLevel } from '@axe/domain/replay/replay-event';

const STORAGE_KEY = 'axe-replay-preference';

export interface ReplayPreference {
  readonly detailLevel: ReplayDetailLevel;
}

export const DEFAULT_REPLAY_PREFERENCE: ReplayPreference = {
  detailLevel: ReplayDetailLevel.Notable,
};

function isDetailLevel(value: unknown): value is ReplayDetailLevel {
  return (
    value === ReplayDetailLevel.ChatOnly || value === ReplayDetailLevel.Notable || value === ReplayDetailLevel.Full
  );
}

export function parseReplayPreference(raw: string | null): ReplayPreference {
  if (!raw) return DEFAULT_REPLAY_PREFERENCE;
  try {
    const parsed = JSON.parse(raw) as Partial<ReplayPreference>;
    return {
      detailLevel: isDetailLevel(parsed?.detailLevel) ? parsed.detailLevel : DEFAULT_REPLAY_PREFERENCE.detailLevel,
    };
  } catch {
    return DEFAULT_REPLAY_PREFERENCE;
  }
}

@Injectable({ providedIn: 'root' })
export class ReplayPreferenceService {
  private readonly restored = parseReplayPreference(localStorage.getItem(STORAGE_KEY));

  readonly detailLevel = signal<ReplayDetailLevel>(this.restored.detailLevel);

  setDetailLevel(level: ReplayDetailLevel): void {
    this.detailLevel.set(level);
    this.persist();
  }

  private persist(): void {
    const state: ReplayPreference = { detailLevel: this.detailLevel() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}
