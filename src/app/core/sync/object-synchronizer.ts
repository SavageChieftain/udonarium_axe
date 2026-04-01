import { Logger } from '@axe/core/logging/logger';
import { Network } from '@axe/core/network/network';
import { NetworkMessage, networkMessage$, networkSend } from '@axe/core/network/network-messaging';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

import { GameObject, ObjectContext } from './game-object';
import { markForChanged } from './object-event-extension';
import { ObjectFactory } from './object-factory';
import { CatalogItem, ObjectStore } from './object-store';
import { SynchronizeRequest, SynchronizeTask } from './synchronize-task';

type PeerId = string;
type ObjectIdentifier = string;

export class ObjectSynchronizer {
  private static _instance: ObjectSynchronizer;
  static get instance(): ObjectSynchronizer {
    if (!ObjectSynchronizer._instance) ObjectSynchronizer._instance = new ObjectSynchronizer();
    return ObjectSynchronizer._instance;
  }

  private requestMap: Map<ObjectIdentifier, SynchronizeRequest> = new Map();
  private peerMap: Map<PeerId, SynchronizeTask[]> = new Map();
  private tasks: SynchronizeTask[] = [];
  private subscription = new Subscription();

  private constructor() {}

  initialize() {
    this.destroy();

    this.subscription.add(
      networkMessage$
        .pipe(filter((msg): msg is NetworkMessage<{ peerId: string }> => msg.eventName === 'CONNECT_PEER'))
        .subscribe((msg) => {
          if (!msg.isSendFromSelf) return;
          this.sendCatalog(msg.data.peerId);
        })
    );

    this.subscription.add(
      networkMessage$
        .pipe(filter((msg): msg is NetworkMessage<{ peerId: string }> => msg.eventName === 'DISCONNECT_PEER'))
        .subscribe((msg) => {
          this.removePeerMap(msg.data.peerId);
        })
    );

    this.subscription.add(
      networkMessage$
        .pipe(filter((msg): msg is NetworkMessage<CatalogItem[]> => msg.eventName === 'SYNCHRONIZE_GAME_OBJECT'))
        .subscribe((msg) => {
          if (msg.isSendFromSelf) return;
          const catalog: CatalogItem[] = msg.data;
          for (const item of catalog) {
            if (ObjectStore.instance.isDeleted(item.identifier)) {
              networkSend('DELETE_GAME_OBJECT', { aliasName: '', identifier: item.identifier }, msg.sendFrom);
            } else {
              this.addRequestMap(item, msg.sendFrom);
            }
          }
          this.synchronize();
        })
    );

    this.subscription.add(
      networkMessage$
        .pipe(filter((msg): msg is NetworkMessage<string> => msg.eventName === 'REQUEST_GAME_OBJECT'))
        .subscribe((msg) => {
          if (msg.isSendFromSelf) return;
          if (ObjectStore.instance.isDeleted(msg.data)) {
            networkSend('DELETE_GAME_OBJECT', { aliasName: '', identifier: msg.data }, msg.sendFrom);
          } else {
            const object: GameObject = ObjectStore.instance.get(msg.data);
            if (object) networkSend('UPDATE_GAME_OBJECT', object.toContext(), msg.sendFrom);
          }
        })
    );

    this.subscription.add(
      networkMessage$
        .pipe(filter((msg): msg is NetworkMessage<ObjectContext> => msg.eventName === 'UPDATE_GAME_OBJECT'))
        .subscribe((msg) => {
          const context: ObjectContext = msg.data;
          let object: GameObject = ObjectStore.instance.get(context.identifier);
          if (object) {
            if (!msg.isSendFromSelf) object = this.updateObject(object, context);
            markForChanged(object, msg.sendFrom);
          } else if (ObjectStore.instance.isDeleted(context.identifier)) {
            networkSend(
              'DELETE_GAME_OBJECT',
              { aliasName: context.aliasName, identifier: context.identifier },
              msg.sendFrom
            );
          } else {
            object = this.createObject(context);
            if (object) markForChanged(object, msg.sendFrom);
          }
        })
    );

    this.subscription.add(
      networkMessage$
        .pipe(filter((msg): msg is NetworkMessage<{ identifier: string }> => msg.eventName === 'DELETE_GAME_OBJECT'))
        .subscribe((msg) => {
          const identifier: ObjectIdentifier = msg.data.identifier;
          ObjectStore.instance.delete(identifier, false);
        })
    );
  }

