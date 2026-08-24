import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ImageService } from '@axe/application/storage/image.service';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { ModalService } from '@axe/application/ui/modal.service';
import type { CutInTrackName } from '@axe/domain/media/cut-in-keyframe';
import { CUT_IN_TEXT_ALIGNS, CutInLayer, type CutInTextAlign, isCutInTextAlign } from '@axe/domain/media/cut-in-layer';
import { hasKeyAt, setValueAt, toggleKeyAt, valueAt } from '@axe/features/media/cut-in-editor/cut-in-keyframe-edit';
import { FileSelecterComponent } from '@axe/ui/components/file-selecter/file-selecter.component';
import { SafePipe } from '@axe/ui/pipes/safe.pipe';
import { TranslocoModule } from '@jsverse/transloco';

/**
 * What the selected layer is told.
 *
 * Writing straight to the layer is what the rest of this tool does with a synchronised
 * object. Every write is followed by `commit`, which is what the editor's undo stack
 * listens for, so a change never lands without something to take it back with.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'cut-in-layer-properties',
  templateUrl: './cut-in-layer-properties.component.html',
  host: { class: 'block' },
  imports: [FormsModule, SafePipe, TranslocoModule],
})
export class CutInLayerPropertiesComponent {
  private readonly modalService = inject(ModalService);
  private readonly imageService = inject(ImageService);
  private readonly objectChange = inject(ObjectChangeService);

  readonly layer = input<CutInLayer | null>(null);
  readonly isEditable = input(false);
  /** Where the scrubber stands. A value written lands on the key there, if one does. */
  readonly playheadMs = input(0);

  readonly commit = output<void>();

  readonly textAligns = CUT_IN_TEXT_ALIGNS;

  readonly imageUrl = computed(() => {
    const layer = this.layer();
    if (!layer) return '';
    this.objectChange.fileVersion();
    this.objectChange.versionOf(layer.identifier)();
    return this.imageService.getEmptyOr(layer.imageIdentifier).url;
  });

  private get target(): CutInLayer | null {
    return this.isEditable() ? this.layer() : null;
  }

  private write(change: (layer: CutInLayer) => void): void {
    const layer = this.target;
    if (!layer) return;
    change(layer);
    this.commit.emit();
  }

  get name(): string {
    return this.layer()?.name ?? '';
  }
  set name(name: string) {
    this.write((layer) => (layer.name = name));
  }

  get x(): number {
    return Math.round(this.tracked('x'));
  }
  set x(x: number) {
    this.writeTracked('x', Number(x) || 0);
  }

  get y(): number {
    return Math.round(this.tracked('y'));
  }
  set y(y: number) {
    this.writeTracked('y', Number(y) || 0);
  }

  get width(): number {
    return Math.round(this.layer()?.width ?? 0);
  }
  set width(width: number) {
    this.write((layer) => (layer.width = Math.max(1, Number(width) || 1)));
  }

  get height(): number {
    return Math.round(this.layer()?.height ?? 0);
  }
  set height(height: number) {
    this.write((layer) => (layer.height = Math.max(1, Number(height) || 1)));
  }

  /** One figure for both directions. The two are kept apart only so a track may move them apart. */
  get scalePercent(): number {
    return Math.round(this.tracked('scaleX', 1) * 100);
  }
  set scalePercent(percent: number) {
    const scale = Math.max(0.01, (Number(percent) || 100) / 100);
    this.write((layer) => {
      setValueAt(layer, 'scaleX', this.playheadMs(), scale);
      setValueAt(layer, 'scaleY', this.playheadMs(), scale);
    });
  }

  get rotation(): number {
    return Math.round(this.tracked('rotation'));
  }
  set rotation(rotation: number) {
    this.writeTracked('rotation', Number(rotation) || 0);
  }

  get opacityPercent(): number {
    return Math.round(this.tracked('opacity', 1) * 100);
  }
  set opacityPercent(percent: number) {
    this.writeTracked('opacity', Math.min(1, Math.max(0, (Number(percent) || 0) / 100)));
  }

  get blur(): number {
    return Math.round(this.tracked('blur'));
  }
  set blur(blur: number) {
    this.writeTracked('blur', Math.max(0, Number(blur) || 0));
  }

  /** Whether a key stands at the scrubber for a track, which the diamond shows. */
  keyed(track: CutInTrackName): boolean {
    const layer = this.layer();
    if (!layer) return false;
    this.objectChange.versionOf(layer.identifier)();
    return hasKeyAt(layer, track, this.playheadMs());
  }

  toggleKey(track: CutInTrackName): void {
    this.write((layer) => {
      toggleKeyAt(layer, track, this.playheadMs());
      if (track === 'scaleX') toggleKeyAt(layer, 'scaleY', this.playheadMs());
    });
  }

  private tracked(track: CutInTrackName, fallback = 0): number {
    const layer = this.layer();
    if (!layer) return fallback;
    this.objectChange.versionOf(layer.identifier)();
    return valueAt(layer, track, this.playheadMs());
  }

  private writeTracked(track: CutInTrackName, value: number): void {
    this.write((layer) => setValueAt(layer, track, this.playheadMs(), value));
  }

  get startMs(): number {
    return Math.round(this.layer()?.startMs ?? 0);
  }
  set startMs(startMs: number) {
    this.write((layer) => (layer.startMs = Math.max(0, Number(startMs) || 0)));
  }

  get endMs(): number {
    return Math.round(this.layer()?.endMs ?? 0);
  }
  set endMs(endMs: number) {
    this.write((layer) => (layer.endMs = Math.max(0, Number(endMs) || 0)));
  }

  get text(): string {
    return this.layer()?.text ?? '';
  }
  set text(text: string) {
    this.write((layer) => (layer.text = text));
  }

  get fontSizePx(): number {
    return Math.round(this.layer()?.fontSizePx ?? 32);
  }
  set fontSizePx(fontSizePx: number) {
    this.write((layer) => (layer.fontSizePx = Math.max(1, Number(fontSizePx) || 1)));
  }

  get fontWeight(): number {
    return Math.round(this.layer()?.fontWeight ?? 700);
  }
  set fontWeight(fontWeight: number) {
    this.write((layer) => (layer.fontWeight = Math.min(900, Math.max(100, Number(fontWeight) || 400))));
  }

  get fontFamily(): string {
    return this.layer()?.fontFamily ?? '';
  }
  set fontFamily(fontFamily: string) {
    this.write((layer) => (layer.fontFamily = fontFamily));
  }

  get color(): string {
    return this.layer()?.color ?? '#ffffff';
  }
  set color(color: string) {
    this.write((layer) => (layer.color = color));
  }

  get textAlign(): CutInTextAlign {
    return this.layer()?.textAlign ?? 'center';
  }
  set textAlign(textAlign: CutInTextAlign) {
    this.write((layer) => (layer.textAlign = isCutInTextAlign(textAlign) ? textAlign : 'center'));
  }

  get strokeColor(): string {
    return this.layer()?.strokeColor || '#000000';
  }
  set strokeColor(strokeColor: string) {
    this.write((layer) => (layer.strokeColor = strokeColor));
  }

  get strokeWidthPx(): number {
    return Math.round(this.layer()?.strokeWidthPx ?? 0);
  }
  set strokeWidthPx(strokeWidthPx: number) {
    this.write((layer) => (layer.strokeWidthPx = Math.max(0, Number(strokeWidthPx) || 0)));
  }

  get fillFrom(): string {
    return this.layer()?.fillFrom ?? '#000000';
  }
  set fillFrom(fillFrom: string) {
    this.write((layer) => (layer.fillFrom = fillFrom));
  }

  get fillTo(): string {
    return this.layer()?.fillTo || '#000000';
  }
  set fillTo(fillTo: string) {
    this.write((layer) => (layer.fillTo = fillTo));
  }

  /** Whether the band shades from one colour into another, rather than being one flat colour. */
  get fillGradient(): boolean {
    return (this.layer()?.fillTo.length ?? 0) > 0;
  }
  set fillGradient(gradient: boolean) {
    this.write((layer) => (layer.fillTo = gradient ? layer.fillTo || layer.fillFrom : ''));
  }

  get fillAngleDeg(): number {
    return Math.round(this.layer()?.fillAngleDeg ?? 90);
  }
  set fillAngleDeg(fillAngleDeg: number) {
    this.write((layer) => (layer.fillAngleDeg = Number(fillAngleDeg) || 0));
  }

  chooseImage(): void {
    const layer = this.target;
    if (!layer) return;

    this.modalService.open<string>(FileSelecterComponent, { isAllowedEmpty: true }).then((identifier) => {
      if (identifier === undefined || identifier === null) return;
      layer.imageIdentifier = identifier;
      this.commit.emit();
    });
  }
}
