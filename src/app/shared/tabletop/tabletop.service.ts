import { DestroyRef, inject, Injectable } from '@angular/core';
import { CoordinateService } from '@axe/core/input/coordinate.service';
import { ObjectSerializer } from '@axe/core/sync/object-serializer';
import { ObjectStore } from '@axe/core/sync/object-store';
import { Card } from '@axe/domain/card/card';
import { CardStack } from '@axe/domain/card/card-stack';
import { GameCharacter } from '@axe/domain/character/game-character';
import { ChatTab } from '@axe/domain/chat/chat-tab';
import { ChatTabList } from '@axe/domain/chat/chat-tab-list';
import { DiceSymbol } from '@axe/domain/dice/dice-symbol';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { GameTable } from '@axe/domain/tabletop/game-table';
import { GameTableMask } from '@axe/domain/tabletop/game-table-mask';
import { GameTableScratchMask } from '@axe/domain/tabletop/game-table-scratch-mask';
import { RangeArea } from '@axe/domain/tabletop/range';
import { TableSelecter } from '@axe/domain/tabletop/table-selecter';
import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';
import { Terrain } from '@axe/domain/tabletop/terrain';
import { TextNote } from '@axe/domain/tabletop/text-note';
import { ObjectChangeService } from '@axe/shared/sync/object-change.service';
type ObjectIdentifier = string;
type LocationName = string;

@Injectable()
export class TabletopService {
  private readonly coordinateService = inject(CoordinateService);
  private readonly objectStore = inject(ObjectStore);
  private readonly objectSerializer = inject(ObjectSerializer);
  private readonly chatTabList = inject(ChatTabList);
  readonly tableSelecter = inject(TableSelecter);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly destroyRef = inject(DestroyRef);

  private _emptyTable: GameTable = new GameTable('');
  get currentTable(): GameTable {
    const table = this.tableSelecter.viewTable;
    return table ? table : this._emptyTable;
  }

  private locationMap: Map<ObjectIdentifier, LocationName> = new Map();
  private parentMap: Map<ObjectIdentifier, ObjectIdentifier> = new Map();
  private characterCache = new TabletopCache<GameCharacter>(() =>
    this.objectStore.getObjects(GameCharacter).filter((obj) => obj.isVisibleOnTable)
  );
  private cardCache = new TabletopCache<Card>(() =>
    this.objectStore.getObjects(Card).filter((obj) => obj.isVisibleOnTable)
  );
  private cardStackCache = new TabletopCache<CardStack>(() =>
    this.objectStore.getObjects(CardStack).filter((obj) => obj.isVisibleOnTable)
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
    this.objectStore.getObjects(RangeArea).filter((obj) => obj.isVisibleOnTable)
  );
  private terrainCache = new TabletopCache<Terrain>(() => {
    const viewTable = this.tableSelecter.viewTable;
    return viewTable ? viewTable.terrains : [];
  });
  private textNoteCache = new TabletopCache<TextNote>(() => this.objectStore.getObjects(TextNote));
  private diceSymbolCache = new TabletopCache<DiceSymbol>(() => this.objectStore.getObjects(DiceSymbol));

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
    return this.objectStore.getObjects<PeerCursor>(PeerCursor);
  }

  constructor() {
    this.initialize();
  }

  private initialize() {
    this.refreshCacheAll();
    this.objectChange.objectAdded$.subscribe((e) => {
      this.refreshCache(e.aliasName);
    }, this.destroyRef);
    this.objectChange.objectChanged$.subscribe((event) => {
      if (event.identifier === this.currentTable.identifier || event.identifier === this.tableSelecter.identifier) {
        this.refreshCache(GameTableMask.aliasName);
        this.refreshCache(GameTableScratchMask.aliasName);
        this.refreshCache(Terrain.aliasName);
        this.objectChange.notifyCollectionChanged(GameTableMask.aliasName);
        this.objectChange.notifyCollectionChanged(GameTableScratchMask.aliasName);
        this.objectChange.notifyCollectionChanged(Terrain.aliasName);
        return;
      }

      const object = this.objectStore.get(event.identifier);
      if (!object || !(object instanceof TabletopObject)) {
        this.refreshCache(event.aliasName);
        this.objectChange.notifyCollectionChanged(event.aliasName);
      } else if (this.shouldRefreshCache(object)) {
        this.refreshCache(event.aliasName);
        this.updateMap(object);
        this.objectChange.notifyCollectionChanged(event.aliasName);
      }
    }, this.destroyRef);
    this.objectChange.objectDeleted$.subscribe((event) => {
      const aliasName = event.aliasName;
      if (!aliasName) {
        this.refreshCacheAll();
      } else {
        this.refreshCache(aliasName);
      }
    }, this.destroyRef);
    this.objectChange.objectRemoved$.subscribe((e) => {
      const aliasName = e.aliasName;
      if (!aliasName) {
        this.refreshCacheAll();
      } else {
        this.refreshCache(aliasName);
      }
    }, this.destroyRef);
    this.objectChange.xmlLoaded$.subscribe((event) => {
      const xmlElement: Element = event.xmlElement;

      const gameObject = this.objectSerializer.parseXml(xmlElement);

      if (gameObject instanceof TabletopObject) {
        const dropTarget = event.dropPoint
          ? ((document.elementFromPoint(event.dropPoint.x, event.dropPoint.y) as HTMLElement) ?? undefined)
          : undefined;
        const pointer = dropTarget
          ? this.coordinateService.calcTabletopLocalCoordinate(
              { x: event.dropPoint!.x, y: event.dropPoint!.y, z: 0 },
              dropTarget
            )
          : this.coordinateService.calcTabletopLocalCoordinate();
        gameObject.location.x = pointer.x - 25;
        gameObject.location.y = pointer.y - 25;
        gameObject.posZ = pointer.z;
        this.placeToTabletop(gameObject);
        SoundEffect.play(PresetSound.piecePut);
      } else if (gameObject instanceof ChatTab) {
        this.chatTabList.addChatTab(gameObject);
      }

      //通常版データが投下されたときに、追加が必要な要素を追加
      const objects: TabletopObject[] = this.objectStore.getObjects(GameCharacter);
      for (const gameObject of objects) {
        if (gameObject instanceof GameCharacter) {
          const gameCharacter: GameCharacter = gameObject;
          gameCharacter.addExtendData();
        }
      }
    }, this.destroyRef);
  }

  private findCache(aliasName: string): TabletopCache<TabletopObject> | null {
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
        return null;
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
