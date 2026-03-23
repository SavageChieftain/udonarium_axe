import { Injectable } from '@angular/core';
import { setZeroTimeout } from '@axe/class/core/system/util/zero-timeout';

type BatchTask = () => void;

@Injectable({
  providedIn: 'root',
})
export class BatchService {
  private batchTask: Map<unknown, BatchTask> = new Map();
  private batchTaskTimer: NodeJS.Timeout = null!;

  add(task: BatchTask, key: unknown = {}) {
    this.batchTask.set(key, task);
    this.startTimer();
  }

  remove(key: unknown = {}) {
    this.batchTask.delete(key);
  }

  private startTimer() {
    if (this.batchTaskTimer != null) return;
    setZeroTimeout(() => this.execBatch());
    this.batchTaskTimer = setInterval(() => {
      if (0 < this.batchTask.size) {
        this.execBatch();
      } else {
        clearInterval(this.batchTaskTimer);
        this.batchTaskTimer = null!;
      }
    }, 66);
  }

  private execBatch() {
    this.batchTask.forEach((task) => task());
    this.batchTask.clear();
  }
}
