import { inject, Injectable } from '@angular/core';
import { EffectPlaybackService } from '@axe/application/effect/effect-playback.service';
import { TabletopService } from '@axe/application/tabletop/tabletop.service';
import { SelectionSignalService } from '@axe/application/ui/selection-signal.service';
import { callEffectCast } from '@axe/core/event/domain-events';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { EffectCast, EffectCastTarget } from '@axe/domain/effect/effect-cast';
import { EffectPreset } from '@axe/domain/effect/effect-preset';

@Injectable({ providedIn: 'root' })
export class EffectCastService {
  private readonly objectStore = inject(ObjectStore);
  private readonly tabletopService = inject(TabletopService);
  private readonly selectionSignalService = inject(SelectionSignalService);
  private readonly playbackService = inject(EffectPlaybackService);

  /** 発動対象の候補。ターゲット指定が優先で、無ければ選択中のコマ。 */
  candidateTargets(): GameCharacter[] {
    const targeted = this.tabletopService.characters.filter(
      (character) => character.isVisibleOnTable && character.targeted
    );
    return targeted.length > 0 ? targeted : this.selectedCharacters();
  }

  resolveTargets(preset: EffectPreset): GameCharacter[] {
    return this.candidateTargets().slice(0, preset.targetLimit);
  }

  /** 飛翔体の発射元。ターゲット指定に含まれていない「選択中のコマ」を撃ち手とみなす。 */
  resolveCaster(targets: readonly GameCharacter[]): GameCharacter | null {
    const [selected] = this.selectedCharacters();
    return this.casterOutsideTargets(selected ?? null, targets);
  }

  /** 自分自身へ撃たせない。撃ち手が対象に含まれていたら発射元なしとして扱う。 */
  private casterOutsideTargets(caster: GameCharacter | null, targets: readonly GameCharacter[]): GameCharacter | null {
    if (!caster) return null;
    return targets.some((target) => target.identifier === caster.identifier) ? null : caster;
  }

  /**
   * 発動する。撃ち手を明示できるのは、対象選択中に選択が対象側へ移ってしまうため。
   * 省略したときだけ選択中のコマから割り出す。
   */
  fire(
    preset: EffectPreset,
    targets: readonly GameCharacter[],
    explicitCaster?: GameCharacter | null
  ): EffectCast | null {
    if (targets.length < 1) return null;

    const caster =
      explicitCaster !== undefined ? this.casterOutsideTargets(explicitCaster, targets) : this.resolveCaster(targets);
    const cast = this.buildCast(preset, targets, caster);
    callEffectCast(cast);
    return cast;
  }

  /**
   * コマから発動する。ターゲット指定があればそちらへ撃ち、無ければ自分にかける。
   * キャラクターシートに登録した演出やコマの右クリックから使う。
   */
  fireFromCharacter(preset: EffectPreset, caster: GameCharacter): EffectCast | null {
    const targets = this.candidateTargets()
      .filter((target) => target.identifier !== caster.identifier)
      .slice(0, preset.targetLimit);
    if (targets.length > 0) return this.fire(preset, targets, caster);
    return this.fire(preset, [caster], null);
  }

  /**
   * 自分の画面だけで試し撃ちする。編集中の見た目を確かめるためのもので、
   * 他のピアへは送らないし SE も自分にしか鳴らない。
   */
  preview(preset: EffectPreset): EffectCast | null {
    const targets = this.resolveTargets(preset);
    if (targets.length < 1) return null;

    const cast = this.buildCast(preset, targets, this.resolveCaster(targets));
    this.playbackService.play(cast);
    return cast;
  }

  private buildCast(preset: EffectPreset, targets: readonly GameCharacter[], caster: GameCharacter | null): EffectCast {
    const gridSize = this.tabletopService.gridSize();
    const casterCenter = caster ? this.centerOf(caster, gridSize) : null;
    return {
      presetIdentifier: preset.identifier,
      casterIdentifier: caster?.identifier ?? '',
      origin: casterCenter ? { x: casterCenter.x, y: casterCenter.y, z: casterCenter.z + gridSize * 0.6 } : null,
      targets: targets.map((target) => this.centerOf(target, gridSize)),
      seed: Math.floor(Math.random() * 0xffffffff),
    };
  }

  private selectedCharacters(): GameCharacter[] {
    const selected = this.selectionSignalService.selectedObject();
    if (!selected) return [];
    const character = this.objectStore.get<GameCharacter>(selected.identifier);
    if (!(character instanceof GameCharacter) || !character.isVisibleOnTable) return [];
    return [character];
  }

  private centerOf(character: GameCharacter, gridSize: number): EffectCastTarget {
    const half = (gridSize * (character.size > 0 ? character.size : 1)) / 2;
    return {
      identifier: character.identifier,
      x: character.location.x + half,
      y: character.location.y + half,
      z: character.posZ,
    };
  }
}
