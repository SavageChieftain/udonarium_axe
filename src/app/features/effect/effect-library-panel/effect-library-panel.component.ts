import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EffectAutoPlayService } from '@axe/application/effect/effect-auto-play.service';
import { EffectCastService } from '@axe/application/effect/effect-cast.service';
import { EffectFieldService } from '@axe/application/effect/effect-field.service';
import { EffectLibraryService } from '@axe/application/effect/effect-library.service';
import { EffectTargetingService } from '@axe/application/effect/effect-targeting.service';
import { SaveDataService } from '@axe/application/file/save-data.service';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { ContextMenuService } from '@axe/application/ui/context-menu.service';
import { ModalService } from '@axe/application/ui/modal.service';
import { PanelService } from '@axe/application/ui/panel.service';
import { SelectionSignalService } from '@axe/application/ui/selection-signal.service';
import { UiSignalService } from '@axe/application/ui/ui-signal.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { buildEffectChatToken } from '@axe/domain/effect/effect-chat-token';
import { EffectField } from '@axe/domain/effect/effect-field';
import { EffectPreset } from '@axe/domain/effect/effect-preset';
import { EffectPresetSet } from '@axe/domain/effect/effect-preset-set';
import { kindGlyphSvg } from '@axe/domain/effect/effect-shapes';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { buildEffectLibraryContextMenu } from '@axe/features/effect/effect-library-panel/effect-library-context-menu';
import {
  collectTags,
  EffectLibraryGroup,
  filterPresets,
  groupPresets,
  isMultiTarget,
  TargetingFilter,
} from '@axe/features/effect/effect-library-panel/effect-library-list';
import { pushRecentEffect, readRecentEffects } from '@axe/features/effect/effect-library-panel/recent-effects';
import { EffectPresetEditorComponent } from '@axe/features/effect/effect-preset-editor/effect-preset-editor.component';
import { ConfirmDialogComponent } from '@axe/ui/components/confirm-dialog/confirm-dialog.component';
import { SafePipe } from '@axe/ui/pipes/safe.pipe';
import { TranslocoModule } from '@jsverse/transloco';

const GRADE_LEVELS: readonly number[] = [1, 2, 3];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-effect-library-panel',
  templateUrl: './effect-library-panel.component.html',
  imports: [FormsModule, NgTemplateOutlet, SafePipe, TranslocoModule],
})
export class EffectLibraryPanelComponent {
  private readonly library = inject(EffectLibraryService);
  private readonly castService = inject(EffectCastService);
  private readonly targeting = inject(EffectTargetingService);
  private readonly objectStore = inject(ObjectStore);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly contextMenuService = inject(ContextMenuService);
  private readonly saveDataService = inject(SaveDataService);
  private readonly autoPlay = inject(EffectAutoPlayService);
  private readonly fieldService = inject(EffectFieldService);
  private readonly selectionSignalService = inject(SelectionSignalService);
  private readonly uiSignalService = inject(UiSignalService);
  private readonly modalService = inject(ModalService);
  private readonly panelService = inject(PanelService);
  private readonly t = inject(TRANSLATE_FN);

  protected readonly gradeLevels = GRADE_LEVELS;

  readonly query = signal('');
  readonly tagFilter = signal<string | null>(null);
  readonly gradeFilter = signal<number | null>(null);
  readonly targetingFilter = signal<TargetingFilter | null>(null);

  readonly tags = computed<string[]>(() => collectTags(this.library.presets()));

  readonly isGameMaster = computed<boolean>(() => {
    if (PeerCursor.myCursor) this.objectChange.versionOf(PeerCursor.myCursor.identifier)();
    return PeerCursor.isMyselfGameMaster;
  });

  readonly groups = computed<EffectLibraryGroup[]>(() =>
    groupPresets(
      filterPresets(
        this.library.presets(),
        this.query(),
        this.tagFilter(),
        this.gradeFilter(),
        this.targetingFilter(),
        this.isGameMaster()
      )
    )
  );

  readonly matchCount = computed<number>(() => this.groups().reduce((total, group) => total + group.presets.length, 0));

  readonly hasFilter = computed<boolean>(
    () =>
      this.query().trim().length > 0 ||
      this.tagFilter() != null ||
      this.gradeFilter() != null ||
      this.targetingFilter() != null
  );

  readonly targetNames = computed<string[]>(() => {
    this.uiSignalService.targetChange();
    this.selectionSignalService.selectedObject();
    this.objectChange.collectionOf('character')();
    if (this.targeting.isPicking()) return this.pickedNames();
    return this.castService.candidateTargets().map((character) => character.name);
  });

