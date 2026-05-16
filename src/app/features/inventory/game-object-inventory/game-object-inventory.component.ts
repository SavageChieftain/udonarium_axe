import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { GameObjectInventoryService } from '@axe/application/inventory/game-object-inventory.service';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { ContextMenuService } from '@axe/application/ui/context-menu.service';
import { PanelOption, PanelService } from '@axe/application/ui/panel.service';
import { SelectionSignalService } from '@axe/application/ui/selection-signal.service';
import { Network } from '@axe/core/index';
import { PointerDeviceService } from '@axe/core/input/pointer-device.service';
import { GameObject } from '@axe/core/sync/game-object';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { DataElement } from '@axe/domain/data/data-element';
import { SortOrder } from '@axe/domain/data/data-summary-setting';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';
import {
  buildInventoryMultiMoveContextMenu,
  buildInventoryObjectContextMenu,
} from '@axe/features/inventory/game-object-inventory/game-object-inventory-context-menu';
import { SafePipe } from '@axe/ui/pipes/safe.pipe';
import { TranslocoModule } from '@jsverse/transloco';

const FOCUS_BLOCKED_TAGS = new Set(['input', 'button']);

@Component({
  selector: 'game-object-inventory',
  templateUrl: './game-object-inventory.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, FormsModule, SafePipe, TranslocoModule],
})
export class GameObjectInventoryComponent {
  private readonly panelService = inject(PanelService);
  private readonly inventoryService = inject(GameObjectInventoryService);
  private readonly contextMenuService = inject(ContextMenuService);
  private readonly pointerDeviceService = inject(PointerDeviceService);
  private readonly objectStore = inject(ObjectStore);
  private readonly selectionSignalService = inject(SelectionSignalService);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly t = inject(TRANSLATE_FN);

  constructor() {
    effect(() => {
      const selection = this.selectionSignalService.selectedObject();
      if (selection && this.objectStore.get(selection.identifier) instanceof TabletopObject) {
        this.selectedIdentifier.set(selection.identifier);
      }
    });
    queueMicrotask(() => (this.panelService.title = this.t('common.panel.inventory')));
    this.objectChange.networkOpen$.subscribe(() => {
      this.inventoryTypes.set(['table', 'common', Network.peerId, 'graveyard']);
      if (!this.inventoryTypes().includes(this.selectTab())) {
        this.selectTab.set(Network.peerId);
      }
    }, this.destroyRef);
    this.inventoryTypes.set(['table', 'common', Network.peerId, 'graveyard']);
  }

  readonly inventoryTypes = signal<string[]>(['table', 'common', 'graveyard']);

  readonly selectTab = signal('table');
  readonly selectedIdentifier = signal('');
  readonly multiMoveTargets = signal(new Set<string>());

  readonly isEdit = signal(false);
  readonly isMultiMove = signal(false);

  get sortTag(): string {
    return this.inventoryService.sortTag;
  }
  set sortTag(sortTag: string) {
    this.inventoryService.sortTag = sortTag;
  }
  get sortOrder(): SortOrder {
    return this.inventoryService.sortOrder;
  }
  set sortOrder(sortOrder: SortOrder) {
    this.inventoryService.sortOrder = sortOrder;
  }

  get sortTag2nd(): string {
    return this.inventoryService.sortTag2nd;
  }
  set sortTag2nd(sortTag: string) {
    this.inventoryService.sortTag2nd = sortTag;
  }
  get sortOrder2nd(): SortOrder {
    return this.inventoryService.sortOrder2nd;
  }
  set sortOrder2nd(sortOrder: SortOrder) {
    this.inventoryService.sortOrder2nd = sortOrder;
  }

  get dataTag(): string {
    return this.inventoryService.dataTag;
  }
  set dataTag(dataTag: string) {
    this.inventoryService.dataTag = dataTag;
  }
  get dataTags(): string[] {
    return this.inventoryService.dataTags;
  }

  get sortOrderName(): string {
    return this.sortOrder === SortOrder.ASC
      ? this.t('feature.inventory.panel.asc')
      : this.t('feature.inventory.panel.desc');
  }
  get sortOrderName2nd(): string {
    return this.sortOrder2nd === SortOrder.ASC
      ? this.t('feature.inventory.panel.asc')
      : this.t('feature.inventory.panel.desc');
  }

  get multiMoveLocations(): { name: string; labelKey: string }[] {
    const all = [
      { name: 'table', labelKey: 'feature.inventory.tabs.table' },
      { name: 'common', labelKey: 'feature.inventory.tabs.common' },
      { name: Network.peerId, labelKey: 'feature.inventory.tabs.personal' },
      { name: 'graveyard', labelKey: 'feature.inventory.tabs.graveyard' },
    ];
    return all.filter((loc) => loc.name !== this.selectTab());
  }

  get newLineString(): string {
    return this.inventoryService.newLineString;
  }

