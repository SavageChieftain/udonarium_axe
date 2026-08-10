import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { WidgetLayoutService } from '@axe/application/ui/widget-layout.service';
import { placeWidget, rememberWidget, WIDGET_CLOCK } from '@axe/application/ui/widget-place';
import { WidgetVisibilityService } from '@axe/application/ui/widget-visibility.service';
import { CLOCK_GHOST_PATTERN, formatClockParts } from '@axe/features/widgets/digital-clock/clock-format';
import { DraggableDirective } from '@axe/ui/directives/draggable.directive';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-digital-clock',
  templateUrl: './digital-clock.component.html',
  imports: [DraggableDirective, TranslocoModule],
})
export class DigitalClockComponent {
  protected readonly widgets = inject(WidgetVisibilityService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly ghost = CLOCK_GHOST_PATTERN;
  protected readonly parts = signal(formatClockParts(new Date()));

  private readonly layout = inject(WidgetLayoutService);
  private readonly clockRef = viewChild<ElementRef<HTMLElement>>('clock');

  constructor() {
    const timer = setInterval(() => this.parts.set(formatClockParts(new Date())), 1000);
    this.destroyRef.onDestroy(() => clearInterval(timer));

    effect((onCleanup) => {
      const el = this.clockRef()?.nativeElement;
      if (!el) return;
      placeWidget(this.layout, WIDGET_CLOCK, el, () => ({
        left: Math.max(8, window.innerWidth - el.offsetWidth - 8),
        top: 8,
      }));
      onCleanup(() => rememberWidget(this.layout, WIDGET_CLOCK, el));
    });
  }

  protected rememberSpot(): void {
    const el = this.clockRef()?.nativeElement;
    if (el) rememberWidget(this.layout, WIDGET_CLOCK, el);
  }

  protected close(): void {
    this.widgets.clock.set(false);
  }
}
