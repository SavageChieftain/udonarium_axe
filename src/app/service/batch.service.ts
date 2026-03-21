import { Injectable, NgZone, inject } from '@angular/core';
import { setZeroTimeout } from '@axe/core/system/util/zero-timeout';

type BatchTask = () => void;

@Injectable({
  providedIn: 'root',
})
export class BatchService {
  private ngZone = inject(NgZone);

  private batchTask: Map<unknown, BatchTask> = new Map();
  private batchTaskTimer: NodeJS.Timeout = null!;
  private needsChangeDetection: boolean = false;

  add(task: BatchTask, key: unknown = {}) {
    this.batchTask.set(key, task);
    this.startTimer();
  }

  remove(key: unknown = {}) {
    this.batchTask.delete(key);
  }

  requireChangeDetection() {
    this.needsChangeDetection = true;
    this.startTimer();
  }

  private startTimer() {
    if (this.batchTaskTimer != null) return;
    this.ngZone.runOutsideAngular(() => {
      setZeroTimeout(() => this.execBatch());
      this.batchTaskTimer = setInterval(() => {
        if (0 < this.batchTask.size) {
          this.execBatch();
        } else {
          clearInterval(this.batchTaskTimer);
          this.batchTaskTimer = null!;
        }
      }, 66);
    });
  }

  private execBatch() {
    this.batchTask.forEach((task) => task());
    this.batchTask.clear();
    if (this.needsChangeDetection) {
      this.needsChangeDetection = false;
      this.ngZone.run(() => {});
    }
  }
}
