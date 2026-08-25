import { ChangeDetectionStrategy, Component, ElementRef, input, output } from '@angular/core';
import { CutInLayer } from '@axe/domain/media/cut-in-layer';
import { TIMELINE_ROW_H_PX } from '@axe/features/media/cut-in-editor/cut-in-timeline-geometry';
import { type DropSide, RowReorder } from '@axe/ui/dragging/row-reorder';
import { TranslocoModule } from '@jsverse/transloco';

/** The layers of a scene, topmost last, with what each one is called and whether it shows. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'cut-in-layer-list',
  templateUrl: './cut-in-layer-list.component.html',
  host: { class: 'block' },
  imports: [TranslocoModule],
})
export class CutInLayerListComponent {
  readonly layers = input<readonly CutInLayer[]>([]);
  readonly selected = input<CutInLayer | null>(null);
  readonly isEditable = input(false);

  readonly selectLayer = output<CutInLayer>();
  readonly toggleHidden = output<CutInLayer>();
  readonly toggleLocked = output<CutInLayer>();
  readonly reorder = output<{ held: CutInLayer; over: CutInLayer; side: DropSide | null }>();

  /** The bands of the timeline are this tall, and these heads stand level with them. */
  protected readonly rowHeightPx = TIMELINE_ROW_H_PX;

  protected readonly dragging = new RowReorder<CutInLayer>();

  protected onDragStart(layer: CutInLayer): void {
    if (!this.isEditable()) return;
    this.dragging.begin(layer);
  }

  protected onDragOver(event: DragEvent, layer: CutInLayer, row: ElementRef<HTMLElement> | HTMLElement): void {
    if (!this.isEditable()) return;
    event.preventDefault();
    const element = row instanceof ElementRef ? row.nativeElement : row;
    const bounds = element.getBoundingClientRect();
    this.dragging.hoverHalf(layer, { top: bounds.top, height: bounds.height }, event.clientY);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    const dropped = this.dragging.release();
    if (dropped) this.reorder.emit(dropped);
  }

  protected onDragEnd(): void {
    this.dragging.cancel();
  }

  /** Topmost first, which is how a stack of layers is read. */
  protected get rows(): CutInLayer[] {
    return [...this.layers()].reverse();
  }
}