  /** 飛翔体の発射元。ターゲット指定に含まれない選択中のコマ。 */
  readonly casterName = computed<string>(() => {
    this.uiSignalService.targetChange();
    this.selectionSignalService.selectedObject();
    this.objectChange.collectionOf('character')();
    const targets = this.castService.candidateTargets();
    return this.castService.resolveCaster(targets)?.name ?? '';
  });

  /** 置きっぱなしの演出。置いたあと消せないと盤面に残り続ける。 */
  readonly fields = computed<EffectField[]>(() => this.fieldService.fields());

  readonly lastFired = signal('');
  readonly notice = signal('');

  /** 対象選択中の状態。選んだ順に並ぶ。 */
  readonly isPicking = computed<boolean>(() => this.targeting.isPicking());
  readonly pickingName = computed<string>(() => this.targeting.preset()?.name ?? '');
  readonly pickLimit = computed<number>(() => this.targeting.limit());

  readonly pickedNames = computed<string[]>(() => this.targeting.marks().map((mark) => this.nameOf(mark.identifier)));

  protected isPickingPreset(preset: EffectPreset): boolean {
    return this.targeting.preset()?.identifier === preset.identifier;
  }

  private nameOf(identifier: string): string {
    const character = this.objectStore.get<GameCharacter>(identifier);
    return character instanceof GameCharacter ? character.name : '';
  }

  private readonly storage = typeof localStorage === 'undefined' ? null : localStorage;
  private readonly recentIdentifiers = signal<string[]>(readRecentEffects(this.storage));

  /** 直近に使ったもの。絞り込みに関係なく先頭へ出す。 */
  readonly recent = computed<EffectPreset[]>(() => {
    const presets = this.library.presets();
    return this.recentIdentifiers()
      .map((identifier) => presets.find((preset) => preset.identifier === identifier))
      .filter((preset): preset is EffectPreset => preset != null)
      .slice(0, 6);
  });

  constructor() {
    queueMicrotask(() => (this.modalService.title = this.panelService.title = this.t('feature.effect.panelTitle')));
  }

  /** 一覧の印。演出の形から起こした SVG を使う。 */
  protected glyphOf(preset: EffectPreset): string {
    return kindGlyphSvg(preset.effectKind, { core: preset.colorPrimary, edge: preset.colorSecondary });
  }

  protected swatchStyle(preset: EffectPreset): string {
    return `linear-gradient(135deg, ${preset.colorPrimary}, ${preset.colorSecondary})`;
  }

  protected gradeLabel(grade: number): string {
    return this.t(`feature.effect.grade${grade}`);
  }

  /** 単体しか狙えないものと、複数を巻き込めるものを一目で分ける。 */
  protected isMulti(preset: EffectPreset): boolean {
    return isMultiTarget(preset);
  }

  protected targetIcon(preset: EffectPreset): string {
    if (preset.effectTargeting === 'self') return 'self_improvement';
    return isMultiTarget(preset) ? 'groups' : 'person';
  }

  protected toggleTargeting(value: TargetingFilter): void {
    this.targetingFilter.update((current) => (current === value ? null : value));
  }

  protected targetLabel(preset: EffectPreset): string {
    if (preset.effectTargeting === 'self') return this.t('feature.effect.targetSelf');
    if (preset.targetLimit <= 1) return this.t('feature.effect.targetSingle');
    return this.t('feature.effect.targetMulti', { count: preset.targetLimit });
  }

  /** 折りたたんだ系統。多いので、使わない系統は閉じておけるようにする。 */
  private readonly collapsed = signal<ReadonlySet<string>>(new Set());

  protected isCollapsed(tag: string): boolean {
    return this.collapsed().has(tag);
  }

  protected toggleGroup(tag: string): void {
    this.collapsed.update((current) => {
      const next = new Set(current);
      if (!next.delete(tag)) next.add(tag);
      return next;
    });
  }

  protected toggleTag(tag: string): void {
    this.tagFilter.update((current) => (current === tag ? null : tag));
  }

  protected toggleGrade(grade: number): void {
    this.gradeFilter.update((current) => (current === grade ? null : grade));
  }

  protected clearFilters(): void {
    this.query.set('');
    this.tagFilter.set(null);
    this.gradeFilter.set(null);
    this.targetingFilter.set(null);
  }

