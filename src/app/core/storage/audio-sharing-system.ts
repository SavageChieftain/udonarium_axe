import { Logger } from '@axe/core/logging/logger';
import { Network } from '@axe/core/network/network';
import { localDispatch, NetworkMessage, networkMessage$, networkSend } from '@axe/core/network/network-messaging';
import { AudioFile, AudioFileContext, AudioState } from '@axe/core/storage/audio-file';
import { AudioStorage, CatalogItem } from '@axe/core/storage/audio-storage';
import { BufferSharingTask } from '@axe/core/storage/buffer-sharing-task';
import * as FileReaderUtil from '@axe/core/storage/file-reader-util';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

export class AudioSharingSystem {
  private static _instance: AudioSharingSystem;
  static get instance(): AudioSharingSystem {
    if (!AudioSharingSystem._instance) AudioSharingSystem._instance = new AudioSharingSystem();
    return AudioSharingSystem._instance;
  }

  private sendTaskMap: Map<string, BufferSharingTask<AudioFileContext>> = new Map();
  private receiveTaskMap: Map<string, BufferSharingTask<AudioFileContext>> = new Map();
  private maxSendTask: number = 2;
  private maxReceiveTask: number = 4;
  private subscription = new Subscription();

  private constructor() {}

  initialize() {
    this.subscription.unsubscribe();
    this.subscription = new Subscription();

    this.subscription.add(
      networkMessage$
        .pipe(filter((msg): msg is NetworkMessage<{ peerId: string }> => msg.eventName === 'CONNECT_PEER'))
        .subscribe((msg) => {
          if (!msg.isSendFromSelf) return;
          AudioStorage.instance.synchronize();
        })
    );

    this.subscription.add(
      networkMessage$
        .pipe(filter((msg): msg is NetworkMessage<CatalogItem[]> => msg.eventName === 'SYNCHRONIZE_AUDIO_LIST'))
        .subscribe((msg) => {
          if (msg.isSendFromSelf) return;

          const otherCatalog: CatalogItem[] = msg.data;
          const request: CatalogItem[] = [];
          for (const item of otherCatalog) {
            let audio: AudioFile = AudioStorage.instance.get(item.identifier);
            if (audio === null) {
              audio = AudioFile.createEmpty(item.identifier);
              AudioStorage.instance.add(audio);
            }
            if (audio.state < AudioState.COMPLETE && !this.receiveTaskMap.has(item.identifier)) {
              request.push({ identifier: item.identifier, state: audio.state });
            }
          }

          if (
            request.length < 1 &&
            !this.hasActiveTask() &&
            otherCatalog.length < AudioStorage.instance.getCatalog().length
          ) {
            AudioStorage.instance.synchronize(msg.sendFrom);
          }

          if (request.length < 1 || this.isLimitReceiveTask()) {
            return;
          }
          const index = Math.floor(Math.random() * request.length);
          this.request([request[index]], msg.sendFrom);
        })
    );

    this.subscription.add(
      networkMessage$
        .pipe(
          filter(
            (msg): msg is NetworkMessage<{ identifiers: CatalogItem[]; receiver: string; candidatePeers: string[] }> =>
              msg.eventName === 'REQUEST_AUDIO_RESOURE'
          )
        )
        .subscribe((msg) => {
          if (msg.isSendFromSelf) return;

          const request: CatalogItem[] = msg.data.identifiers;
          const randomRequest: CatalogItem[] = request.filter((item) => {
            const audio: AudioFile = AudioStorage.instance.get(item.identifier);
            return audio && item.state < audio.state;
          });

          if (!this.isLimitSendTask() && 0 < randomRequest.length && !this.existsSendTask(msg.data.receiver)) {
            const index = Math.floor(Math.random() * randomRequest.length);
            const item: { identifier: string; state: number } = randomRequest[index];
            const audio: AudioFile = AudioStorage.instance.get(item.identifier);
            this.startSendTask(audio, msg.data.receiver);
          } else {
            // 中継
            const candidatePeers: string[] = msg.data.candidatePeers;
            const index = candidatePeers.indexOf(Network.peerId);
            if (-1 < index) candidatePeers.splice(index, 1);

            for (const peerId of candidatePeers) {
              networkSend(msg.eventName, msg.data, peerId);
              return;
            }
          }
        })
    );

    this.subscription.add(
      networkMessage$
        .pipe(filter((msg): msg is NetworkMessage<AudioFileContext[]> => msg.eventName === 'UPDATE_AUDIO_RESOURE'))
        .subscribe((msg) => {
          const updateAudios: AudioFileContext[] = msg.data;
          for (const context of updateAudios) {
            if (context.blob) context.blob = new Blob([context.blob], { type: context.type });
            AudioStorage.instance.add(context);
          }
        })
    );

    this.subscription.add(
      networkMessage$
        .pipe(
          filter(
            (msg): msg is NetworkMessage<{ fileIdentifier: string }> => msg.eventName === 'START_AUDIO_TRANSMISSION'
          )
        )
        .subscribe((msg) => {
          const identifier: string = msg.data.fileIdentifier;
          const audio: AudioFile = AudioStorage.instance.get(identifier);
          if (this.receiveTaskMap.has(identifier) || audio?.isReady) {
            Logger.warn('[AudioSync] タスクキャンセル', identifier);
            networkSend(`CANCEL_TASK_${identifier}`, null, msg.sendFrom);
          } else {
            this.startReceiveTask(identifier);
          }
        })
    );
  }

