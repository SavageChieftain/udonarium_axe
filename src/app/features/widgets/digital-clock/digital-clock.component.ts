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

  private readonly clockRef = viewChild<ElementRef<HTMLElement>>('clock');
  private savedLeft: string | null = null;
  private savedTop: string | null = null;

  constructor() {
    const timer = setInterval(() => this.parts.set(formatClockParts(new Date())), 1000);
    this.destroyRef.onDestroy(() => clearInterval(timer));

    effect((onCleanup) => {
      const el = this.clockRef()?.nativeElement;
      if (!el) return;
      if (this.savedLeft !== null && this.savedTop !== null) {
        el.style.left = this.savedLeft;
        el.style.top = this.savedTop;
      } else {
        el.style.left = `${Math.max(8, window.innerWidth - el.offsetWidth - 8)}px`;
        el.style.top = '8px';
      }
      onCleanup(() => {
        this.savedLeft = el.style.left;
        this.savedTop = el.style.top;
      });
    });
  }

  protected close(): void {
    this.widgets.clock.set(false);
  }
}
