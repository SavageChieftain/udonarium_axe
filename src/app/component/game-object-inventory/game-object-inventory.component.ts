import { NgClass, NgTemplateOutlet } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  effect,
  inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GameObject } from '@axe/class/core/synchronize-object/game-object';
import { ObjectStore } from '@axe/class/core/synchronize-object/object-store';
import { EventSystem, Network } from '@axe/class/core/system';
import { DataElement } from '@axe/class/data-element';
import { SortOrder } from '@axe/class/data-summary-setting';
import { GameCharacter } from '@axe/class/game-character';
import { PresetSound, SoundEffect } from '@axe/class/sound-effect';
import { TabletopObject } from '@axe/class/tabletop-object';
import { ChatPaletteComponent } from '@axe/component/chat-palette/chat-palette.component';
import { GameCharacterSheetComponent } from '@axe/component/game-character-sheet/game-character-sheet.component';
import { RemoteControllerComponent } from '@axe/component/remote-controller/remote-controller.component';
import { SafePipe } from '@axe/pipe/safe.pipe';
import { ContextMenuAction, ContextMenuSeparator, ContextMenuService } from '@axe/service/context-menu.service';
import { GameObjectInventoryService } from '@axe/service/game-object-inventory.service';
import { PanelOption, PanelService } from '@axe/service/panel.service';
import { PointerDeviceService } from '@axe/service/pointer-device.service';
import { SelectionSignalService } from '@axe/service/selection-signal.service';

