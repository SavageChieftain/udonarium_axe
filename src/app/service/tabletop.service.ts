import { Injectable, inject } from '@angular/core';
import { Card } from '@axe/card';
import { CardStack } from '@axe/card-stack';
import { ChatTab } from '@axe/chat-tab';
import { ChatTabList } from '@axe/chat-tab-list';
import { ObjectSerializer } from '@axe/core/synchronize-object/object-serializer';
import { ObjectStore } from '@axe/core/synchronize-object/object-store';
import { EventSystem } from '@axe/core/system';
import { DiceSymbol } from '@axe/dice-symbol';
import { GameCharacter } from '@axe/game-character';
import { GameTable } from '@axe/game-table';
import { GameTableMask } from '@axe/game-table-mask';
import { GameTableScratchMask } from '@axe/game-table-scratch-mask';
import { PeerCursor } from '@axe/peer-cursor';
import { PresetSound, SoundEffect } from '@axe/sound-effect';
import { TableSelecter } from '@axe/table-selecter';
import { TabletopObject } from '@axe/tabletop-object';
import { RangeArea } from '@axe/range';
import { Terrain } from '@axe/terrain';
import { TextNote } from '@axe/text-note';

import { CoordinateService } from './coordinate.service';
type ObjectIdentifier = string;
type LocationName = string;

@Injectable()
export class TabletopService {
  private coordinateService = inject(CoordinateService);

  private _emptyTable: GameTable = new GameTable('');
  get tableSelecter(): TableSelecter {
    return TableSelecter.instance;
  }
  get currentTable(): GameTable {
    const table = this.tableSelecter.viewTable;
    return table ? table : this._emptyTable;
  }

  private locationMap: Map<ObjectIdentifier, LocationName> = new Map();
  private parentMap: Map<ObjectIdentifier, ObjectIdentifier> = new Map();
  private characterCache = new TabletopCache<GameCharacter>(() =>
    ObjectStore.instance.getObjects(GameCharacter).filter((obj) => obj.isVisibleOnTable)
  );
  private cardCache = new TabletopCache<Card>(() =>
    ObjectStore.instance.getObjects(Card).filter((obj) => obj.isVisibleOnTable)
  );
  private cardStackCache = new TabletopCache<CardStack>(() =>
    ObjectStore.instance.getObjects(CardStack).filter((obj) => obj.isVisibleOnTable)
  );
  private tableMaskCache = new TabletopCache<GameTableMask>(() => {
    const viewTable = this.tableSelecter.viewTable;
    return viewTable ? viewTable.masks : [];
  });
  private tableScratchMaskCache = new TabletopCache<GameTableScratchMask>(() => {
    const viewTable = this.tableSelecter.viewTable;
    return viewTable ? viewTable.scratchMasks : [];
  });
  private rangeCache = new TabletopCache<RangeArea>(() =>
    ObjectStore.instance.getObjects(RangeArea).filter((obj) => obj.isVisibleOnTable)
  );
  private terrainCache = new TabletopCache<Terrain>(() => {
    const viewTable = this.tableSelecter.viewTable;
    return viewTable ? viewTable.terrains : [];
  });
  private textNoteCache = new TabletopCache<TextNote>(() => ObjectStore.instance.getObjects(TextNote));
  private diceSymbolCache = new TabletopCache<DiceSymbol>(() => ObjectStore.instance.getObjects(DiceSymbol));

  get characters(): GameCharacter[] {
    return this.characterCache.objects;
  }
  get cards(): Card[] {
    return this.cardCache.objects;
  }
  get cardStacks(): CardStack[] {
    return this.cardStackCache.objects;
  }
  get tableMasks(): GameTableMask[] {
    return this.tableMaskCache.objects;
  }
  get tableScratchMasks(): GameTableScratchMask[] {
    return this.tableScratchMaskCache.objects;
  }
  get ranges(): RangeArea[] {
    return this.rangeCache.objects;
  }
  get terrains(): Terrain[] {
    return this.terrainCache.objects;
  }
  get textNotes(): TextNote[] {
    return this.textNoteCache.objects;
  }
  get diceSymbols(): DiceSymbol[] {
    return this.diceSymbolCache.objects;
  }
  get peerCursors(): PeerCursor[] {
    return ObjectStore.instance.getObjects<PeerCursor>(PeerCursor);
  }

  constructor() {
    this.initialize();
  }

