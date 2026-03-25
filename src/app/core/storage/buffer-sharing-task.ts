import { Logger } from '@axe/core/logger';
import { NetworkMessage, networkMessage$, networkSend } from '@axe/core/network/network-messaging';
import * as MessagePack from '@axe/core/util/message-pack';
import { ResettableTimeout } from '@axe/core/util/resettable-timeout';
import { clearZeroTimeout, setZeroTimeout } from '@axe/core/util/zero-timeout';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

interface ChankData {
  index: number;
  length: number;
  chank: Uint8Array;
}

export class BufferSharingTask<T> {
  readonly identifier: string;
  readonly sendTo: string;

  private data!: T;
  private uint8Array!: Uint8Array;
  private chanks: Uint8Array[] = [];
  private chankSize: number = 32 * 1024;
  private chankReceiveCount: number = 0;
  private sendChankTimer!: number;

  private sentChankIndex = 0;
  private bufferingChankRange: number = 4;
  private completedChankIndex = 0;

  private startTime = 0;
  private isCanceled = false;

  private onstart!: () => void;
  onprogress: (task: BufferSharingTask<T>, loded: number, total: number) => void;
  onfinish: (task: BufferSharingTask<T>, data: T) => void;
  ontimeout: (task: BufferSharingTask<T>) => void;
  oncancel: (task: BufferSharingTask<T>) => void;

  private timeoutTimer!: ResettableTimeout;
  private subscription = new Subscription();

  private constructor(identifier: string, sendTo?: string, data?: T) {
    this.identifier = identifier;
    this.sendTo = sendTo!;
    this.data = data!;
  }

  static createSendTask<T>(identifier: string, sendTo: string, data?: T): BufferSharingTask<T> {
    const task = new BufferSharingTask(identifier, sendTo, data);
    task.onstart = () => task.initializeSend();
    return task;
  }

  static createReceiveTask<T>(identifier: string): BufferSharingTask<T> {
    const task = new BufferSharingTask<T>(identifier);
    task.onstart = () => task.initializeReceive();
    return task;
  }

  start(data?: T) {
    if (!this.onstart) {
      Logger.warn('[BufferTask] タスクは再利用できません');
      return;
    }
    this.data = data!;
    this.onstart();
    this.onstart = null!;
  }

  private progress(loded: number, total: number) {
    if (this.onprogress) this.onprogress(this, loded, total);
  }

  private finish() {
    if (this.isCanceled) return;
    this.isCanceled = true;
    if (this.onfinish) this.onfinish(this, this.data);
    this.dispose();
  }

  private timeout() {
    if (this.isCanceled) return;
    this.isCanceled = true;
    if (this.ontimeout) this.ontimeout(this);
    if (this.onfinish) this.onfinish(this, this.data);
    this.dispose();
  }

  cancel() {
    if (this.isCanceled) return;
    if (this.sendTo != null) networkSend(`CANCEL_TASK_${this.identifier}`, null, this.sendTo);
    this._cancel();
  }

  private _cancel() {
    if (this.isCanceled) return;
    this.isCanceled = true;
    if (this.oncancel) this.oncancel(this);
    if (this.onfinish) this.onfinish(this, this.data);
    this.dispose();
  }

  private dispose() {
    this.subscription.unsubscribe();
    this.subscription = new Subscription();
    if (this.sendChankTimer) clearZeroTimeout(this.sendChankTimer);
    if (this.timeoutTimer) this.timeoutTimer.clear();
    this.sendChankTimer = null!;
    this.timeoutTimer = null!;
    this.onprogress = this.onfinish = this.ontimeout = this.oncancel = null!;
  }

