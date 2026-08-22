import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { GameObjectInventoryService } from '@axe/application/inventory/game-object-inventory.service';
import { DisclosureService } from '@axe/application/permission/disclosure.service';
import { RolePermissionService } from '@axe/application/permission/role-permission.service';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { TurnOrderService } from '@axe/application/turn/turn-order.service';
import { ContextMenuService } from '@axe/application/ui/context-menu.service';
import { PanelOption, PanelService } from '@axe/application/ui/panel.service';
import { SelectionSignalService } from '@axe/application/ui/selection-signal.service';
import { sheetPanelBox } from '@axe/application/ui/sheet-panel';
import { Network } from '@axe/core/index';
import { PointerDeviceService } from '@axe/core/input/pointer-device.service';
import { GameObject } from '@axe/core/sync/game-object';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { DataElement } from '@axe/domain/data/data-element';
import { SortOrder } from '@axe/domain/data/data-summary-setting';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { OwnedTabletopObject } from '@axe/domain/tabletop/owned-tabletop-object';
import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';
import { NpcDragService } from '@axe/features/gm-tools/npc-bar/npc-drag.service';
import {
  buildInventoryMultiMoveContextMenu,
  buildInventoryObjectContextMenu,
} from '@axe/features/inventory/game-object-inventory/game-object-inventory-context-menu';
import {
  buildInventoryRow,
  filterInventoryRows,
  type InventoryRow,
  splitSearchTerms,
} from '@axe/features/inventory/game-object-inventory/inventory-list';
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
  private readonly turnOrderService = inject(TurnOrderService);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly rolePermission = inject(RolePermissionService);
  private readonly disclosureService = inject(DisclosureService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly npcDrag = inject(NpcDragService);
  private readonly t = inject(TRANSLATE_FN);

  private npcDragPending: { character: GameCharacter; startX: number; startY: number; dragging: boolean } | null = null;
  private suppressNextClick = false;

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

  readonly searchQuery = signal('');
  readonly searchTerms = computed<string[]>(() => splitSearchTerms(this.searchQuery()));
  readonly hasQuery = computed<boolean>(() => this.searchTerms().length > 0);

  clearSearch(): void {
    this.searchQuery.set('');
  }

  setTurnOrder(event: Event, gameObject: GameObject): void {
    event.stopPropagation();
    this.turnOrderService.setCurrent(gameObject.identifier);
  }

  readonly isPanelMinimized = computed(() => this.panelService.isMinimized());

  readonly turnOrderList = computed<GameCharacter[]>(() => {
    this.inventoryService.inventoryVersion();
    if (PeerCursor.myCursor) this.objectChange.versionOf(PeerCursor.myCursor.identifier)();
    return this.turnOrderService.orderedCharacters(this.rolePermission.canSeeHidden);
  });

  readonly currentTurnId = computed<string>(() => {
    this.objectChange.versionOf('TurnState')();
    return this.turnOrderService.currentIdentifier;
  });

  readonly turnRound = computed<number>(() => {
    this.objectChange.versionOf('TurnState')();
    return this.turnOrderService.round;
  });

  selectTurn(character: GameCharacter): void {
    this.turnOrderService.setCurrent(character.identifier);
  }

  turnNext(): void {
    this.turnOrderService.next();
  }

  turnPrev(): void {
    this.turnOrderService.prev();
  }

  turnReset(): void {
    this.turnOrderService.reset();
  }

  readonly buffDecay = computed<boolean>(() => {
    this.objectChange.versionOf('TurnState')();
    return this.turnOrderService.buffDecay;
  });

  toggleBuffDecay(): void {
    this.turnOrderService.setBuffDecay(!this.turnOrderService.buffDecay);
  }

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

  private baseObjectsOf(inventoryType: string): TabletopObject[] {
    switch (inventoryType) {
      case 'table': {
        const all = this.inventoryService.tableInventory.tabletopObjects as GameCharacter[];
        const showHidden = this.isMultiMove() || this.isEdit() || this.rolePermission.canSeeHidden;
        return showHidden ? [...all] : all.filter((character) => !character.hideInventory);
      }

      default:
        return this.getInventory(inventoryType).tabletopObjects;
    }
  }

  readonly visibleRows = computed<InventoryRow[]>(() => {
    this.inventoryService.inventoryVersion();
    this.objectChange.fileVersion();
    this.objectChange.collectionOf('character')();
    this.objectChange.collectionOf('PeerCursor')();
    if (PeerCursor.myCursor) this.objectChange.versionOf(PeerCursor.myCursor.identifier)();
    const inventoryType = this.selectTab();
    return this.baseObjectsOf(inventoryType).map((object) =>
      buildInventoryRow({
        object,
        folderName: object instanceof GameCharacter ? object.folderName : '',
        ownerName: object instanceof OwnedTabletopObject ? object.ownerName : '',
        elementTexts: this.canView(object) ? this.elementTextsOf(inventoryType, object) : [],
      })
    );
  });

  readonly filteredRows = computed<InventoryRow[]>(() => filterInventoryRows(this.visibleRows(), this.searchTerms()));

  private elementTextsOf(inventoryType: string, object: TabletopObject): string[] {
    const elements = this.getInventory(inventoryType).dataElementMap.get(object.identifier) ?? [];
    const texts: string[] = [];
    for (const element of elements) {
      if (!element || element.name === this.newLineString) continue;
      texts.push(`${element.value}`);
    }
    return texts;
  }

  isInventoryHiddenObject(gameObject: TabletopObject): boolean {
    return gameObject instanceof GameCharacter && gameObject.hideInventory;
  }

  canView(gameObject: TabletopObject): boolean {
    if (PeerCursor.myCursor) this.objectChange.versionOf(PeerCursor.myCursor.identifier)();
    if (gameObject instanceof GameCharacter) return this.disclosureService.canView(gameObject);
    return true;
  }

  getInventoryTags(gameObject: GameCharacter): (DataElement | null)[] {
    return this.getInventory(gameObject.location.name).dataElementMap.get(gameObject.identifier) ?? [];
  }

  onContextMenu(e: Event, gameObject: TabletopObject) {
    if (document.activeElement instanceof HTMLInputElement && document.activeElement.getAttribute('type') !== 'range')
      return;
    e.stopPropagation();
    e.preventDefault();

    if (!this.canView(gameObject)) return;
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
    if (!this.rolePermission.canEditTabletop) return;
    this.isEdit.update((v) => !v);
  }

  toggleMultiMove() {
    if (this.isMultiMove()) {
      this.multiMoveTargets.set(new Set());
    }
    this.isMultiMove.update((v) => !v);
  }

  cleanInventory() {
    if (!this.rolePermission.canEditTabletop) return;
    const rows = this.filteredRows();
    const message = this.hasQuery()
      ? this.t('feature.inventory.panel.confirmCleanFiltered', { count: rows.length })
      : this.t('feature.inventory.panel.confirmCleanTab', {
          tab: this.getTabTitle(this.selectTab()),
          count: rows.length,
        });
    if (!confirm(message)) return;
    for (const row of rows) {
      this.deleteGameObject(row.object);
    }
    SoundEffect.play(PresetSound.sweep);
  }

  existsMultiMoveSelectedInTab(): boolean {
    return this.filteredRows().some((row) => this.multiMoveTargets().has(row.identifier));
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
    const rows = this.filteredRows();
    if (this.existsMultiMoveSelectedInTab()) {
      this.multiMoveTargets.update((s) => {
        const n = new Set(s);
        rows.forEach((row) => n.delete(row.identifier));
        return n;
      });
    } else {
      this.multiMoveTargets.update((s) => {
        const n = new Set(s);
        rows.forEach((row) => n.add(row.identifier));
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
    if (!this.rolePermission.canEditTabletop) return;
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
    if (!this.rolePermission.canEditTabletop) return;
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
    if (!this.rolePermission.canEditTabletop) return false;
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
    if (!this.rolePermission.canEditTabletop) return;
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
      ...sheetPanelBox(coordinate, 760, 500),
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
    if (!this.canView(gameObject)) return;
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

  onObjectDragBlock(event: Event, gameObject: GameObject): void {
    if (gameObject instanceof GameCharacter && PeerCursor.isMyselfGameMaster) event.stopPropagation();
  }

  onObjectPointerDown(event: PointerEvent, gameObject: GameObject): void {
    if (event.button !== 0 || !(gameObject instanceof GameCharacter) || !PeerCursor.isMyselfGameMaster) return;
    if ((event.target as HTMLElement).closest('button, input')) return;
    this.npcDragPending = { character: gameObject, startX: event.clientX, startY: event.clientY, dragging: false };
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  onObjectPointerMove(event: PointerEvent): void {
    const pending = this.npcDragPending;
    if (!pending) return;
    if (!pending.dragging) {
      if (Math.hypot(event.clientX - pending.startX, event.clientY - pending.startY) < 6) return;
      pending.dragging = true;
      this.npcDrag.begin(pending.character, event.clientX, event.clientY);
    } else {
      this.npcDrag.move(event.clientX, event.clientY);
    }
  }

  onObjectPointerUp(event: PointerEvent): void {
    const pending = this.npcDragPending;
    this.npcDragPending = null;
    if (!pending) return;
    (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
    if (!pending.dragging) return;
    this.suppressNextClick = true;
    const target = document.elementFromPoint(event.clientX, event.clientY);
    this.npcDrag.end(!!target?.closest('.npc-bar-dropzone'));
  }

  selectGameObject(gameObject: GameObject) {
    if (this.suppressNextClick) {
      this.suppressNextClick = false;
      return;
    }
    if (gameObject instanceof GameCharacter && !this.canView(gameObject)) return;
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
    if (!this.rolePermission.canEditTabletop) return;
    gameObject.destroy();
  }
}
