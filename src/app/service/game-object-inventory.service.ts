import { Injectable } from '@angular/core';
import { ObjectStore } from '@axe/core/synchronize-object/object-store';
import { EventSystem, Network } from '@axe/core/system';
import { StringUtil } from '@axe/core/system/util/string-util';
import { DataElement } from '@axe/data-element';
import { DataSummarySetting, SortOrder } from '@axe/data-summary-setting';
import { GameCharacter } from '@axe/game-character';
import { TabletopObject } from '@axe/tabletop-object';

type ObjectIdentifier = string;
type LocationName = string;
type ElementName = string;

@Injectable({
  providedIn: 'root',
})
export class GameObjectInventoryService {
  private get summarySetting(): DataSummarySetting {
    return DataSummarySetting.instance;
  }

  get sortTag(): string {
    return this.summarySetting.sortTag;
  }
  set sortTag(sortTag: string) {
    this.summarySetting.sortTag = sortTag;
  }
  get sortOrder(): SortOrder {
    return this.summarySetting.sortOrder;
  }
  set sortOrder(sortOrder: SortOrder) {
    this.summarySetting.sortOrder = sortOrder;
  }

  get sortTag2nd(): string {
    return this.summarySetting.sortTag2nd;
  }
  set sortTag2nd(sortTag: string) {
    this.summarySetting.sortTag2nd = sortTag;
  }
  get sortOrder2nd(): SortOrder {
    return this.summarySetting.sortOrder2nd;
  }
  set sortOrder2nd(sortOrder: SortOrder) {
    this.summarySetting.sortOrder2nd = sortOrder;
  }

  get dataTag(): string {
    return this.summarySetting.dataTag;
  }
  set dataTag(dataTag: string) {
    this.summarySetting.dataTag = dataTag;
  }
  get dataTags(): string[] {
    return this.summarySetting.dataTags;
  }

  tableInventory: ObjectInventory = new ObjectInventory((object) => {
    return object.location.name === 'table';
  });
  commonInventory: ObjectInventory = new ObjectInventory((object) => {
    return !this.isAnyLocation(object.location.name);
  });
  privateInventory: ObjectInventory = new ObjectInventory((object) => {
    return object.location.name === Network.peerId;
  });
  graveyardInventory: ObjectInventory = new ObjectInventory((object) => {
    return object.location.name === 'graveyard';
  });

  private locationMap: Map<ObjectIdentifier, LocationName> = new Map();
  private tagNameMap: Map<ObjectIdentifier, ElementName> = new Map();

  readonly newLineString: string = '/';
  readonly newLineDataElement: DataElement = DataElement.create(this.newLineString);

  constructor() {
    this.initialize();
  }

  private initialize() {
    EventSystem.register(this)
      .on('OPEN_NETWORK', (_event) => {
        this.refresh();
      })
      .on('CONNECT_PEER', (_event) => {
        this.refresh();
      })
      .on('DISCONNECT_PEER', (_event) => {
        this.refresh();
      })
      .on('UPDATE_GAME_OBJECT', (event) => {
        const object = ObjectStore.instance.get(event.data.identifier);
        if (!object) return;

        if (object instanceof GameCharacter) {
          const prevLocation = this.locationMap.get(object.identifier);
          if (object.location.name !== prevLocation) {
            this.locationMap.set(object.identifier, object.location.name);
            this.refresh();
          }
        } else if (object instanceof DataElement) {
          if (!this.containsInGameCharacter(object)) return;

          const prevName = this.tagNameMap.get(object.identifier);
          if (
            (this.dataTags.includes(prevName ?? '') || this.dataTags.includes(object.name)) &&
            object.name !== prevName
          ) {
            this.tagNameMap.set(object.identifier, object.name);
            this.refreshDataElements();
          }
          if (this.sortTag === object.name || this.sortTag2nd === object.name) {
            this.refreshSort();
          }
          if (0 < object.children.length) {
            this.refreshDataElements();
            this.refreshSort();
          }
          this.callInventoryUpdate();
        } else if (object instanceof DataSummarySetting) {
          this.refreshDataElements();
          this.refreshSort();
          this.callInventoryUpdate();
        }
      })
      .on('DELETE_GAME_OBJECT', (event) => {
        this.locationMap.delete(event.data.identifier);
        this.tagNameMap.delete(event.data.identifier);
        this.refresh();
      })
      .on('SYNCHRONIZE_FILE_LIST', (event) => {
        if (event.isSendFromSelf) this.callInventoryUpdate();
      });
  }

  private containsInGameCharacter(element: DataElement): boolean {
    let parent = element.parent;
    const aliasName = GameCharacter.aliasName;
    while (parent) {
      if (parent.aliasName === aliasName) return true;
      parent = parent.parent;
    }
    return false;
  }

  private refresh() {
    this.refreshObjects();
    this.refreshDataElements();
    this.refreshSort();
    this.callInventoryUpdate();
  }

  private refreshObjects() {
    this.tableInventory.refreshObjects();
    this.commonInventory.refreshObjects();
    this.privateInventory.refreshObjects();
    this.graveyardInventory.refreshObjects();
  }

  private refreshDataElements() {
    this.tableInventory.refreshDataElements();
    this.commonInventory.refreshDataElements();
    this.privateInventory.refreshDataElements();
    this.graveyardInventory.refreshDataElements();
  }

  private refreshSort() {
    this.tableInventory.refreshSort();
    this.commonInventory.refreshSort();
    this.privateInventory.refreshSort();
    this.graveyardInventory.refreshSort();
  }

  private callInventoryUpdate() {
    EventSystem.trigger('UPDATE_INVENTORY', null!);
  }

