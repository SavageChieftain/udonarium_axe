import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, inject, OnDestroy } from '@angular/core';
import { EventSystem, Network } from '@axe/core/index';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'network-indicator',
  templateUrl: './network-indicator.component.html',
  styleUrls: ['./network-indicator.component.css'],
})
export class NetworkIndicatorComponent implements AfterViewInit, OnDestroy {
  private elementRef = inject(ElementRef);

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

    EventSystem.register(this).on('*', (_event) => {
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
    EventSystem.unregister(this);
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null!;
    }
  }
}
