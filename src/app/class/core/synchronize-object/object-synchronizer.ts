import { Logger } from '@axe/core/logger';
import { EventSystem, Network } from '@axe/core/system';

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

  private constructor() {}

  initialize() {
    this.destroy();
    EventSystem.register(this)
      .on('CONNECT_PEER', 2, (event) => {
        if (!event.isSendFromSelf) return;
        this.sendCatalog(event.data.peerId);
      })
      .on('DISCONNECT_PEER', (event) => {
        this.removePeerMap(event.data.peerId);
      })
      .on<CatalogItem[]>('SYNCHRONIZE_GAME_OBJECT', (event) => {
        if (event.isSendFromSelf) return;
        const catalog: CatalogItem[] = event.data;
        for (const item of catalog) {
          if (ObjectStore.instance.isDeleted(item.identifier)) {
            EventSystem.call('DELETE_GAME_OBJECT', { aliasName: '', identifier: item.identifier }, event.sendFrom);
          } else {
            this.addRequestMap(item, event.sendFrom);
          }
        }
        this.synchronize();
      })
      .on('REQUEST_GAME_OBJECT', (event) => {
        if (event.isSendFromSelf) return;
        if (ObjectStore.instance.isDeleted(event.data)) {
          EventSystem.call('DELETE_GAME_OBJECT', { aliasName: '', identifier: event.data }, event.sendFrom);
        } else {
          const object: GameObject = ObjectStore.instance.get(event.data);
          if (object) EventSystem.call('UPDATE_GAME_OBJECT', object.toContext(), event.sendFrom);
        }
      })
      .on('UPDATE_GAME_OBJECT', 1000, (event) => {
        const context: ObjectContext = event.data;
        let object: GameObject = ObjectStore.instance.get(context.identifier);
        if (object) {
          if (!event.isSendFromSelf) object = this.updateObject(object, context);
          markForChanged(object, event.sendFrom);
        } else if (ObjectStore.instance.isDeleted(context.identifier)) {
          EventSystem.call(
            'DELETE_GAME_OBJECT',
            { aliasName: context.aliasName, identifier: context.identifier },
            event.sendFrom
          );
        } else {
          object = this.createObject(context);
          markForChanged(object, event.sendFrom);
        }
      })
      .on('DELETE_GAME_OBJECT', 1000, (event) => {
        const identifier: ObjectIdentifier = event.data.identifier;
        ObjectStore.instance.delete(identifier, false);
      });
  }

  destroy() {
    EventSystem.unregister(this);
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
      EventSystem.call('SYNCHRONIZE_GAME_OBJECT', catalog.splice(0, count), sendTo);
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
