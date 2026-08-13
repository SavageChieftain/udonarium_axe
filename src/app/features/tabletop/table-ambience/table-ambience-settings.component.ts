import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { type AmbienceKind, ambiencePalette, GROUND_AMBIENCE_KINDS } from '@axe/domain/effect/ambience/ambience-kind';
import { TableAmbience } from '@axe/domain/tabletop/table-ambience';
import { TranslocoModule } from '@jsverse/transloco';

/** テーブルの一辺の上限と合わせる。マップ全体を覆う沼を作れるようにしておく。 */
const MAX_CELLS = 100;

@Component({
  selector: 'table-ambience-settings',
  templateUrl: './table-ambience-settings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TranslocoModule],
})
export class TableAmbienceSettingsComponent {
  private readonly t = inject(TRANSLATE_FN);

  target: TableAmbience | null = null;

  readonly kinds = GROUND_AMBIENCE_KINDS;

  kindLabel(kind: AmbienceKind): string {
    return this.t(`feature.ambience.kind.${kind}`);
  }

  get name(): string {
    return this.target?.name ?? '';
  }
  set name(value: string) {
    if (this.target) this.target.name = value;
  }

  get kind(): string {
    return this.target?.kind ?? 'swamp';
  }
  set kind(value: string) {
    if (!this.target) return;
    this.target.ambienceKind = value;
    this.target.update();
  }

  get densityPercent(): number {
    return Math.round((this.target?.density ?? 0) * 100);
  }
  set densityPercent(value: number) {
    if (!this.target) return;
    this.target.ambienceDensity = Number(value) / 100;
    this.target.update();
  }

  /** 色を空のままにしておけるよう、既定色は入力欄の初期値として見せる。 */
  get color(): string {
    return this.target?.color ?? ambiencePalette('swamp').primary;
  }
  set color(value: string) {
    if (!this.target) return;
    this.target.ambienceColor = value;
    this.target.update();
  }

  get isDefaultColor(): boolean {
    return (this.target?.ambienceColor ?? '').trim().length < 1;
  }

  resetColor(): void {
    if (!this.target) return;
    this.target.ambienceColor = '';
    this.target.update();
  }

  get width(): number {
    return this.target?.width ?? 1;
  }
  set width(value: number) {
    if (this.target) this.target.width = clampCells(value);
  }

  get height(): number {
    return this.target?.height ?? 1;
  }
  set height(value: number) {
    if (this.target) this.target.height = clampCells(value);
  }

  get isLock(): boolean {
    return this.target?.isLock ?? false;
  }
  set isLock(value: boolean) {
    if (this.target) this.target.isLock = value;
  }
}

function clampCells(value: number): number {
  const numeric = Math.round(Number(value));
  if (!Number.isFinite(numeric)) return 1;
  return Math.min(Math.max(numeric, 1), MAX_CELLS);
}
