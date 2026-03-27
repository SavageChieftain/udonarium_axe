import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  OnDestroy,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Network } from '@axe/core/index';
import { ObjectChangeService } from '@axe/shared/sync/object-change.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'network-indicator',
  templateUrl: './network-indicator.component.html',
  styleUrls: ['./network-indicator.component.css'],
})
export class NetworkIndicatorComponent implements AfterViewInit, OnDestroy {
  private destroyRef = inject(DestroyRef);
  private elementRef = inject(ElementRef);
  private objectChange = inject(ObjectChangeService);

  private timer: NodeJS.Timeout = null!;
  private needRepeat = false;

  ngAfterViewInit() {
    const repeatFunc = () => {
      if (this.needRepeat) {
        this.timer = setTimeout(repeatFunc, 650);
        this.needRepeat = false;
      } else {
        this.timer = null!;
        this.elementRef.nativeElement.style.display = 'none';
      }
    };

    this.objectChange.eventActivity$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.needRepeat || Network.bandwidthUsage < 3 * 1024) return;
      if (this.timer === null) {
        this.elementRef.nativeElement.style.display = 'block';
        this.timer = setTimeout(repeatFunc, 650);
      } else {
        this.needRepeat = true;
      }
    });
  }

  ngOnDestroy() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null!;
    }
  }
}
