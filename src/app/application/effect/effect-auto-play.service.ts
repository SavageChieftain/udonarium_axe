import { inject, Injectable, signal } from '@angular/core';
import { EffectPlaybackService } from '@axe/application/effect/effect-playback.service';
import { TabletopService } from '@axe/application/tabletop/tabletop.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { loudestChangeRatio, ResourceChange, resourceChangeSeverity } from '@axe/domain/character/resource-change';
import { EffectPreset } from '@axe/domain/effect/effect-preset';
import { autoEffectIdentifier } from '@axe/domain/effect/resource-effect-map';

const STORAGE_KEY = 'axe.effect.autoPlay';

/**
 * HP などの増減に演出を自動で当てる。
 *
 * 増減はすでに全員へ同期されているので、各自が自分の画面で再生する
 * （`EFFECT_CAST` を送ると人数ぶん重なる）。
 * 卓ごとに好みが割れるので既定は切っておき、各自が入り切りする。
 */
@Injectable({ providedIn: 'root' })
export class EffectAutoPlayService {
  private readonly objectStore = inject(ObjectStore);
  private readonly playbackService = inject(EffectPlaybackService);
  private readonly tabletopService = inject(TabletopService);
  private readonly storage = typeof localStorage === 'undefined' ? null : localStorage;

  private readonly _enabled = signal(this.storage?.getItem(STORAGE_KEY) === 'on');
  readonly enabled = this._enabled.asReadonly();

  setEnabled(enabled: boolean): void {
    this._enabled.set(enabled);
    this.storage?.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
  }

  toggle(): void {
    this.setEnabled(!this._enabled());
  }

  /** 増減の内訳から 1 つだけ選んで再生する。行ごとに出すと数値のぶんだけ重なる。 */
  play(character: GameCharacter, changes: readonly ResourceChange[]): boolean {
    if (!this._enabled() || changes.length < 1) return false;

    const kind = changes.some((change) => change.kind === 'damage') ? 'damage' : 'heal';
    const severity = resourceChangeSeverity(loudestChangeRatio(changes));
    const preset = this.objectStore.get<EffectPreset>(autoEffectIdentifier(kind, severity));
    if (!(preset instanceof EffectPreset)) return false;

    const half = (this.tabletopService.gridSize() * (character.size > 0 ? character.size : 1)) / 2;
    return (
      this.playbackService.play({
        presetIdentifier: preset.identifier,
        casterIdentifier: '',
        origin: null,
        targets: [
          {
            identifier: character.identifier,
            x: character.location.x + half,
            y: character.location.y + half,
            z: character.posZ,
          },
        ],
        seed: Math.floor(Math.random() * 0xffffffff),
      }) != null
    );
  }
}