  destroy() {
    this.subscription.unsubscribe();
    this.subscription = new Subscription();
  }

  private updateObject(object: GameObject, context: ObjectContext): GameObject {
    if (context.majorVersion + context.minorVersion > object.version) {
      object.apply(context);
    }
    return object;
  }

  private createObject(context: ObjectContext): GameObject {
    const newObject = ObjectFactory.instance.create(context.aliasName, context.identifier);
    if (!newObject) {
      Logger.warn(`[ObjectSync] 未知のオブジェクト: ${context.aliasName}`, context);
      return null!;
    }
    ObjectStore.instance.add(newObject, false);
    newObject.apply(context);
    return newObject;
  }

  private sendCatalog(sendTo: PeerId) {
    const catalog = ObjectStore.instance.getCatalog();
    const interval = setInterval(() => {
      const count = catalog.length < 2048 ? catalog.length : 2048;
      networkSend('SYNCHRONIZE_GAME_OBJECT', catalog.splice(0, count), sendTo);
      if (catalog.length < 1) clearInterval(interval);
    });
  }

  private addRequestMap(item: CatalogItem, sendFrom: PeerId) {
    const request = this.requestMap.get(item.identifier);
    if (request && request.version === item.version) {
      request.holderIds.push(sendFrom);
      this.addPeerMap(sendFrom);
    } else if (!request || request.version < item.version) {
      this.requestMap.set(item.identifier, {
        identifier: item.identifier,
        version: item.version,
        holderIds: [sendFrom],
        ttl: 2,
      });
      this.addPeerMap(sendFrom);
    }
  }

  private addPeerMap(targetPeerId: PeerId) {
    if (!this.peerMap.has(targetPeerId)) this.peerMap.set(targetPeerId, []);
  }

  private removePeerMap(targetPeerId: PeerId) {
    this.peerMap.delete(targetPeerId);
  }

  private synchronize() {
    while (0 < this.requestMap.size && this.tasks.length < 32) this.runSynchronizeTask();
  }

  private runSynchronizeTask() {
    const targetPeerId = this.getTargetPeerId();
    const requests: SynchronizeRequest[] = this.makeRequestList(targetPeerId);

    if (requests.length < 1) {
      this.removePeerMap(targetPeerId);
      return;
    }
    const task = SynchronizeTask.create(targetPeerId, requests);
    this.tasks.push(task);

    const targetPeerIdTasks = this.peerMap.get(targetPeerId);
    if (targetPeerIdTasks) targetPeerIdTasks.push(task);

    task.onfinish = (task) => {
      this.tasks.splice(this.tasks.indexOf(task), 1);
      const targetPeerIdTasks = this.peerMap.get(targetPeerId);
      if (targetPeerIdTasks) targetPeerIdTasks.splice(targetPeerIdTasks.indexOf(task), 1);
      this.synchronize();
    };

    task.ontimeout = (task, remainedRequests) => {
      Logger.warn('[ObjectSync] 同期タイムアウト');
      remainedRequests.forEach((request) => this.requestMap.set(request.identifier, request));
    };
  }

  private makeRequestList(targetPeerId: PeerId, maxRequest: number = 32): SynchronizeRequest[] {
    const requests: SynchronizeRequest[] = [];

    for (const [identifier, request] of this.requestMap) {
      if (maxRequest <= requests.length) break;
      if (!request.holderIds.includes(targetPeerId)) continue;

      const gameObject = ObjectStore.instance.get(request.identifier);
      if (!gameObject || gameObject.version < request.version) requests.push(request);

      this.requestMap.delete(identifier);
    }
    return requests;
  }

  private getTargetPeerId(): PeerId {
    let min = 9999;
    let selectPeerId: PeerId = null!;
    const peerContexts = Network.peerContexts;

    for (let i = peerContexts.length - 1; 0 <= i; i--) {
      const rand = Math.floor(Math.random() * (i + 1));
      [peerContexts[i], peerContexts[rand]] = [peerContexts[rand], peerContexts[i]];
    }

    for (const peerContext of peerContexts) {
      const tasks = this.peerMap.get(peerContext.peerId);
      if (peerContext.isOpen && tasks && tasks.length < min) {
        min = tasks.length;
        selectPeerId = peerContext.peerId;
      }
    }
    return selectPeerId;
  }
}
