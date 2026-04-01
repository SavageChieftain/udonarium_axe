import { Logger } from '@axe/core/logging/logger';
import { Network } from '@axe/core/network/network';
import { localDispatch, NetworkMessage, networkMessage$, networkSend } from '@axe/core/network/network-messaging';
import { BufferSharingTask } from '@axe/core/storage/buffer-sharing-task';
import * as FileReaderUtil from '@axe/core/storage/file-reader-util';
import { ImageContext, ImageFile, ImageState } from '@axe/core/storage/image-file';
import { CatalogItem, ImageStorage } from '@axe/core/storage/image-storage';
import * as MimeType from '@axe/core/storage/mime-type';
import { generateUuid } from '@axe/core/util/uuid';
import { xmlLoaded$ } from '@axe/domain/domain-events';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

export class ImageSharingSystem {
  private static _instance: ImageSharingSystem;
  static get instance(): ImageSharingSystem {
    if (!ImageSharingSystem._instance) ImageSharingSystem._instance = new ImageSharingSystem();
    return ImageSharingSystem._instance;
  }

  private sendTaskMap: Map<string, BufferSharingTask<ImageContext[]>> = new Map();
  private receiveTaskMap: Map<string, BufferSharingTask<ImageContext[]>> = new Map();
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
          ImageStorage.instance.synchronize();
        })
    );

    this.subscription.add(
      xmlLoaded$.subscribe((event) => {
        convertUrlImage(event.xmlElement);
      })
    );

    this.subscription.add(
      networkMessage$
        .pipe(filter((msg): msg is NetworkMessage<CatalogItem[]> => msg.eventName === 'SYNCHRONIZE_FILE_LIST'))
        .subscribe((msg) => {
          if (msg.isSendFromSelf) return;

          const otherCatalog: CatalogItem[] = msg.data;
          const request: CatalogItem[] = [];

          for (const item of otherCatalog) {
            let image = ImageStorage.instance.get(item.identifier);
            if (image === null) {
              image = ImageFile.createEmpty(item.identifier);
              ImageStorage.instance.add(image);
            }
            if (image.state < ImageState.COMPLETE && !this.receiveTaskMap.has(item.identifier)) {
              request.push({ identifier: item.identifier, state: image.state });
            }
          }

          if (
            request.length < 1 &&
            !this.hasActiveTask() &&
            otherCatalog.length < ImageStorage.instance.getCatalog().length
          ) {
            ImageStorage.instance.synchronize(msg.sendFrom);
          }

          if (request.length < 1 || this.isLimitReceiveTask()) return;
          this.request(request, msg.sendFrom);
        })
    );

    this.subscription.add(
      networkMessage$
        .pipe(
          filter(
            (msg): msg is NetworkMessage<{ identifiers: CatalogItem[]; receiver: string; candidatePeers: string[] }> =>
              msg.eventName === 'REQUEST_FILE_RESOURE'
          )
        )
        .subscribe((msg) => {
          if (msg.isSendFromSelf) return;
          const request: CatalogItem[] = msg.data.identifiers;
          const randomRequest: CatalogItem[] = [];

          for (const item of request) {
            const image = ImageStorage.instance.get(item.identifier);
            if (image && item.state < image.state)
              randomRequest.push({
                identifier: item.identifier,
                state: item.state,
              });
          }

          if (!this.isLimitSendTask() && 0 < randomRequest.length && !this.existsSendTask(msg.data.receiver)) {
            const updateImages: ImageContext[] = this.makeSendUpdateImages(randomRequest);
            this.startSendTask(updateImages, msg.data.receiver);
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
        .pipe(
          filter(
            (msg): msg is NetworkMessage<{ updateImages: ImageContext[] }> => msg.eventName === 'UPDATE_FILE_RESOURE'
          )
        )
        .subscribe((msg) => {
          const updateImages: ImageContext[] = msg.data.updateImages;
          for (const context of updateImages) {
            if (context.blob) context.blob = new Blob([context.blob], { type: context.type });
            if (context.thumbnail.blob)
              context.thumbnail.blob = new Blob([context.thumbnail.blob], {
                type: context.thumbnail.type,
              });
            ImageStorage.instance.add(context);
          }
        })
    );

    this.subscription.add(
      networkMessage$
        .pipe(
          filter(
            (msg): msg is NetworkMessage<{ taskIdentifier: string }> => msg.eventName === 'START_FILE_TRANSMISSION'
          )
        )
        .subscribe((msg) => {
          const identifier = msg.data.taskIdentifier;
          const image = ImageStorage.instance.get(identifier);
          if (this.receiveTaskMap.has(identifier) || (image && ImageState.COMPLETE <= image.state)) {
            Logger.warn('[ImageSync] タスクキャンセル', identifier);
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

  private async startSendTask(updateImages: ImageContext[], sendTo: string) {
    const identifier = updateImages.length === 1 ? updateImages[0].identifier : generateUuid();
    const task = BufferSharingTask.createSendTask<ImageContext[]>(identifier, sendTo);
    this.sendTaskMap.set(task.identifier, task);
    networkSend('START_FILE_TRANSMISSION', { taskIdentifier: identifier }, sendTo);

    for (const context of updateImages) {
      if (context.thumbnail.blob) {
        const buf = await FileReaderUtil.readAsArrayBufferAsync(context.thumbnail.blob);
        context.thumbnail.blob = new Uint8Array(buf) as unknown as Blob;
      } else if (context.blob) {
        const buf = await FileReaderUtil.readAsArrayBufferAsync(context.blob);
        context.blob = new Uint8Array(buf) as unknown as Blob;
      }
    }
    /* */

    task.onfinish = (task) => {
      this.stopSendTask(task.identifier);
      ImageStorage.instance.synchronize();
    };

    task.start(updateImages);
  }

  private startReceiveTask(identifier: string) {
    const task = BufferSharingTask.createReceiveTask<ImageContext[]>(identifier);
    this.receiveTaskMap.set(identifier, task);
    task.onfinish = (task, data) => {
      this.stopReceiveTask(task.identifier);
      if (data)
        localDispatch('UPDATE_FILE_RESOURE', {
          identifier: task.identifier,
          updateImages: data,
        });
      ImageStorage.instance.synchronize();
    };
    task.ontimeout = (task) => {
      Logger.warn('[ImageSync] receiveTask timeout', task.identifier);
    };
    task.oncancel = (task) => {
      Logger.warn('[ImageSync] receiveTask cancel', task.identifier);
    };

    task.start();
  }

  private stopSendTask(identifier: string) {
    const task = this.sendTaskMap.get(identifier);
    if (task) {
      task.cancel();
    }
    this.sendTaskMap.delete(identifier);
  }

  private stopReceiveTask(identifier: string) {
    const task = this.receiveTaskMap.get(identifier);
    if (task) {
      task.cancel();
    }
    this.receiveTaskMap.delete(identifier);
  }

  private request(request: CatalogItem[], peerId: string) {
    const peerIds = Network.peerIds;
    peerIds.splice(peerIds.indexOf(Network.peerId), 1);
    networkSend(
      'REQUEST_FILE_RESOURE',
      {
        identifiers: request,
        receiver: Network.peerId,
        candidatePeers: peerIds,
      },
      peerId
    );
  }

  private makeSendUpdateImages(catalog: CatalogItem[], maxSize: number = 1024 * 1024 * 0.5): ImageContext[] {
    const updateImages: ImageContext[] = [];
    let byteSize: number = 0;

    // Fisher-Yates
    for (let i = catalog.length - 1; 0 <= i; i--) {
      const rand = Math.floor(Math.random() * (i + 1));
      [catalog[i], catalog[rand]] = [catalog[rand], catalog[i]];
    }

    catalog.sort((a, b) => {
      if (a.state < b.state) return -1;
      if (a.state > b.state) return 1;
      return 0;
    });

    for (let i = 0; i < catalog.length; i++) {
      const item: { identifier: string; state: number } = catalog[i];
      const image = ImageStorage.instance.get(item.identifier);
      if (!image) continue;

      const context: ImageContext = {
        identifier: image.identifier,
        name: image.name,
        type: '',
        blob: null,
        url: '',
        thumbnail: { type: '', blob: null, url: '' },
      };

      if (image.state === ImageState.URL) {
        context.url = image.url;
      } else if (item.state === ImageState.NULL) {
        context.thumbnail.blob = image.thumbnail.blob; //
        context.thumbnail.type = image.thumbnail.type;
      } else if (image.blob) {
        context.blob = image.blob; //
        context.type = image.blob.type;
      } else {
        continue;
      }

      const size = context.blob ? context.blob.size : context.thumbnail.blob ? context.thumbnail.blob.size : 100;

      updateImages.push(context);
      byteSize += size;
      if (maxSize < byteSize) break;
    }
    return updateImages;
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
    for (const task of this.sendTaskMap.values()) {
      if (task && task.sendTo === peerId) return true;
    }
    return false;
  }
}

function convertUrlImage(xmlElement: Element) {
  const urls: string[] = [];

  let imageElements = xmlElement.querySelectorAll('*[type="image"]');
  for (let i = 0; i < imageElements.length; i++) {
    const url = imageElements[i].innerHTML;
    if (!ImageStorage.instance.get(url) && 0 < MimeType.type(url).length) {
      urls.push(url);
    }
  }

  imageElements = xmlElement.querySelectorAll('*[imageIdentifier]');
  for (let i = 0; i < imageElements.length; i++) {
    const url = imageElements[i].getAttribute('imageIdentifier');
    if (!ImageStorage.instance.get(url ?? '') && 0 < MimeType.type(url ?? '').length) {
      urls.push(url!);
    }
  }
  for (const url of urls) {
    // ファイル名ベースのidentifierの場合、名前で既存画像を検索してエイリアスを作る
    const byName = ImageStorage.instance.images.find((i) => i.name === url && i.blob);
    if (byName) {
      const aliasContext: ImageContext = {
        identifier: url,
        name: url,
        blob: byName.context.blob,
        type: byName.context.type,
        url: '', // createURLsで新しいblob:URLを生成させる
        thumbnail: {
          blob: byName.context.thumbnail.blob,
          type: byName.context.thumbnail.type,
          url: '',
        },
      };
      ImageStorage.instance.add(aliasContext);
    } else {
      ImageStorage.instance.add(url);
    }
  }
}
