import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EffectCastService } from '@axe/application/effect/effect-cast.service';
import { EffectLibraryService } from '@axe/application/effect/effect-library.service';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { ModalService } from '@axe/application/ui/modal.service';
import { PanelService } from '@axe/application/ui/panel.service';
import { AudioStorage } from '@axe/core/storage/audio-storage';
import { EFFECT_KINDS, EffectKind } from '@axe/domain/effect/effect-kind';
import { EffectPreset } from '@axe/domain/effect/effect-preset';
import {
  EFFECT_GRADE_OPTIONS,
  EFFECT_TARGETING_OPTIONS,
  PROJECTILE_STYLE_OPTIONS,
  SLASH_STYLE_OPTIONS,
  usesImpactKindField,
  usesProjectileFields,
  usesShotFields,
  usesSlashFields,
  usesTargetLimit,
} from '@axe/domain/effect/effect-preset-form';
import { kindGlyphSvg } from '@axe/domain/effect/effect-shapes';
import { SafePipe } from '@axe/ui/pipes/safe.pipe';
import { TranslocoModule } from '@jsverse/transloco';

interface SoundOption {
  identifier: string;
  name: string;
}

/**
 * プリセット編集。
 *
 * 値はモデルへ直接書き込む（`EffectPreset` 側が範囲を丸める）。
 * 種類によって意味を持たない項目は `effect-preset-form` の判定で隠す。
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-effect-preset-editor',
  templateUrl: './effect-preset-editor.component.html',
  imports: [FormsModule, SafePipe, TranslocoModule],
})
export class EffectPresetEditorComponent {
  private readonly library = inject(EffectLibraryService);
  private readonly castService = inject(EffectCastService);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly audioStorage = inject(AudioStorage);
  private readonly modalService = inject(ModalService);
  private readonly panelService = inject(PanelService);
  private readonly t = inject(TRANSLATE_FN);

  /** 編集するプリセット。開いた側が入れる。 */
  readonly presetIdentifier = signal('');

  readonly preset = computed<EffectPreset | null>(() => {
    const identifier = this.presetIdentifier();
    if (identifier.length < 1) return null;
    return this.library.get(identifier);
  });

  /**
   * 中身が書き換わった回数。
   *
   * `preset` は同じインスタンスを返し続けるので、それだけを見ている算出は
   * 値が変わらないものとして再計算されない。中身から導く値はこの版を経由させる。
   */
  private readonly version = computed<number>(() => {
    const identifier = this.presetIdentifier();
    return identifier.length < 1 ? 0 : this.objectChange.versionOf(identifier)();
  });

  protected readonly kinds = EFFECT_KINDS;
  protected readonly targetings = EFFECT_TARGETING_OPTIONS;
  protected readonly grades = EFFECT_GRADE_OPTIONS;
  protected readonly projectileStyles = PROJECTILE_STYLE_OPTIONS;
  protected readonly slashStyles = SLASH_STYLE_OPTIONS;

  readonly notice = signal('');

  protected readonly sounds = computed<SoundOption[]>(() => {
    this.objectChange.fileVersion();
    return [...this.audioStorage.audios]
      .map((audio) => ({ identifier: audio.identifier, name: audio.name }))
      .sort((left, right) => left.name.localeCompare(right.name));
  });

  /** 系統の候補。既にある系統から拾って入力を助ける。 */
  protected readonly tagOptions = computed<string[]>(() =>
    [...new Set(this.library.presets().map((preset) => preset.tagName))].filter((tag) => tag.length > 0).sort()
  );

  protected readonly effectKind = computed<EffectKind>(() => {
    this.version();
    return this.preset()?.effectKind ?? 'burst';
  });
  protected readonly showsProjectile = computed(() => usesProjectileFields(this.effectKind()));
  protected readonly showsSlash = computed(() => usesSlashFields(this.effectKind()));
  protected readonly showsShots = computed(() => usesShotFields(this.effectKind()));
  protected readonly showsImpactKind = computed(() => usesImpactKindField(this.effectKind()));
  protected readonly showsTargetLimit = computed(() => {
    this.version();
    return usesTargetLimit(this.preset()?.effectTargeting ?? 'single');
  });

  protected readonly glyph = computed<string>(() => {
    this.version();
    const preset = this.preset();
    if (!preset) return '';
    return kindGlyphSvg(preset.effectKind, { core: preset.colorPrimary, edge: preset.colorSecondary });
  });

  constructor() {
    queueMicrotask(() => (this.modalService.title = this.panelService.title = this.t('feature.effect.editorTitle')));
  }

  protected kindLabel(kind: string): string {
    return this.t(`feature.effect.kinds.${kind}`);
  }

  protected gradeLabel(grade: number): string {
    return this.t(`feature.effect.grade${grade}`);
  }

  protected targetingLabel(targeting: string): string {
    return this.t(`feature.effect.targeting.${targeting}`);
  }

  protected projectileLabel(style: string): string {
    return this.t(`feature.effect.projectileStyle.${style}`);
  }

  protected slashLabel(style: string): string {
    return this.t(`feature.effect.slashStyle.${style}`);
  }

  /** 書き込んだら版を上げる。同室の全員へ伝わる。 */
  protected edit<K extends keyof EffectPreset>(key: K, value: EffectPreset[K]): void {
    const preset = this.preset();
    if (!preset) return;
    preset[key] = value;
    preset.update();
    this.objectChange.notifyChanged(preset.identifier);
    this.notice.set('');
  }

  protected editNumber(key: keyof EffectPreset, value: string): void {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return;
    this.edit(key as never, numeric as never);
  }

  /** 試し撃ち。自分の画面だけで鳴らす。 */
  protected preview(): void {
    const preset = this.preset();
    if (!preset) return;
    if (!this.castService.preview(preset)) {
      this.notice.set(this.t('feature.effect.previewNoTarget'));
    }
  }
}
