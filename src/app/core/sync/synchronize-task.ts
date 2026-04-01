import { NetworkMessage, networkMessage$, networkSend } from '@axe/core/network/network-messaging';
import { ResettableTimeout } from '@axe/core/util/resettable-timeout';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

type PeerId = string;
type ObjectIdentifier = string;

export interface SynchronizeRequest {
  identifier: string;
  version: number;
  holderIds: string[];
  ttl: number;
}

export class SynchronizeTask {
  private static subscription: Subscription | null = null;
  private static tasksMap: Map<ObjectIdentifier, SynchronizeTask[]> = new Map();

  onsynchronize: (task: SynchronizeTask, identifier: string) => void;
  onfinish: (task: SynchronizeTask) => void;
  ontimeout: (task: SynchronizeTask, remainedRequests: SynchronizeRequest[]) => void;

  private requestMap: Map<ObjectIdentifier, SynchronizeRequest> = new Map();
  private timeoutTimer!: ResettableTimeout;

  private constructor(readonly peerId: PeerId) {}

  static create(peerId: PeerId, requests: SynchronizeRequest[]): SynchronizeTask {
    if (SynchronizeTask.tasksMap.size < 1) {
      const sub = new Subscription();
      sub.add(
        networkMessage$
          .pipe(filter((msg): msg is NetworkMessage<{ peerId: string }> => msg.eventName === 'DISCONNECT_PEER'))
          .subscribe((msg) => {
            SynchronizeTask.onDisconnect(msg.data.peerId);
          })
      );
      sub.add(
        networkMessage$
          .pipe(filter((msg): msg is NetworkMessage<{ identifier: string }> => msg.eventName === 'UPDATE_GAME_OBJECT'))
          .subscribe((msg) => {
            if (msg.isSendFromSelf) return;
            SynchronizeTask.onUpdate(msg.data.identifier);
          })
      );
      sub.add(
        networkMessage$
          .pipe(filter((msg): msg is NetworkMessage<{ identifier: string }> => msg.eventName === 'DELETE_GAME_OBJECT'))
          .subscribe((msg) => {
            if (msg.isSendFromSelf) return;
            SynchronizeTask.onUpdate(msg.data.identifier);
          })
      );
      SynchronizeTask.subscription = sub;
    }
    const task = new SynchronizeTask(peerId);
    task.initialize(requests);
    return task;
  }

  private cancel() {
    if (this.timeoutTimer) this.timeoutTimer.clear();
    this.timeoutTimer = null!;
    this.onsynchronize = this.onfinish = this.ontimeout = null!;

    for (const request of this.requestMap.values()) {
      this.deleteTasksMap(request.identifier);
    }

    this.requestMap.clear();
  }

  private initialize(requests: SynchronizeRequest[]) {
    for (const request of requests) {
      request.ttl--;
      this.requestMap.set(request.identifier, request);
      const tasks: SynchronizeTask[] = SynchronizeTask.tasksMap.get(request.identifier) ?? [];
      tasks.push(this);
      SynchronizeTask.tasksMap.set(request.identifier, tasks);
      const sendTo = this.peerId != null && request.holderIds.includes(this.peerId) ? this.peerId : null!;
      networkSend('REQUEST_GAME_OBJECT', request.identifier, sendTo);
    }

    if (this.requestMap.size < 1) {
      setTimeout(() => this.finish());
      return;
    }

    this.resetTimeout();
  }

  private finish() {
    if (this.onfinish) this.onfinish(this);
    this.cancel();
  }

  private timeout() {
    if (this.ontimeout) {
      const remained: SynchronizeRequest[] = [];
      for (const request of this.requestMap.values()) {
        if (0 <= request.ttl) remained.push(request);
      }
      this.ontimeout(this, remained);
    }
    this.finish();
  }

  private static onDisconnect(peerId: PeerId) {
    for (const tasks of SynchronizeTask.tasksMap.values()) {
      for (const task of [...tasks]) {
        if (task.peerId === peerId) task.timeout();
      }
    }
    if (SynchronizeTask.tasksMap.size < 1) {
      SynchronizeTask.subscription?.unsubscribe();
      SynchronizeTask.subscription = null;
    }
  }

  private static onUpdate(identifier: ObjectIdentifier) {
    if (!SynchronizeTask.tasksMap.has(identifier)) return;
    const tasks = SynchronizeTask.tasksMap.get(identifier)!;
    for (const task of [...tasks]) {
      task.onUpdate(identifier);
    }
    if (SynchronizeTask.tasksMap.size < 1) {
      SynchronizeTask.subscription?.unsubscribe();
      SynchronizeTask.subscription = null;
    }
  }

  private onUpdate(identifier: ObjectIdentifier) {
    this.requestMap.delete(identifier);
    if (this.onsynchronize) this.onsynchronize(this, identifier);
    if (this.requestMap.size < 1) {
      this.finish();
    } else {
      this.resetTimeout();
    }
  }

  private deleteTasksMap(identifier: ObjectIdentifier) {
    const tasks = SynchronizeTask.tasksMap.get(identifier)!;
    const index = tasks.indexOf(this);
    if (-1 < index) tasks.splice(index, 1);
    if (tasks.length < 1) SynchronizeTask.tasksMap.delete(identifier);
  }

  private resetTimeout() {
    if (this.timeoutTimer == null) this.timeoutTimer = new ResettableTimeout(() => this.timeout(), 30 * 1000);
    this.timeoutTimer.reset();
  }
}
