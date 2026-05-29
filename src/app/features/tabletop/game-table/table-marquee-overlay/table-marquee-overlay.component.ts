import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { SelectionSignalService } from '@axe/application/ui/selection-signal.service';

@Component({
  selector: 'table-marquee-overlay',
  templateUrl: './table-marquee-overlay.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class TableMarqueeOverlayComponent {
  private readonly selectionSignalService = inject(SelectionSignalService);

  protected readonly state = this.selectionSignalService.marqueeState;

  protected readonly style = computed<Record<string, string> | null>(() => {
    const rect = this.state();
    if (!rect) return null;
    const x = Math.min(rect.x1, rect.x2);
    const y = Math.min(rect.y1, rect.y2);
    const width = Math.abs(rect.x2 - rect.x1);
    const height = Math.abs(rect.y2 - rect.y1);
    return {
      left: `${x}px`,
      top: `${y}px`,
      width: `${width}px`,
      height: `${height}px`,
    };
  });
}
