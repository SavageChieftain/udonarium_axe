import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { effectCast$ } from '@axe/core/event/domain-events';
import { ObjectStore } from '@axe/core/sync/object-store';
import { EffectCast, normalizeEffectCast } from '@axe/domain/effect/effect-cast';
import { DefeatReaction, defeatReactionOf } from '@axe/domain/effect/effect-defeat';
import { EffectPreset } from '@axe/domain/effect/effect-preset';
import { effectFlashColor, EffectShake, effectShakeOf } from '@axe/domain/effect/effect-shake';
import { impactSoundTimes, isEffectFinished } from '@axe/domain/effect/effect-timeline';
import { SoundEffect } from '@axe/domain/media/sound-effect';

export interface ActiveEffectCast {
  key: number;
  cast: EffectCast;
  preset: EffectPreset;
  startedAt: number;
}

const MAX_ACTIVE_CASTS = 12;
/** 揺れと閃光の長さ。演出の尺とは別で、短く切り上げないと画面が酔う。 */
const SHAKE_MS = 340;

@Injectable({ providedIn: 'root' })
export class EffectPlaybackService {
  private readonly objectStore = inject(ObjectStore);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _activeCasts = signal<ActiveEffectCast[]>([]);
  readonly activeCasts = this._activeCasts.asReadonly();

  readonly now = signal(0);

  /**
   * 倒れたコマ自身に掛ける反応。identifier → 崩れ方。
   * 周りに演出を出すだけでは倒れたことにならないので、コマ側へも合図を渡す。
   */
  readonly tokenReactions = computed<ReadonlyMap<string, DefeatReaction>>(() => {
    const reactions = new Map<string, DefeatReaction>();
    for (const active of this._activeCasts()) {
      const reaction = defeatReactionOf(active.preset.effectKind);
      if (reaction.length < 1) continue;
      for (const target of active.cast.targets) reactions.set(target.identifier, reaction);
    }
    return reactions;
  });

  /** 画面の揺れの強さ。空なら揺らさない。 */
  private readonly _shake = signal<EffectShake>('');
  readonly shake = this._shake.asReadonly();
  /** 画面を焼く閃光の色。空なら焼かない。 */
  private readonly _flash = signal('');
  readonly flash = this._flash.asReadonly();
  /** 置きっぱなしの演出があるか。ある間は描画のループを止めない。 */
  private readonly _persistent = signal(false);
  private shakeTimer: ReturnType<typeof setTimeout> | null = null;

  setPersistent(persistent: boolean): void {
    this._persistent.set(persistent);
    if (persistent) this.startLoop();
  }

  private nextKey = 0;
  private frameHandle: number | null = null;
  private readonly impactTimers = new Set<ReturnType<typeof setTimeout>>();

  constructor() {
    effectCast$.subscribe((event) => this.play(event.cast), this.destroyRef);
    this.destroyRef.onDestroy(() => {
      this.stopLoop();
      if (this.shakeTimer != null) clearTimeout(this.shakeTimer);
      for (const timer of this.impactTimers) clearTimeout(timer);
      this.impactTimers.clear();
    });
  }

  play(raw: unknown): ActiveEffectCast | null {
    const cast = normalizeEffectCast(raw);
    if (!cast) return null;

    const preset = this.objectStore.get<EffectPreset>(cast.presetIdentifier);
    if (!(preset instanceof EffectPreset)) return null;

    SoundEffect.playLocal(preset.soundIdentifier);
    this.scheduleImpactSound(preset);
    if (prefersReducedMotion()) return null;

    this.startScreenShake(preset);

    const active: ActiveEffectCast = { key: ++this.nextKey, cast, preset, startedAt: clock() };
    this._activeCasts.update((casts) => [...casts, active].slice(-MAX_ACTIVE_CASTS));
    this.now.set(active.startedAt);
    this.startLoop();
    return active;
  }

  /**
   * 画面を揺らす・焼く。
   * 続けて撃たれたら強いほうを採り、時間だけ延ばす（掛け直すと止まって見える）。
   */
  private startScreenShake(preset: EffectPreset): void {
    const shake = effectShakeOf(preset);
    const flash = effectFlashColor(preset);
    if (shake.length < 1 && flash.length < 1) return;

    this._shake.update((current) => (current === 'hard' || shake === 'hard' ? 'hard' : shake || current));
    if (flash.length > 0) this._flash.set(flash);

    if (this.shakeTimer != null) clearTimeout(this.shakeTimer);
    this.shakeTimer = setTimeout(() => {
      this.shakeTimer = null;
      this._shake.set('');
      this._flash.set('');
    }, SHAKE_MS);
  }

  /** 着弾音は当たった瞬間に鳴らす。発射と同時に鳴らすと当たった感じが出ない。 */
  private scheduleImpactSound(preset: EffectPreset): void {
    for (const delay of impactSoundTimes(preset)) {
      const timer = setTimeout(() => {
        this.impactTimers.delete(timer);
        SoundEffect.playLocal(preset.impactSoundIdentifier);
      }, delay);
      this.impactTimers.add(timer);
    }
  }

  private startLoop(): void {
    if (this.frameHandle !== null) return;
    if (typeof requestAnimationFrame !== 'function') return;
    this.frameHandle = requestAnimationFrame(() => this.tick());
  }

  private tick(): void {
    this.frameHandle = null;
    const now = clock();
    this.now.set(now);

    const remaining = this._activeCasts().filter(
      (active) => !isEffectFinished(active.preset, active.cast, now - active.startedAt)
    );
    if (remaining.length !== this._activeCasts().length) this._activeCasts.set(remaining);
    if (remaining.length > 0 || this._persistent()) this.startLoop();
  }

  private stopLoop(): void {
    if (this.frameHandle === null) return;
    cancelAnimationFrame(this.frameHandle);
    this.frameHandle = null;
  }
}

function clock(): number {
  return typeof performance === 'object' ? performance.now() : Date.now();
}

/** OS の「視差効果を減らす」。演出を描かず SE だけにする判断に使う。 */
export function prefersReducedMotion(): boolean {
  if (typeof matchMedia !== 'function') return false;
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}