  getTabTitle(inventoryType: string) {
    switch (inventoryType) {
      case 'table':
        return this.t('feature.inventory.tabs.table');
      case Network.peerId:
        return this.t('feature.inventory.tabs.personal');
      case 'graveyard':
        return this.t('feature.inventory.tabs.graveyard');
      default:
        return this.t('feature.inventory.tabs.common');
    }
  }

  getInventory(inventoryType: string) {
    switch (inventoryType) {
      case 'table':
        return this.inventoryService.tableInventory;
      case Network.peerId:
        return this.inventoryService.privateInventory;
      case 'graveyard':
        return this.inventoryService.graveyardInventory;
      default:
        return this.inventoryService.commonInventory;
    }
  }

  getGameObjects(inventoryType: string): TabletopObject[] {
    this.inventoryService.inventoryVersion();
    this.objectChange.fileVersion();
    this.objectChange.collectionOf('character')();
    switch (inventoryType) {
      case 'table': {
        const showHidden = this.isMultiMove() || this.isEdit();
        if (showHidden) return [...this.inventoryService.tableInventory.tabletopObjects];
        const tableCharacterList_dest = [];
        const tableCharacterList_scr = this.inventoryService.tableInventory.tabletopObjects;
        for (const character of tableCharacterList_scr) {
          const character_: GameCharacter = character as GameCharacter;
          if (!character_.hideInventory) tableCharacterList_dest.push(character as TabletopObject);
        }
        return tableCharacterList_dest;
      }

      default:
        return this.getInventory(inventoryType).tabletopObjects;
    }
  }

  isInventoryHiddenObject(gameObject: TabletopObject): boolean {
    return gameObject instanceof GameCharacter && gameObject.hideInventory;
  }

  getInventoryTags(gameObject: GameCharacter): (DataElement | null)[] {
    return this.getInventory(gameObject.location.name).dataElementMap.get(gameObject.identifier) ?? [];
  }

  onContextMenu(e: Event, gameObject: TabletopObject) {
    if (document.activeElement instanceof HTMLInputElement && document.activeElement.getAttribute('type') !== 'range')
      return;
    e.stopPropagation();
    e.preventDefault();

    if (!this.pointerDeviceService.isAllowedToOpenContextMenu) return;

    this.selectGameObject(gameObject);

    const position = this.pointerDeviceService.pointers[0];
    const actions = buildInventoryObjectContextMenu(
      gameObject,
      this.inventoryService,
      {
        showDetail: (c) => this.showDetail(c),
        showChatPalette: (c) => this.showChatPalette(c),
        showRemoteController: (c) => this.showRemoteController(c),
        cloneGameObject: (o) => this.cloneGameObject(o),
        deleteGameObject: (o) => this.deleteGameObject(o),
      },
      this.t
    );

    this.contextMenuService.open(position, actions, gameObject.name);
  }

  toggleEdit() {
    this.isEdit.update((v) => !v);
  }

  toggleMultiMove() {
    if (this.isMultiMove()) {
      this.multiMoveTargets.set(new Set());
    }
    this.isMultiMove.update((v) => !v);
  }

  cleanInventory() {
    const tabTitle = this.getTabTitle(this.selectTab());
    const gameObjects = this.getGameObjects(this.selectTab());
    if (!confirm(this.t('feature.inventory.panel.confirmCleanTab', { tab: tabTitle, count: gameObjects.length })))
      return;
    for (const gameObject of gameObjects) {
      this.deleteGameObject(gameObject);
    }
    SoundEffect.play(PresetSound.sweep);
  }

  existsMultiMoveSelectedInTab(): boolean {
    return this.getGameObjects(this.selectTab()).some((x) => this.multiMoveTargets().has(x.identifier));
  }

  toggleMultiMoveTarget(e: Event, gameObject: GameCharacter) {
    if (!(e.target instanceof HTMLInputElement)) {
      return;
    }
    if (e.target.checked) {
      this.multiMoveTargets.update((s) => new Set(s).add(gameObject.identifier));
    } else {
      this.multiMoveTargets.update((s) => {
        const n = new Set(s);
        n.delete(gameObject.identifier);
        return n;
      });
    }
  }

  allTabBoxCheck() {
    if (this.existsMultiMoveSelectedInTab()) {
      this.multiMoveTargets.update((s) => {
        const n = new Set(s);
        this.getGameObjects(this.selectTab()).forEach((x) => n.delete(x.identifier));
        return n;
      });
    } else {
      this.multiMoveTargets.update((s) => {
        const n = new Set(s);
        this.getGameObjects(this.selectTab()).forEach((x) => n.add(x.identifier));
        return n;
      });
    }
  }

  onMultiMoveContextMenu() {
    if (!this.pointerDeviceService.isAllowedToOpenContextMenu) return;

    const position = this.pointerDeviceService.pointers[0];
    const actions = buildInventoryMultiMoveContextMenu(
      this.selectTab(),
      {
        multiMove: (loc) => this.multiMove(loc),
        toggleMultiMove: () => this.toggleMultiMove(),
        multiDelete: () => this.multiDelete(),
      },
      this.t
    );

    this.contextMenuService.open(position, actions, this.t('feature.inventory.contextMenu.multiMoveTitle'));
  }

