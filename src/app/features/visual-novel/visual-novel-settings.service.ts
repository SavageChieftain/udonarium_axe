import { Injectable, signal } from '@angular/core';

export type VnTypewriterSpeed = 'off' | 'slow' | 'normal' | 'fast';
export type VnPortraitAnimation = 'none' | 'fade' | 'slide' | 'bounce';
export type VnTextSize = 'small' | 'normal' | 'large';

export const VN_TYPEWRITER_SPEEDS: readonly VnTypewriterSpeed[] = ['off', 'slow', 'normal', 'fast'];
export const VN_PORTRAIT_ANIMATIONS: readonly VnPortraitAnimation[] = ['none', 'fade', 'slide', 'bounce'];
export const VN_TEXT_SIZES: readonly VnTextSize[] = ['small', 'normal', 'large'];

export const VN_AUTO_PLAY_SPEED_MIN = 0.5;
export const VN_AUTO_PLAY_SPEED_MAX = 2;

export const VN_TYPEWRITER_INTERVAL_MS: Record<VnTypewriterSpeed, number> = {
  off: 0,
  slow: 60,
  normal: 30,
  fast: 12,
};

const STORAGE_KEY = 'vn-settings';

interface VnSettingsSnapshot {
  typewriterSpeed?: unknown;
  portraitAnimation?: unknown;
  textSize?: unknown;
  autoPlaySpeed?: unknown;
  reduceMotion?: unknown;
}

function clampSpeed(value: unknown): number {
  const num = typeof value === 'number' ? value : NaN;
  if (Number.isNaN(num)) return 1;
  return Math.min(VN_AUTO_PLAY_SPEED_MAX, Math.max(VN_AUTO_PLAY_SPEED_MIN, num));
}

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

@Injectable({ providedIn: 'root' })
export class VisualNovelSettingsService {
  private readonly _typewriterSpeed = signal<VnTypewriterSpeed>('normal');
  private readonly _portraitAnimation = signal<VnPortraitAnimation>('slide');
  private readonly _textSize = signal<VnTextSize>('normal');
  private readonly _autoPlaySpeed = signal<number>(1);
  private readonly _reduceMotion = signal(false);

  readonly typewriterSpeed = this._typewriterSpeed.asReadonly();
  readonly portraitAnimation = this._portraitAnimation.asReadonly();
  readonly textSize = this._textSize.asReadonly();
  readonly autoPlaySpeed = this._autoPlaySpeed.asReadonly();
  readonly reduceMotion = this._reduceMotion.asReadonly();

  constructor() {
    this.load();
  }

  setTypewriterSpeed(speed: VnTypewriterSpeed): void {
    this._typewriterSpeed.set(speed);
    this.save();
  }

  setPortraitAnimation(animation: VnPortraitAnimation): void {
    this._portraitAnimation.set(animation);
    this.save();
  }

  setTextSize(size: VnTextSize): void {
    this._textSize.set(size);
    this.save();
  }

  setAutoPlaySpeed(speed: number): void {
    this._autoPlaySpeed.set(clampSpeed(speed));
    this.save();
  }

  setReduceMotion(reduce: boolean): void {
    this._reduceMotion.set(reduce);
    this.save();
  }

  toggleReduceMotion(): void {
    this.setReduceMotion(!this._reduceMotion());
  }

  private load(): void {
    let snapshot: VnSettingsSnapshot | null = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) snapshot = JSON.parse(raw) as VnSettingsSnapshot;
    } catch {
      snapshot = null;
    }
    if (!snapshot) return;
    this._typewriterSpeed.set(pick(snapshot.typewriterSpeed, VN_TYPEWRITER_SPEEDS, 'normal'));
    this._portraitAnimation.set(pick(snapshot.portraitAnimation, VN_PORTRAIT_ANIMATIONS, 'slide'));
    this._textSize.set(pick(snapshot.textSize, VN_TEXT_SIZES, 'normal'));
    this._autoPlaySpeed.set(clampSpeed(snapshot.autoPlaySpeed));
    this._reduceMotion.set(snapshot.reduceMotion === true);
  }

  private save(): void {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          typewriterSpeed: this._typewriterSpeed(),
          portraitAnimation: this._portraitAnimation(),
          textSize: this._textSize(),
          autoPlaySpeed: this._autoPlaySpeed(),
          reduceMotion: this._reduceMotion(),
        })
      );
    } catch {
      return;
    }
  }
}