@Component({
  selector: 'game-object-inventory',
  templateUrl: './game-object-inventory.component.html',
  styleUrls: ['./game-object-inventory.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, NgClass, FormsModule, SafePipe],
})
export class GameObjectInventoryComponent implements OnInit, AfterViewInit, OnDestroy {
  private changeDetector = inject(ChangeDetectorRef);
  private panelService = inject(PanelService);
  private inventoryService = inject(GameObjectInventoryService);
  private contextMenuService = inject(ContextMenuService);
  private pointerDeviceService = inject(PointerDeviceService);
  private objectStore = inject(ObjectStore);
  private selectionSignalService = inject(SelectionSignalService);

  inventoryTypes: string[] = ['table', 'common', 'graveyard'];

  selectTab: string = 'table';
  selectedIdentifier: string = '';
  multiMoveTargets: Set<string> = new Set();

  isEdit: boolean = false;
  isMultiMove: boolean = false;
  disptimer: ReturnType<typeof setInterval> = null!;

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

  ngOnInit() {
    queueMicrotask(() => (this.panelService.title = 'インベントリ'));
    effect(() => {
      const selection = this.selectionSignalService.selectedObject();
      if (selection && this.objectStore.get(selection.identifier) instanceof TabletopObject) {
        this.selectedIdentifier = selection.identifier;
        this.changeDetector.markForCheck();
      }
    });
    effect(() => {
      this.inventoryService.inventoryVersion();
      this.changeDetector.markForCheck();
    });
    EventSystem.register(this)
      .on('SYNCHRONIZE_FILE_LIST', (event) => {
        if (event.isSendFromSelf) this.changeDetector.markForCheck();
      })
      .on('OPEN_NETWORK', (_event) => {
        this.inventoryTypes = ['table', 'common', Network.peerId, 'graveyard'];
        if (!this.inventoryTypes.includes(this.selectTab)) {
          this.selectTab = Network.peerId;
        }
      });
    this.inventoryTypes = ['table', 'common', Network.peerId, 'graveyard'];
  }

  ngAfterViewInit() {
    this.disptimer = setInterval(() => {
      this.changeDetector.detectChanges();
    }, 200);
    // インベントリ非表示機能のために追加、操作を検知して更新する方式に変えたい
  }

  ngOnDestroy() {
    EventSystem.unregister(this);
    if (this.disptimer) {
      clearInterval(this.disptimer);
    }
    this.disptimer = null!;
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
    switch (inventoryType) {
      case 'table': {
        const tableCharacterList_dest = [];
        const tableCharacterList_scr = this.inventoryService.tableInventory.tabletopObjects;
        for (const character of tableCharacterList_scr) {
          const character_: GameCharacter = <GameCharacter>character;
          if (!character_.hideInventory) tableCharacterList_dest.push(<TabletopObject>character);
        }
        return tableCharacterList_dest;
      }

      default:
        return this.getInventory(inventoryType).tabletopObjects;
    }
  }

  getInventoryTags(gameObject: GameCharacter): DataElement[] {
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

    this.contextMenuService.open(position, actions, (gameObject as unknown as { name: string }).name);
  }

  toggleEdit() {
    this.isEdit = !this.isEdit;
  }

  toggleMultiMove() {
    if (this.isMultiMove) {
      this.multiMoveTargets.clear();
    }
    this.isMultiMove = !this.isMultiMove;
  }

  cleanInventory() {
    const tabTitle = this.getTabTitle(this.selectTab);
    const gameObjects = this.getGameObjects(this.selectTab);
    if (!confirm(`${tabTitle}に存在する${gameObjects.length}個の要素を完全に削除しますか？`)) return;
    for (const gameObject of gameObjects) {
      this.deleteGameObject(gameObject);
    }
    SoundEffect.play(PresetSound.sweep);
  }

  existsMultiMoveSelectedInTab(): boolean {
    return this.getGameObjects(this.selectTab).some((x) => this.multiMoveTargets.has(x.identifier));
  }

  toggleMultiMoveTarget(e: Event, gameObject: GameCharacter) {
    if (!(e.target instanceof HTMLInputElement)) {
      return;
    }
    if (e.target.checked) {
      this.multiMoveTargets.add(gameObject.identifier);
    } else {
      this.multiMoveTargets.delete(gameObject.identifier);
    }
  }

  allTabBoxCheck() {
    if (this.existsMultiMoveSelectedInTab()) {
      this.getGameObjects(this.selectTab).forEach((x) => this.multiMoveTargets.delete(x.identifier));
    } else {
      this.getGameObjects(this.selectTab).forEach((x) => this.multiMoveTargets.add(x.identifier));
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
      if (this.selectTab === location.name) continue;
      actions.push({
        name: location.alias,
        action: () => {
          this.multiMove(location.name);
          this.toggleMultiMove();
          SoundEffect.play(PresetSound.piecePut);
        },
      });
    }
    if (this.selectTab == 'graveyard') {
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
    for (const gameObjectIdentifier of this.multiMoveTargets) {
      const gameObject = this.objectStore.get(gameObjectIdentifier);
      if (gameObject instanceof GameCharacter) {
        gameObject.setLocation(location);
      }
    }
  }

  multiDelete() {
    const inGraveyard: Set<GameCharacter> = new Set();
    for (const gameObjectIdentifier of this.multiMoveTargets) {
      const gameObject: GameCharacter = this.objectStore.get(gameObjectIdentifier);
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
    const component = this.panelService.open<GameCharacterSheetComponent>(GameCharacterSheetComponent, option);
    component.tabletopObject = gameObject;
  }

  private showChatPalette(gameObject: GameCharacter) {
    const coordinate = this.pointerDeviceService.pointers[0];
    const option: PanelOption = {
      left: coordinate.x - 250,
      top: coordinate.y - 175,
      width: 615,
      height: 350,
    };
    const component = this.panelService.open<ChatPaletteComponent>(ChatPaletteComponent, option);
    component.character = gameObject;
  }

  private showRemoteController(gameObject: GameCharacter) {
    const coordinate = this.pointerDeviceService.pointers[0];
    const option: PanelOption = {
      left: coordinate.x - 250,
      top: coordinate.y - 175,
      width: 700,
      height: 600,
    };
    const component = this.panelService.open<RemoteControllerComponent>(RemoteControllerComponent, option);
    component.character = gameObject;
  }

  protected focusToObject(e: Event, gameObject: TabletopObject) {
    if (!(e.target instanceof HTMLElement)) {
      return;
    }
    if (new Set(['input', 'button']).has(e.target.tagName.toLowerCase())) {
      return;
    }
    if (gameObject.location.name != 'table') {
      return;
    }
    this.selectionSignalService.focusToCoordinate(gameObject.location.x, gameObject.location.y);
  }

  selectGameObject(gameObject: GameObject) {
    if (this.isMultiMove) {
      if (this.multiMoveTargets.has(gameObject.identifier)) {
        this.multiMoveTargets.delete(gameObject.identifier);
      } else {
        this.multiMoveTargets.add(gameObject.identifier);
      }
    }
    this.selectionSignalService.selectObject(gameObject.identifier, gameObject.aliasName);
    this.selectionSignalService.highlightObject(gameObject.identifier);
  }

  private deleteGameObject(gameObject: GameObject) {
    gameObject.destroy();
    this.changeDetector.markForCheck();
  }

  trackByGameObject(index: number, gameObject: GameObject) {
    return gameObject ? gameObject.identifier : index;
  }
}