  multiMove(location: string) {
    for (const gameObjectIdentifier of this.multiMoveTargets()) {
      const gameObject = this.objectStore.get(gameObjectIdentifier);
      if (gameObject instanceof GameCharacter) {
        gameObject.setLocation(location);
      }
    }
  }

  moveToAndClose(location: string) {
    this.multiMove(location);
    this.toggleMultiMove();
    SoundEffect.play(PresetSound.piecePut);
  }

  multiSetHideInventory(hide: boolean) {
    for (const gameObjectIdentifier of this.multiMoveTargets()) {
      const gameObject = this.objectStore.get<GameCharacter>(gameObjectIdentifier);
      if (gameObject instanceof GameCharacter) {
        gameObject.hideInventory = hide;
      }
    }
    this.inventoryService.notifyInventoryUpdate();
    this.toggleMultiMove();
    SoundEffect.play(PresetSound.sweep);
  }

  deleteAndClose() {
    if (this.multiDelete()) {
      this.toggleMultiMove();
      SoundEffect.play(PresetSound.sweep);
    }
  }

  multiDelete(): boolean {
    const inGraveyard: Set<GameCharacter> = new Set();
    for (const gameObjectIdentifier of this.multiMoveTargets()) {
      const gameObject = this.objectStore.get<GameCharacter>(gameObjectIdentifier);
      if (gameObject instanceof GameCharacter && gameObject.location.name == 'graveyard') {
        inGraveyard.add(gameObject);
      }
    }
    if (inGraveyard.size < 1) return false;

    if (!confirm(this.t('feature.inventory.panel.confirmMultiDelete', { count: inGraveyard.size }))) return false;
    for (const gameObject of inGraveyard) {
      this.deleteGameObject(gameObject);
    }
    return true;
  }

  private cloneGameObject(gameObject: TabletopObject) {
    gameObject.clone();
  }

  private showDetail(gameObject: GameCharacter) {
    this.selectionSignalService.selectObject(gameObject.identifier, gameObject.aliasName);
    const coordinate = this.pointerDeviceService.pointers[0];
    const title = gameObject.name.length
      ? this.t('feature.character.panel.sheetWithName', { name: gameObject.name })
      : this.t('feature.character.panel.sheet');
    const option: PanelOption = {
      title: title,
      left: coordinate.x - 800,
      top: coordinate.y - 300,
      width: 800,
      height: 600,
    };
    this.panelService.openLazy(
      () =>
        import('@axe/features/character/game-character-sheet/game-character-sheet.component').then(
          (m) => m.GameCharacterSheetComponent
        ),
      option,
      (component) => (component.tabletopObject = gameObject)
    );
  }

  private showChatPalette(gameObject: GameCharacter) {
    const coordinate = this.pointerDeviceService.pointers[0];
    const option: PanelOption = {
      title: this.t('feature.character.panel.chatPaletteWithName', { name: gameObject.name }),
      left: coordinate.x - 320,
      top: coordinate.y - 250,
      width: 760,
      height: 500,
    };
    this.panelService.openLazy(
      () => import('@axe/features/chat/chat-palette/chat-palette.component').then((m) => m.ChatPaletteComponent),
      option,
      (component) => component.character.set(gameObject)
    );
  }

  private showRemoteController(gameObject: GameCharacter) {
    const coordinate = this.pointerDeviceService.pointers[0];
    const option: PanelOption = {
      title: this.t('feature.character.panel.remoteControllerWithName', { name: gameObject.name }),
      left: coordinate.x - 250,
      top: coordinate.y - 175,
      width: 700,
      height: 600,
    };
    this.panelService.openLazy(
      () =>
        import('@axe/features/controller/remote-controller/remote-controller.component').then(
          (m) => m.RemoteControllerComponent
        ),
      option,
      (component) => component.character.set(gameObject)
    );
  }

  protected focusToObject(e: Event, gameObject: TabletopObject) {
    if (!(e.target instanceof HTMLElement)) {
      return;
    }
    if (FOCUS_BLOCKED_TAGS.has(e.target.tagName.toLowerCase())) {
      return;
    }
    if (gameObject.location.name != 'table') {
      return;
    }
    this.selectionSignalService.focusToCoordinate(gameObject.location.x, gameObject.location.y);
  }

  selectGameObject(gameObject: GameObject) {
    if (this.isMultiMove()) {
      if (this.multiMoveTargets().has(gameObject.identifier)) {
        this.multiMoveTargets.update((s) => {
          const n = new Set(s);
          n.delete(gameObject.identifier);
          return n;
        });
      } else {
        this.multiMoveTargets.update((s) => new Set(s).add(gameObject.identifier));
      }
    }
    this.selectionSignalService.selectObject(gameObject.identifier, gameObject.aliasName);
    this.selectionSignalService.highlightObject(gameObject.identifier);
  }

  private deleteGameObject(gameObject: GameObject) {
    gameObject.destroy();
  }
}