  private initializeSend() {
    this.uint8Array = MessagePack.encode(this.data);
    const total = Math.ceil(this.uint8Array.byteLength / this.chankSize);
    this.chanks = new Array(total);
    this.subscription.add(
      networkMessage$
        .pipe(filter((msg): msg is NetworkMessage<number> => msg.eventName === `FILE_MORE_CHANK_${this.identifier}`))
        .subscribe((msg) => {
          if (this.sendTo !== msg.sendFrom) return;
          this.completedChankIndex = msg.data;
          if (this.sendChankTimer == null && this.sentChankIndex + 1 < this.chanks.length) {
            this.sendChank(this.sentChankIndex + 1);
          }
          this.resetTimeout();
        })
    );
    this.subscription.add(
      networkMessage$
        .pipe(filter((msg): msg is NetworkMessage<{ peerId: string }> => msg.eventName === 'DISCONNECT_PEER'))
        .subscribe((msg) => {
          if (msg.data.peerId !== this.sendTo) return;
          Logger.warn('[BufferTask] 送信キャンセル（Peer切断）', msg.data.peerId);
          this._cancel();
        })
    );
    this.subscription.add(
      networkMessage$.pipe(filter((msg) => msg.eventName === `CANCEL_TASK_${this.identifier}`)).subscribe((msg) => {
        Logger.warn('[BufferTask] 送信キャンセル', msg.sendFrom);
        this._cancel();
      })
    );

    this.sentChankIndex = this.completedChankIndex = 0;
    this.startTime = performance.now();
    setZeroTimeout(() => this.sendChank(0));
  }

  private sendChank(index: number) {
    const chank = this.uint8Array.slice(index * this.chankSize, (index + 1) * this.chankSize);
    const data = { index: index, length: this.chanks.length, chank: chank };
    networkSend(`FILE_SEND_CHANK_${this.identifier}`, data, this.sendTo);
    this.sentChankIndex = index;
    this.sendChankTimer = null!;
    if (this.chanks.length <= index + 1) {
      this.outputTransferRate(this.uint8Array.byteLength);
      setZeroTimeout(() => this.finish());
    } else if (this.completedChankIndex + this.bufferingChankRange <= index) {
      this.resetTimeout();
    } else {
      this.sendChankTimer = setZeroTimeout(() => {
        this.sendChank(this.sentChankIndex + 1);
      });
    }
  }

  private initializeReceive() {
    this.resetTimeout();
    this.startTime = performance.now();
    this.chankReceiveCount = 0;

    this.subscription.add(
      networkMessage$
        .pipe(filter((msg): msg is NetworkMessage<ChankData> => msg.eventName === `FILE_SEND_CHANK_${this.identifier}`))
        .subscribe((msg) => {
          if (this.chanks.length < 1) this.chanks = new Array(msg.data.length);

          if (this.chanks[msg.data.index] != null) {
            return;
          }
          this.chankReceiveCount++;
          this.chanks[msg.data.index] = msg.data.chank;
          this.progress(msg.data.index, msg.data.length);
          if (this.chanks.length <= this.chankReceiveCount) {
            this.finishReceive();
          } else {
            this.resetTimeout();
            networkSend(`FILE_MORE_CHANK_${this.identifier}`, msg.data.index, msg.sendFrom);
          }
        })
    );
    this.subscription.add(
      networkMessage$
        .pipe(filter((msg): msg is NetworkMessage<{ peerId: string }> => msg.eventName === 'DISCONNECT_PEER'))
        .subscribe((msg) => {
          if (msg.data.peerId !== this.sendTo) return;
          Logger.warn('[BufferTask] 受信キャンセル（Peer切断）', msg.data.peerId);
          this._cancel();
        })
    );
    this.subscription.add(
      networkMessage$.pipe(filter((msg) => msg.eventName === `CANCEL_TASK_${this.identifier}`)).subscribe((msg) => {
        Logger.warn('[BufferTask] 受信キャンセル', msg.sendFrom);
        this._cancel();
      })
    );
  }

  private finishReceive() {
    let sumLength = 0;
    for (const chank of this.chanks) {
      sumLength += chank.byteLength;
    }

    this.outputTransferRate(sumLength);
    const uint8Array = new Uint8Array(sumLength);
    let pos = 0;

    for (const chank of this.chanks) {
      uint8Array.set(chank, pos);
      pos += chank.byteLength;
    }

    this.data = MessagePack.decode(uint8Array) as T;
    this.finish();
  }

  private resetTimeout() {
    if (this.timeoutTimer == null) this.timeoutTimer = new ResettableTimeout(() => this.timeout(), 10 * 1000);
    this.timeoutTimer.reset();
  }

  private outputTransferRate(byteLength: number) {
    const time = performance.now() - this.startTime;
    const rate = byteLength / 1024 / 1024 / (time / 1000);
    Logger.debug(
      `[BufferTask] ${(byteLength / 1024).toFixed(2)}KB ${(time / 1000).toFixed(2)}秒 転送速度: ${rate.toFixed(2)}MB/s`
    );
  }
}
