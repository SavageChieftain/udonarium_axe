import { Injectable, signal } from '@angular/core';
import { ReplayDetailLevel } from '@axe/domain/replay/replay-event';

const STORAGE_KEY = 'axe-replay-preference';

export const ReplayStartMode = {
  Auto: 'auto',
  Manual: 'manual',
} as const;

export type ReplayStartMode = (typeof ReplayStartMode)[keyof typeof ReplayStartMode];

export interface ReplayPreference {
  readonly startMode: ReplayStartMode;
  readonly detailLevel: ReplayDetailLevel;
}

export const DEFAULT_REPLAY_PREFERENCE: ReplayPreference = {
  startMode: ReplayStartMode.Auto,
  detailLevel: ReplayDetailLevel.Notable,
};

function isStartMode(value: unknown): value is ReplayStartMode {
  return value === ReplayStartMode.Auto || value === ReplayStartMode.Manual;
}

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
      startMode: isStartMode(parsed?.startMode) ? parsed.startMode : DEFAULT_REPLAY_PREFERENCE.startMode,
      detailLevel: isDetailLevel(parsed?.detailLevel) ? parsed.detailLevel : DEFAULT_REPLAY_PREFERENCE.detailLevel,
    };
  } catch {
    return DEFAULT_REPLAY_PREFERENCE;
  }
}

@Injectable({ providedIn: 'root' })
export class ReplayPreferenceService {
  private readonly restored = parseReplayPreference(localStorage.getItem(STORAGE_KEY));

  readonly startMode = signal<ReplayStartMode>(this.restored.startMode);
  readonly detailLevel = signal<ReplayDetailLevel>(this.restored.detailLevel);

  setStartMode(mode: ReplayStartMode): void {
    this.startMode.set(mode);
    this.persist();
  }

  setDetailLevel(level: ReplayDetailLevel): void {
    this.detailLevel.set(level);
    this.persist();
  }

  private persist(): void {
    const state: ReplayPreference = { startMode: this.startMode(), detailLevel: this.detailLevel() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}