  private destroy() {
    this.subscription.unsubscribe();
    this.subscription = new Subscription();
  }

  private async startSendTask(audio: AudioFile, sendTo: string) {
    const task = BufferSharingTask.createSendTask<AudioFileContext>(audio.identifier, sendTo);
    this.sendTaskMap.set(audio.identifier, task);

    networkSend('START_AUDIO_TRANSMISSION', { fileIdentifier: audio.identifier }, sendTo);

    const context: AudioFileContext = {
      identifier: audio.identifier,
      name: audio.name,
      blob: null,
      type: '',
      url: '',
    };

    if (audio.state === AudioState.URL) {
      context.url = audio.url;
    } else if (audio.blob) {
      const buf = await FileReaderUtil.readAsArrayBufferAsync(audio.blob);
      context.blob = new Uint8Array(buf) as unknown as Blob;
      context.type = audio.blob.type;
    }

    task.onfinish = () => {
      this.stopSendTask(task.identifier);
      AudioStorage.instance.synchronize();
    };

    task.start(context);
  }

  private startReceiveTask(identifier: string) {
    const audio: AudioFile = AudioStorage.instance.get(identifier);
    const task = BufferSharingTask.createReceiveTask<AudioFileContext>(identifier);
    this.receiveTaskMap.set(identifier, task);

    task.onprogress = (task, loded, total) => {
      const context = audio.toContext();
      context.name = `${((loded * 100) / total).toFixed(1)}%`;
      audio.apply(context);
    };
    task.onfinish = (task, data) => {
      this.stopReceiveTask(task.identifier);
      if (data) localDispatch('UPDATE_AUDIO_RESOURE', [data]);
      AudioStorage.instance.synchronize();
    };

    task.start();
  }

  private stopSendTask(identifier: string) {
    this.sendTaskMap.get(identifier)?.cancel();
    this.sendTaskMap.delete(identifier);
  }

  private stopReceiveTask(identifier: string) {
    this.receiveTaskMap.get(identifier)?.cancel();
    this.receiveTaskMap.delete(identifier);
  }

  private request(request: CatalogItem[], peerId: string) {
    const peerIds = Network.peerIds;
    peerIds.splice(peerIds.indexOf(Network.peerId), 1);
    networkSend(
      'REQUEST_AUDIO_RESOURE',
      {
        identifiers: request,
        receiver: Network.peerId,
        candidatePeers: peerIds,
      },
      peerId
    );
  }

  private hasActiveTask(): boolean {
    return 0 < this.sendTaskMap.size || 0 < this.receiveTaskMap.size;
  }

  private isLimitSendTask(): boolean {
    return this.maxSendTask <= this.sendTaskMap.size;
  }

  private isLimitReceiveTask(): boolean {
    return this.maxReceiveTask <= this.receiveTaskMap.size;
  }

  private existsSendTask(peerId: string): boolean {
    return [...this.sendTaskMap.values()].some((task) => task?.sendTo === peerId);
  }
}
