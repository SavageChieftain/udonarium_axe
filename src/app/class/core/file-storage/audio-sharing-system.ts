import { Logger } from '@axe/core/logger';
import { EventSystem, Network } from '@axe/core/system';

import { AudioFile, AudioFileContext, AudioState } from './audio-file';
import { AudioStorage, CatalogItem } from './audio-storage';
import { BufferSharingTask } from './buffer-sharing-task';
import * as FileReaderUtil from './file-reader-util';

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

  private constructor() {}

  initialize() {
    this.destroy();
    EventSystem.register(this)
      .on('CONNECT_PEER', -1, (event) => {
        if (!event.isSendFromSelf) return;
        AudioStorage.instance.synchronize();
      })
      .on<CatalogItem[]>('SYNCHRONIZE_AUDIO_LIST', (event) => {
        if (event.isSendFromSelf) return;

        const otherCatalog: CatalogItem[] = event.data;
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

        // Peer切断時などのエッジケースに対応する
        if (
          request.length < 1 &&
          !this.hasActiveTask() &&
          otherCatalog.length < AudioStorage.instance.getCatalog().length
        ) {
          AudioStorage.instance.synchronize(event.sendFrom);
        }

        if (request.length < 1 || this.isLimitReceiveTask()) {
          return;
        }
        const index = Math.floor(Math.random() * request.length);
        this.request([request[index]], event.sendFrom);
      })
      .on<{ identifiers: CatalogItem[]; receiver: string; candidatePeers: string[] }>(
        'REQUEST_AUDIO_RESOURE',
        (event) => {
          if (event.isSendFromSelf) return;

          const request: CatalogItem[] = event.data.identifiers;
          const randomRequest: CatalogItem[] = request.filter((item) => {
            const audio: AudioFile = AudioStorage.instance.get(item.identifier);
            return audio && item.state < audio.state;
          });

          if (!this.isLimitSendTask() && 0 < randomRequest.length && !this.existsSendTask(event.data.receiver)) {
            const index = Math.floor(Math.random() * randomRequest.length);
            const item: { identifier: string; state: number } = randomRequest[index];
            const audio: AudioFile = AudioStorage.instance.get(item.identifier);
            this.startSendTask(audio, event.data.receiver);
          } else {
            // 中継
            const candidatePeers: string[] = event.data.candidatePeers;
            const index = candidatePeers.indexOf(Network.peerId);
            if (-1 < index) candidatePeers.splice(index, 1);

            for (const peerId of candidatePeers) {
              EventSystem.call(event, peerId);
              return;
            }
          }
        }
      )
      .on<AudioFileContext[]>('UPDATE_AUDIO_RESOURE', 1000, (event) => {
        const updateAudios: AudioFileContext[] = event.data;
        for (const context of updateAudios) {
          if (context.blob) context.blob = new Blob([context.blob], { type: context.type });
          AudioStorage.instance.add(context);
        }
      })
      .on('START_AUDIO_TRANSMISSION', (event) => {
        const identifier: string = event.data.fileIdentifier;
        const audio: AudioFile = AudioStorage.instance.get(identifier);
        if (this.receiveTaskMap.has(identifier) || audio?.isReady) {
          Logger.warn('[AudioSync] タスクキャンセル', identifier);
          EventSystem.call('CANCEL_TASK_' + identifier, null, event.sendFrom);
        } else {
          this.startReceiveTask(identifier);
        }
      });
  }

  private destroy() {
    EventSystem.unregister(this);
  }

  private async startSendTask(audio: AudioFile, sendTo: string) {
    const task = BufferSharingTask.createSendTask<AudioFileContext>(audio.identifier, sendTo);
    this.sendTaskMap.set(audio.identifier, task);

    EventSystem.call('START_AUDIO_TRANSMISSION', { fileIdentifier: audio.identifier }, sendTo);

    const context: AudioFileContext = {
      identifier: audio.identifier,
      name: audio.name,
      blob: null,
      type: '',
      url: '',
    };

    if (audio.state === AudioState.URL) {
      context.url = audio.url;
    } else {
      context.blob = (await FileReaderUtil.readAsArrayBufferAsync(audio.blob!)) as unknown as Blob;
      context.type = audio.blob!.type;
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
      context.name = ((loded * 100) / total).toFixed(1) + '%';
      audio.apply(context);
    };
    task.onfinish = (task, data) => {
      this.stopReceiveTask(task.identifier);
      if (data) EventSystem.trigger('UPDATE_AUDIO_RESOURE', [data]);
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
    EventSystem.call(
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