  /**
   * 一覧から選ぶ。自分にかけるものは即発動、それ以外は対象選択へ入る。
   * 選択中に同じものを選んだら中止として扱う。
   */
  protected fire(preset: EffectPreset): void {
    this.notice.set('');
    if (this.targeting.preset()?.identifier === preset.identifier) {
      this.targeting.cancel();
      return;
    }

    if (preset.effectTargeting === 'self') {
      const targets = this.castService.resolveTargets(preset);
      if (targets.length < 1) {
        this.lastFired.set('');
        return;
      }
      this.castService.fire(preset, targets);
      this.reportFired(
        preset,
        targets.map((target) => target.name)
      );
      return;
    }

    this.targeting.begin(preset);
    this.recentIdentifiers.set(pushRecentEffect(this.storage, preset.identifier));
  }

  protected confirmTargets(): void {
    const preset = this.targeting.preset();
    const names = this.pickedNames();
    if (!preset || !this.targeting.confirm()) return;
    this.reportFired(preset, names);
  }

  protected cancelTargets(): void {
    this.targeting.cancel();
  }

  private reportFired(preset: EffectPreset, names: readonly string[]): void {
    this.lastFired.set(names.join('、'));
    this.recentIdentifiers.set(pushRecentEffect(this.storage, preset.identifier));
  }

  /** 白紙から作って、そのまま編集を開く。 */
  protected createPreset(): void {
    const preset = this.library.create(this.t('feature.effect.newPresetName'));
    this.openEditor(preset);
  }

  protected duplicatePreset(preset: EffectPreset): void {
    this.openEditor(this.library.duplicate(preset));
  }

  protected removePreset(preset: EffectPreset): void {
    this.modalService
      .open<boolean>(ConfirmDialogComponent, {
        message: this.t('feature.effect.removeConfirm', { name: preset.name }),
        okLabel: this.t('common.button.delete'),
        danger: true,
      })
      .then((ok) => {
        if (ok !== true) return;
        this.library.remove(preset);
      });
  }

  protected openEditor(preset: EffectPreset): void {
    const editor = this.panelService.open(EffectPresetEditorComponent, {
      width: 360,
      height: 560,
      left: 520,
      top: 80,
      title: this.t('feature.effect.editorTitle'),
    });
    editor.presetIdentifier.set(preset.identifier);
  }

  /** タイルの右クリック。編集まわりは一覧を汚さないようここへまとめる。 */
  protected openPresetMenu(preset: EffectPreset, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.contextMenuService.open(
      { x: event.clientX, y: event.clientY },
      buildEffectLibraryContextMenu(
        preset,
        {
          onEdit: () => this.openEditor(preset),
          onDuplicate: () => this.duplicatePreset(preset),
          onPreview: () => this.previewPreset(preset),
          onInsertToken: () => this.insertToken(preset),
          onPlaceField: () => this.placeField(preset),
          onRemove: () => this.removePreset(preset),
        },
        this.t
      ),
      preset.name
    );
  }

  /** パレット行へ貼れるトークンをチャット入力欄へ入れる。 */
  protected insertToken(preset: EffectPreset): void {
    this.uiSignalService.requestChatInputText(buildEffectChatToken(preset.name));
    this.notice.set(this.t('feature.effect.tokenInserted'));
  }

  /** 選んでいるコマの位置へ、置きっぱなしの演出を置く。 */
  protected placeField(preset: EffectPreset): void {
    const [anchor] = this.castService.candidateTargets();
    if (!anchor) {
      this.notice.set(this.t('feature.effect.previewNoTarget'));
      return;
    }
    this.fieldService.place(preset, anchor.location.x, anchor.location.y, anchor.posZ);
    this.notice.set(this.t('feature.effect.fieldPlaced', { name: preset.name }));
  }

  protected removeField(field: EffectField): void {
    this.fieldService.remove(field);
  }

  protected fieldName(field: EffectField): string {
    return this.fieldService.presetOf(field)?.name ?? '';
  }

  protected previewPreset(preset: EffectPreset): void {
    if (this.castService.preview(preset)) return;
    this.notice.set(this.t('feature.effect.previewNoTarget'));
  }

  /** HP 増減の自動演出。各自の画面だけの設定なので、その場で切り替わる。 */
  readonly autoPlayEnabled = computed<boolean>(() => this.autoPlay.enabled());

  protected toggleAutoPlay(): void {
    this.autoPlay.toggle();
  }

  /** エフェクト集だけを書き出す。部屋ごと渡さずに演出を配れる。 */
  protected exportLibrary(): void {
    void this.saveDataService.saveGameObjectAsync(new EffectPresetSet(), 'effect_library');
    this.notice.set(this.t('feature.effect.exported'));
  }

  protected restoreDefaults(): void {
    const { added, updated } = this.library.restoreDefaults();
    this.notice.set(this.t('feature.effect.restored', { added, updated }));
  }
}
