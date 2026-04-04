import { NgClass, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Network } from '@axe/core/index';
import { PointerDeviceService } from '@axe/core/input/pointer-device.service';
import { GameObject } from '@axe/core/sync/game-object';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { DataElement } from '@axe/domain/data/data-element';
import { SortOrder } from '@axe/domain/data/data-summary-setting';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';
import { GameObjectInventoryService } from '@axe/shared/inventory/game-object-inventory.service';
import { SafePipe } from '@axe/shared/pipes/safe.pipe';
import { ObjectChangeService } from '@axe/shared/sync/object-change.service';
import { ContextMenuAction, ContextMenuSeparator, ContextMenuService } from '@axe/shared/ui/context-menu.service';
import { PanelOption, PanelService } from '@axe/shared/ui/panel.service';
import { SelectionSignalService } from '@axe/shared/ui/selection-signal.service';

const FOCUS_BLOCKED_TAGS = new Set(['input', 'button']);

@Component({
  selector: 'game-object-inventory',
  templateUrl: './game-object-inventory.component.html',
  styleUrls: ['./game-object-inventory.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, NgClass, FormsModule, SafePipe],
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

  constructor() {
    effect(() => {
      const selection = this.selectionSignalService.selectedObject();
      if (selection && this.objectStore.get(selection.identifier) instanceof TabletopObject) {
        this.selectedIdentifier.set(selection.identifier);
      }
    });
    queueMicrotask(() => (this.panelService.title = 'インベントリ'));
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
    return this.sortOrder === SortOrder.ASC ? '昇順' : '降順';
  }
  get sortOrderName2nd(): string {
    return this.sortOrder2nd === SortOrder.ASC ? '昇順' : '降順';
  }

  get newLineString(): string {
    return this.inventoryService.newLineString;
  }

  getTabTitle(inventoryType: string) {
    switch (inventoryType) {
      case 'table':
        return 'テーブル';
      case Network.peerId:
        return '個人';
      case 'graveyard':
        return '墓場';
      default:
        return '共有';
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

    const actions: ContextMenuAction[] = [];

    actions.push({
      name: '詳細を表示',
      action: () => {
        this.showDetail(gameObject as GameCharacter);
      },
    });
    if (gameObject.location.name !== 'graveyard') {
      actions.push({
        name: 'チャットパレットを表示',
        action: () => {
          this.showChatPalette(gameObject as GameCharacter);
        },
      });
      actions.push({
        name: 'リモコンを表示',
        action: () => {
          this.showRemoteController(gameObject as GameCharacter);
        },
      });
    }
    actions.push(ContextMenuSeparator);
    const locations = [
      { name: 'table', alias: 'テーブルに移動' },
      { name: 'common', alias: '共有イベントリに移動' },
      { name: Network.peerId, alias: '個人イベントリに移動' },
      { name: 'graveyard', alias: '墓場に移動' },
    ];
    for (const location of locations) {
      if (gameObject.location.name === location.name) continue;
      actions.push({
        name: location.alias,
        action: () => {
          gameObject.setLocation(location.name);
          SoundEffect.play(PresetSound.piecePut);
        },
      });
    }

    if (gameObject.location.name === 'graveyard') {
      actions.push({
        name: '削除する',
        action: () => {
          this.deleteGameObject(gameObject);
          SoundEffect.play(PresetSound.sweep);
        },
      });
    }
    actions.push(ContextMenuSeparator);
    actions.push({
      name: 'コピーを作る',
      action: () => {
        this.cloneGameObject(gameObject);
        SoundEffect.play(PresetSound.piecePut);
      },
    });

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
    if (!confirm(`${tabTitle}に存在する${gameObjects.length}個の要素を完全に削除しますか？`)) return;
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
    const actions: ContextMenuAction[] = [];
    const locations = [
      { name: 'table', alias: 'テーブルに移動' },
      { name: 'common', alias: '共有イベントリに移動' },
      { name: Network.peerId, alias: '個人イベントリに移動' },
      { name: 'graveyard', alias: '墓場に移動' },
    ];
    for (const location of locations) {
      if (this.selectTab() === location.name) continue;
      actions.push({
        name: location.alias,
        action: () => {
          this.multiMove(location.name);
          this.toggleMultiMove();
          SoundEffect.play(PresetSound.piecePut);
        },
      });
    }
    if (this.selectTab() == 'graveyard') {
      actions.push({
        name: '墓場から削除',
        action: () => {
          this.multiDelete();
          this.toggleMultiMove();
          SoundEffect.play(PresetSound.sweep);
        },
      });
    }

    this.contextMenuService.open(position, actions, '一括移動');
  }

  multiMove(location: string) {
    for (const gameObjectIdentifier of this.multiMoveTargets()) {
      const gameObject = this.objectStore.get(gameObjectIdentifier);
      if (gameObject instanceof GameCharacter) {
        gameObject.setLocation(location);
      }
    }
  }

  multiDelete() {
    const inGraveyard: Set<GameCharacter> = new Set();
    for (const gameObjectIdentifier of this.multiMoveTargets()) {
      const gameObject = this.objectStore.get<GameCharacter>(gameObjectIdentifier);
      if (gameObject instanceof GameCharacter && gameObject.location.name == 'graveyard') {
        inGraveyard.add(gameObject);
      }
    }
    if (inGraveyard.size < 1) return;

    if (!confirm(`選択したもののうち墓場に存在する${inGraveyard.size}個の要素を完全に削除しますか？`)) return;
    for (const gameObject of inGraveyard) {
      this.deleteGameObject(gameObject);
    }
  }

  private cloneGameObject(gameObject: TabletopObject) {
    gameObject.clone();
  }

  private showDetail(gameObject: GameCharacter) {
    this.selectionSignalService.selectObject(gameObject.identifier, gameObject.aliasName);
    const coordinate = this.pointerDeviceService.pointers[0];
    let title = 'キャラクターシート';
    if (gameObject.name.length) title += ' - ' + gameObject.name;
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
      left: coordinate.x - 250,
      top: coordinate.y - 175,
      width: 615,
      height: 350,
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
      (component) => (component.character = gameObject)
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