  private initialize() {
    this.refreshCacheAll();
    EventSystem.register(this)
      .on('UPDATE_GAME_OBJECT', (event) => {
        if (
          event.data.identifier === this.currentTable.identifier ||
          event.data.identifier === this.tableSelecter.identifier
        ) {
          this.refreshCache(GameTableMask.aliasName);
          this.refreshCache(GameTableScratchMask.aliasName);
          this.refreshCache(Terrain.aliasName);
          return;
        }

        const object = ObjectStore.instance.get(event.data.identifier);
        if (!object || !(object instanceof TabletopObject)) {
          this.refreshCache(event.data.aliasName);
        } else if (this.shouldRefreshCache(object)) {
          this.refreshCache(event.data.aliasName);
          this.updateMap(object);
        }
      })
      .on('DELETE_GAME_OBJECT', (event) => {
        const aliasName = event.data.aliasName;
        if (!aliasName) {
          this.refreshCacheAll();
        } else {
          this.refreshCache(aliasName);
        }
      })
      .on('XML_LOADED', (event) => {
        const xmlElement: Element = event.data.xmlElement;
        // todo:立体地形の上にドロップした時の挙動
        console.log('parseXml todo:立体地形の上にドロップした時の挙動');

        const gameObject = ObjectSerializer.instance.parseXml(xmlElement);

        if (gameObject instanceof TabletopObject) {
          console.log('TabletopObject 追加');
          const pointer = this.coordinateService.calcTabletopLocalCoordinate();
          gameObject.location.x = pointer.x - 25;
          gameObject.location.y = pointer.y - 25;
          gameObject.posZ = pointer.z;
          this.placeToTabletop(gameObject);
          SoundEffect.play(PresetSound.piecePut);
        } else if (gameObject instanceof ChatTab) {
          ChatTabList.instance.addChatTab(gameObject);
        }

        //通常版データが投下されたときに、追加が必要な要素を追加
        const objects: TabletopObject[] = ObjectStore.instance.getObjects(GameCharacter);
        for (const gameObject of objects) {
          if (gameObject instanceof GameCharacter) {
            console.log('GameCharacter Load 追加データ確認');
            const gameCharacter: GameCharacter = gameObject;
            gameCharacter.addExtendData();
          }
        }
      });
  }

  private findCache(aliasName: string): TabletopCache<TabletopObject> {
    switch (aliasName) {
      case GameCharacter.aliasName:
        return this.characterCache;
      case Card.aliasName:
        return this.cardCache;
      case CardStack.aliasName:
        return this.cardStackCache;
      case GameTableMask.aliasName:
        return this.tableMaskCache;
      case GameTableScratchMask.aliasName:
        return this.tableScratchMaskCache;
      case RangeArea.aliasName:
        return this.rangeCache;
      case Terrain.aliasName:
        return this.terrainCache;
      case TextNote.aliasName:
        return this.textNoteCache;
      case DiceSymbol.aliasName:
        return this.diceSymbolCache;
      default:
        return null!;
    }
  }

  private refreshCache(aliasName: string) {
    const cache = this.findCache(aliasName);
    if (cache) cache.refresh();
  }

  private refreshCacheAll() {
    this.characterCache.refresh();
    this.cardCache.refresh();
    this.cardStackCache.refresh();
    this.tableMaskCache.refresh();
    this.tableScratchMaskCache.refresh();
    this.rangeCache.refresh();
    this.terrainCache.refresh();
    this.textNoteCache.refresh();
    this.diceSymbolCache.refresh();
    this.clearMap();
  }

  private shouldRefreshCache(object: TabletopObject): boolean {
    return (
      this.locationMap.get(object.identifier) !== object.location.name ||
      this.parentMap.get(object.identifier) !== object.parentId
    );
  }

  private updateMap(object: TabletopObject) {
    this.locationMap.set(object.identifier, object.location.name);
    this.parentMap.set(object.identifier, object.parentId);
  }

  private clearMap() {
    this.locationMap.clear();
    this.parentMap.clear();
  }

  private placeToTabletop(gameObject: TabletopObject) {
    switch (gameObject.aliasName) {
      case GameTableMask.aliasName:
        if (gameObject instanceof GameTableMask) gameObject.isLock = false;
      // falls through
      case Terrain.aliasName:
        if (gameObject instanceof Terrain) gameObject.isLocked = false;
        if (!this.tableSelecter || !this.tableSelecter.viewTable) return;
        this.tableSelecter.viewTable.appendChild(gameObject);
        break;
      default:
        gameObject.setLocation('table');
        break;
    }
  }
}

class TabletopCache<T extends TabletopObject> {
  private needsRefresh: boolean = true;

  private _objects: T[] = [];
  get objects(): T[] {
    if (this.needsRefresh) {
      this._objects = this.refreshCollector();
      this._objects = this._objects ? this._objects : [];
      this.needsRefresh = false;
    }
    return this._objects;
  }

  constructor(readonly refreshCollector: () => T[]) {}

  refresh() {
    this.needsRefresh = true;
  }
}
