import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ImageService } from '@axe/application/storage/image.service';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { ModalService } from '@axe/application/ui/modal.service';
import { CutInLayer } from '@axe/domain/media/cut-in-layer';
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

  readonly commit = output<void>();

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
    return Math.round(this.layer()?.x ?? 0);
  }
  set x(x: number) {
    this.write((layer) => (layer.x = Number(x) || 0));
  }

  get y(): number {
    return Math.round(this.layer()?.y ?? 0);
  }
  set y(y: number) {
    this.write((layer) => (layer.y = Number(y) || 0));
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
    return Math.round((this.layer()?.scaleX ?? 1) * 100);
  }
  set scalePercent(percent: number) {
    const scale = Math.max(0.01, (Number(percent) || 100) / 100);
    this.write((layer) => {
      layer.scaleX = scale;
      layer.scaleY = scale;
    });
  }

  get rotation(): number {
    return Math.round(this.layer()?.rotation ?? 0);
  }
  set rotation(rotation: number) {
    this.write((layer) => (layer.rotation = Number(rotation) || 0));
  }

  get opacityPercent(): number {
    return Math.round((this.layer()?.opacity ?? 1) * 100);
  }
  set opacityPercent(percent: number) {
    const opacity = Math.min(1, Math.max(0, (Number(percent) || 0) / 100));
    this.write((layer) => (layer.opacity = opacity));
  }

  get blur(): number {
    return Math.round(this.layer()?.blur ?? 0);
  }
  set blur(blur: number) {
    this.write((layer) => (layer.blur = Math.max(0, Number(blur) || 0)));
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
