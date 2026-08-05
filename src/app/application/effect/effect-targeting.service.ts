import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { EffectCastService } from '@axe/application/effect/effect-cast.service';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { TabletopService } from '@axe/application/tabletop/tabletop.service';
import { SelectionSignalService, TabletopObjectSelection } from '@axe/application/ui/selection-signal.service';
import { UiSignalService } from '@axe/application/ui/ui-signal.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { TargetArrowGeometry, targetArrowGeometry } from '@axe/domain/card/target-arrow';
import { GameCharacter } from '@axe/domain/character/game-character';
import { effectAreaTargets } from '@axe/domain/effect/effect-area';
import { EffectCast } from '@axe/domain/effect/effect-cast';
import { EffectPreset } from '@axe/domain/effect/effect-preset';
import { effectPickOrder, reachedEffectPickLimit, toggleEffectPick } from '@axe/domain/effect/effect-target-picks';

/** 選択中のコマに出す順番の印。 */
export interface EffectTargetMark {
  identifier: string;
  order: number;
  x: number;
  y: number;
  z: number;
}

/** 詠唱者から対象へ引く線。 */
export interface EffectTargetLink extends TargetArrowGeometry {
  identifier: string;
}

/**
 * 順序付きの対象選択。
 *
 * 選んだ順の配列が真実の源で、コマの `targeted` はその写し。
 * こうしておくと、選び終えたあとにチャットの `t:HP-10` がそのまま同じ対象へ効く。
 */
@Injectable({ providedIn: 'root' })
export class EffectTargetingService {
  private readonly objectStore = inject(ObjectStore);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly tabletopService = inject(TabletopService);
  private readonly selectionSignalService = inject(SelectionSignalService);
  private readonly uiSignalService = inject(UiSignalService);
  private readonly castService = inject(EffectCastService);

  private readonly _preset = signal<EffectPreset | null>(null);
  private readonly _picks = signal<readonly string[]>([]);
  private readonly _casterIdentifier = signal('');
  private readonly _epicenter = signal('');

  readonly preset = this._preset.asReadonly();
  readonly picks = this._picks.asReadonly();
  readonly casterIdentifier = this._casterIdentifier.asReadonly();
  /** 範囲攻撃の中心に選んだコマ。 */
  readonly epicenter = this._epicenter.asReadonly();

  /** 巻き込む範囲の半径(px)。0 なら範囲攻撃ではない。 */
  readonly areaRadius = computed<number>(() => {
    const cells = this._preset()?.areaRadiusCells ?? 0;
    return cells > 0 ? cells * this.tabletopService.gridSize() : 0;
  });

  /** 範囲の中心。円を描く位置。 */
  readonly areaCenter = computed<{ x: number; y: number; z: number } | null>(() => {
    if (this.areaRadius() <= 0) return null;
    const character = this.characterOf(this._epicenter());
    if (!character) return null;
    this.objectChange.versionOf(character.identifier)();
    return this.centerOf(character, this.tabletopService.gridSize());
  });
  readonly isPicking = computed(() => this._preset() != null);
  readonly limit = computed(() => this._preset()?.targetLimit ?? 0);

  /** 中止したときに戻す、選択を始める前のターゲット指定。 */
  private previousTargets: readonly string[] = [];
  /** 始めた時点で選ばれていたコマ。これを「選び直した」とは扱わない。 */
  private beganWithSelection: TabletopObjectSelection | null = null;

  readonly marks = computed<EffectTargetMark[]>(() => {
    if (!this.isPicking()) return [];
    this.objectChange.collectionOf('character')();

    const gridSize = this.tabletopService.gridSize();
    const marks: EffectTargetMark[] = [];
    for (const identifier of this._picks()) {
      const character = this.characterOf(identifier);
      if (!character) continue;
      this.objectChange.versionOf(identifier)();
      marks.push({
        identifier,
        order: effectPickOrder(this._picks(), identifier),
        ...this.centerOf(character, gridSize),
      });
    }
    return marks;
  });

  readonly links = computed<EffectTargetLink[]>(() => {
    if (!this.isPicking()) return [];
    const caster = this.characterOf(this._casterIdentifier());
    if (!caster) return [];

    const gridSize = this.tabletopService.gridSize();
    this.objectChange.versionOf(caster.identifier)();
    const from = this.centerOf(caster, gridSize);

    const links: EffectTargetLink[] = [];
    for (const mark of this.marks()) {
      const geometry = targetArrowGeometry(from, mark);
      if (geometry) links.push({ identifier: mark.identifier, ...geometry });
    }
    return links;
  });