  private isAnyLocation(location: string): boolean {
    if (location === 'table' || location === Network.peerId || location === 'graveyard') return true;
    for (const conn of Network.peerContexts) {
      if (conn.isOpen && location === conn.peerId) {
        return true;
      }
    }
    return false;
  }
}

class ObjectInventory {
  newLineString: string = '/';
  private newLineDataElement: DataElement = DataElement.create(this.newLineString);

  private get summarySetting(): DataSummarySetting {
    return DataSummarySetting.instance;
  }

  get sortTag(): string {
    return this.summarySetting.sortTag;
  }
  set sortTag(sortTag: string) {
    this.summarySetting.sortTag = sortTag;
  }

  get sortOrder(): SortOrder {
    return this.summarySetting.sortOrder;
  }
  set sortOrder(sortOrder: SortOrder) {
    this.summarySetting.sortOrder = sortOrder;
  }

  get sortTag2nd(): string {
    return this.summarySetting.sortTag2nd;
  }
  set sortTag2nd(sortTag: string) {
    this.summarySetting.sortTag2nd = sortTag;
  }

  get sortOrder2nd(): SortOrder {
    return this.summarySetting.sortOrder2nd;
  }
  set sortOrder2nd(sortOrder: SortOrder) {
    this.summarySetting.sortOrder2nd = sortOrder;
  }

  get dataTag(): string {
    return this.summarySetting.dataTag;
  }
  set dataTag(dataTag: string) {
    this.summarySetting.dataTag = dataTag;
  }

  get dataTags(): string[] {
    return this.summarySetting.dataTags;
  }

  private _tabletopObjects: TabletopObject[] = [];
  get tabletopObjects(): TabletopObject[] {
    if (this.needsRefreshObjects) {
      this._tabletopObjects = this.searchTabletopObjects();
      this.needsRefreshObjects = false;
    }
    if (this.needsSort) {
      this._tabletopObjects = this.sortTabletopObjects(this._tabletopObjects);
      this.needsSort = false;
    }
    return this._tabletopObjects;
  }

  get length(): number {
    if (this.needsRefreshObjects) {
      this._tabletopObjects = this.searchTabletopObjects();
      this.needsRefreshObjects = false;
    }
    return this._tabletopObjects.length;
  }

  private _dataElementMap: Map<ObjectIdentifier, DataElement[]> = new Map();
  get dataElementMap(): Map<ObjectIdentifier, DataElement[]> {
    if (this.needsRefreshElements) {
      this._dataElementMap.clear();
      const caches = this.tabletopObjects;
      for (const object of caches) {
        if (!object.rootDataElement) continue;
        const elements = this.dataTags.map((tag) =>
          tag === this.newLineString ? this.newLineDataElement : object.rootDataElement.getFirstElementByName(tag)
        );
        this._dataElementMap.set(object.identifier, elements);
      }
      this.needsRefreshElements = false;
    }
    return this._dataElementMap;
  }

  private needsRefreshObjects: boolean = true;
  private needsRefreshElements: boolean = true;
  private needsSort: boolean = true;

  constructor(readonly classifier: (object: TabletopObject) => boolean) {}

  refreshObjects() {
    this.needsRefreshObjects = true;
  }

  refreshDataElements() {
    this.needsRefreshElements = true;
  }

  refreshSort() {
    this.needsSort = true;
  }

  private searchTabletopObjects(): TabletopObject[] {
    const objects: TabletopObject[] = ObjectStore.instance.getObjects(GameCharacter);
    const caches: TabletopObject[] = [];
    for (const object of objects) {
      if (this.classifier(object)) caches.push(object);
    }
    return caches;
  }

  private sortTabletopObjects(objects: TabletopObject[]): TabletopObject[] {
    const sortTag = this.sortTag.length ? this.sortTag.trim() : '';
    const sortTag2nd = this.sortTag2nd.length ? this.sortTag2nd.trim() : '';

    const sortOrder = this.sortOrder === 'ASC' ? -1 : 1;
    const sortOrder2nd = this.sortOrder2nd === 'ASC' ? -1 : 1;
    if (sortTag.length < 1) return objects;

    objects.sort((a, b) => {
      const aElm = a.rootDataElement?.getFirstElementByName(sortTag);
      const bElm = b.rootDataElement?.getFirstElementByName(sortTag);
      if (!aElm && !bElm) return 0;
      if (!bElm) return -1;
      if (!aElm) return 1;

      const aValue = this.convertToSortableValue(aElm);
      const bValue = this.convertToSortableValue(bElm);
      if (aValue < bValue) return sortOrder;
      if (aValue > bValue) return sortOrder * -1;

      const aElm2nd = a.rootDataElement.getFirstElementByName(sortTag2nd);
      const bElm2nd = b.rootDataElement.getFirstElementByName(sortTag2nd);
      if (!aElm2nd && !bElm2nd) return 0;
      if (!bElm2nd) return -1;
      if (!aElm2nd) return 1;

      const aValue2nd = this.convertToSortableValue(aElm2nd);
      const bValue2nd = this.convertToSortableValue(bElm2nd);
      if (aValue2nd < bValue2nd) return sortOrder2nd;
      if (aValue2nd > bValue2nd) return sortOrder2nd * -1;

      return 0;
    });
    return objects;
  }

  private convertToSortableValue(dataElement: DataElement): number | string {
    const value = dataElement.isNumberResource ? dataElement.currentValue : dataElement.value;
    const resultStr = StringUtil.toHalfWidth((value + '').trim());
    const resultNum = +resultStr;
    return Number.isNaN(resultNum) ? resultStr : resultNum;
  }
}