  constructor() {
    effect(() => {
      const selected = this.selectionSignalService.selectedObject();
      if (!selected || !untracked(this.isPicking)) return;
      // 始める前から選ばれていたコマは、押し直したわけではないので対象にしない。
      if (selected === this.beganWithSelection) {
        this.beganWithSelection = null;
        return;
      }
      untracked(() => this.pick(selected.identifier));
    });
  }

  /**
   * 対象選択を始める。すでに指定されているコマを引き継ぐので、
   * リモコンやチャットで指定済みならそのまま発動できる。
   */
  begin(preset: EffectPreset): void {
    const targeted = this.tabletopService.characters
      .filter((character) => character.isVisibleOnTable && character.targeted)
      .map((character) => character.identifier);

    this.previousTargets = targeted;
    this.beganWithSelection = untracked(this.selectionSignalService.selectedObject);
    this._preset.set(preset);
    this._picks.set(targeted.slice(0, Math.max(preset.targetLimit, 1)));
    // 撃ち手は選択中のコマ。選び進めると選択が対象側へ移るので、始める時点で捕まえておく。
    this._casterIdentifier.set(this.selectedCasterIdentifier());
    this.mirror();
  }

  /** 対象を選ぶ / 選び直す。上限に届いたらそのまま発動する。 */
  pick(identifier: string): EffectCast | null {
    const preset = this._preset();
    if (!preset) return null;

    const character = this.characterOf(identifier);
    if (!character) return null;

    // 範囲攻撃は 1 回のクリックで巻き込むぶんを丸ごと選び直す。
    // まとめて選んだだけで撃ってしまうと、どこまで巻き込んだか確かめられない。
    if (preset.areaRadiusCells > 0) {
      this._epicenter.set(identifier);
      this._picks.set(this.areaPicks(preset, character));
      this.mirror();
      return null;
    }

    const before = this._picks();
    const after = toggleEffectPick(before, identifier, preset.targetLimit);
    this._picks.set(after);
    this.mirror();

    if (!reachedEffectPickLimit(before, after, preset.targetLimit)) return null;
    return this.confirm();
  }

  confirm(): EffectCast | null {
    const preset = this._preset();
    if (!preset) return null;

    const targets = this._picks()
      .map((identifier) => this.characterOf(identifier))
      .filter((character): character is GameCharacter => character != null);
    if (targets.length < 1) return null;

    const caster = this.characterOf(this._casterIdentifier());
    const cast = this.castService.fire(preset, targets, caster);
    this.reset();
    return cast;
  }

  /** 中止。始める前のターゲット指定へ戻す。 */
  cancel(): boolean {
    if (!this.isPicking()) return false;

    this._picks.set(this.previousTargets);
    this.mirror();
    this.reset();
    return true;
  }

  private reset(): void {
    this._preset.set(null);
    this._picks.set([]);
    this._casterIdentifier.set('');
    this._epicenter.set('');
    this.previousTargets = [];
    this.beganWithSelection = null;
  }

  /** 中心のコマから半径内を近い順に拾う。 */
  private areaPicks(preset: EffectPreset, center: GameCharacter): string[] {
    const gridSize = this.tabletopService.gridSize();
    const origin = this.centerOf(center, gridSize);
    const candidates = this.tabletopService.characters
      .filter((character) => character.isVisibleOnTable)
      .map((character) => ({ identifier: character.identifier, ...this.centerOf(character, gridSize) }));

    return effectAreaTargets(origin, candidates, preset.areaRadiusCells * gridSize, preset.targetLimit);
  }

  /** 選んだ順の配列をコマの `targeted` へ写す。 */
  private mirror(): void {
    const picked = new Set(this._picks());
    for (const character of this.tabletopService.characters) {
      const next = picked.has(character.identifier);
      if (character.targeted === next) continue;
      character.targeted = next;
      this.uiSignalService.notifyTargetChange(character.identifier, character.aliasName);
    }
  }

  private selectedCasterIdentifier(): string {
    const selected = this.selectionSignalService.selectedObject();
    if (!selected) return '';
    return this.characterOf(selected.identifier)?.identifier ?? '';
  }

  private characterOf(identifier: string): GameCharacter | null {
    if (identifier.length < 1) return null;
    const character = this.objectStore.get<GameCharacter>(identifier);
    if (!(character instanceof GameCharacter) || !character.isVisibleOnTable) return null;
    return character;
  }

  private centerOf(character: GameCharacter, gridSize: number): { x: number; y: number; z: number } {
    const half = (gridSize * (character.size > 0 ? character.size : 1)) / 2;
    return { x: character.location.x + half, y: character.location.y + half, z: character.posZ };
  }
}
