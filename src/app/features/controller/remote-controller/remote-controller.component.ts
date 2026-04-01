import { NgClass, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, DestroyRef, effect, ElementRef, inject, viewChild } from '@angular/core';
import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Network } from '@axe/core/index';
import { PointerDeviceService } from '@axe/core/input/pointer-device.service';
import { GameObject } from '@axe/core/sync/game-object';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { ChatPalette } from '@axe/domain/chat/chat-palette';
import { ChatTab } from '@axe/domain/chat/chat-tab';
import { DataElement } from '@axe/domain/data/data-element';
import { SortOrder } from '@axe/domain/data/data-summary-setting';
import { DiceBot } from '@axe/domain/dice/dice-bot';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';
import { GameCharacterBuffViewComponent } from '@axe/features/character/game-character-buff-view/game-character-buff-view.component';
import { ControllerInputComponent } from '@axe/features/controller/controller-input/controller-input.component';
import {
  addBuffRound,
  parseBuffInput,
  RemoteControllerSelect,
  sendDecBuffRoundMessage,
  sendDeleteZeroRoundBuffMessage,
} from '@axe/features/controller/remote-controller/remote-controller-buff';
import {
  getGameObjects,
  getInventory,
  getInventoryTags,
  getTabTitle,
  getTargetCharacters,
} from '@axe/features/controller/remote-controller/remote-controller-helpers';
import { ChatMessageService } from '@axe/shared/chat/chat-message.service';
import { GameObjectInventoryService } from '@axe/shared/inventory/game-object-inventory.service';
import { SafePipe } from '@axe/shared/pipes/safe.pipe';
import { ObjectChangeService } from '@axe/shared/sync/object-change.service';
import { PanelOption, PanelService } from '@axe/shared/ui/panel.service';
import { SelectionSignalService } from '@axe/shared/ui/selection-signal.service';
import { UiSignalService } from '@axe/shared/ui/ui-signal.service';
import GameSystemClass from 'bcdice/lib/game_system';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'remote-controller',
  templateUrl: './remote-controller.component.html',
  styleUrls: ['./remote-controller.component.css'],
  imports: [FormsModule, ControllerInputComponent, NgClass, NgTemplateOutlet, SafePipe],
})
export class RemoteControllerComponent implements OnInit, OnDestroy, AfterViewInit {
  chatMessageService = inject(ChatMessageService);
  private panelService = inject(PanelService);
  private inventoryService = inject(GameObjectInventoryService);
  private pointerDeviceService = inject(PointerDeviceService);
  private objectStore = inject(ObjectStore);
  private selectionSignalService = inject(SelectionSignalService);
  private uiSignalService = inject(UiSignalService);
  private objectChange = inject(ObjectChangeService);
  private destroyRef = inject(DestroyRef);

  get palette(): ChatPalette {
    return this.character?.remoteController ?? null!;
  }

  private _gameSystem!: GameSystemClass;

  get gameType(): string {
    return this._gameSystem == null ? '' : this._gameSystem.ID;
  }
  set gameType(gameType: string) {
    DiceBot.loadGameSystemAsync(gameType).then((gameSystem) => {
      this._gameSystem = gameSystem;
      if (this.character?.remoteController) {
        this.character.remoteController.dicebot = gameSystem.ID;
      }
    });
  }

  get sendFrom(): string {
    return this.character?.identifier ?? '';
  }
  set sendFrom(sendFrom: string) {
    this.onSelectedCharacter(sendFrom);
  }

  get diceBotInfos() {
    return DiceBot.diceBotInfos;
  }

  get chatTab(): ChatTab {
    return this.objectStore.get<ChatTab>(this.chatTabidentifier)!;
  }
  get myPeer(): PeerCursor {
    return PeerCursor.myCursor;
  }
  get otherPeers(): PeerCursor[] {
    return this.objectStore.getObjects(PeerCursor);
  }

  constructor() {
    effect(() => {
      this.uiSignalService.targetChange();
    });
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

  get newLineString(): string {
    return this.inventoryService.newLineString;
  }
  readonly controllerInputComponent = viewChild.required<ControllerInputComponent>('controllerInput');
  readonly chatPaletteElementRef = viewChild<ElementRef<HTMLSelectElement>>('chatPalette');
  character: GameCharacter | null = null;
  errorMessageBuff = '';
  errorMessageController = '';

  private _gameType = '';
  text = '';

  get buffHideIsChk(): boolean {
    return this.controllerInputComponent()?.buffHideIsChk ?? false;
  }
  onInput() {
    this.controllerInputComponent()?.onInput();
  }

  public buffAreaIsHide = false;
  public controllerAreaIsHide = false;

  chatTabidentifier = '';
  remoteNumber = 0;

  recoveryLimitFlag = false;
  recoveryLimitFlagMin = false;
  selectCharacter: GameObject | null = null;

  remoteControllerSelect: RemoteControllerSelect = {
    name: '',
    nowOrMax: '',
    dispName: '',
  };
  remoteControllerRadio = '';

  remoteControlleridentifier: string[] = ['test01', 'test02'];
  inputText = '';
  isEdit = false;
  editPalette = '';

  private doubleClickTimer: ReturnType<typeof setTimeout> | null = null;
  charList: string[] = [];

  inventoryTypes: string[] = ['table', 'common', 'graveyard'];
  selectTab = 'table';

  hideChkBoxEvent(eventValue: boolean) {
    this.buffAreaIsHide = eventValue;
  }
  controllerHideChkChange(eventValue: boolean) {
    this.controllerAreaIsHide = eventValue;
  }
  recoveryLimitFlagChange(_value: boolean) {
    // 現状特に処理なし
  }

  reverseValue() {
    this.remoteNumber = -this.remoteNumber;
  }

  remoteSelect(name: string, nowOrMax: string, dispName: string) {
    this.remoteControllerSelect.name = name;
    this.remoteControllerSelect.nowOrMax = nowOrMax;
    this.remoteControllerSelect.dispName = dispName;
  }

  charListChange(charName: string, checked: boolean) {
    if (checked) {
      if (!this.charList.includes(charName)) {
        this.charList.push(charName);
      }
    } else {
      const index = this.charList.indexOf(charName);
      if (index >= 0) {
        this.charList.splice(index, 1);
      }
    }
  }

  ngOnInit() {
    queueMicrotask(() => this.updatePanelTitle());
    this.chatTabidentifier = this.chatMessageService.chatTabs[0]?.identifier ?? '';
    this.gameType = this.character?.remoteController ? this.character.remoteController.dicebot : '';
    this.objectChange.objectDeleted$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((e) => {
      if (this.character && this.character.identifier === e.identifier) {
        this.panelService.close();
      }
      if (this.chatTabidentifier === e.identifier) {
        this.chatTabidentifier = this.chatMessageService.chatTabs[0]?.identifier ?? '';
      }
    });

    this.objectChange.networkOpen$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.inventoryTypes = ['table', 'common', Network.peerId, 'graveyard'];
      if (!this.inventoryTypes.includes(this.selectTab)) {
        this.selectTab = Network.peerId;
      }
    });
    this.inventoryTypes = ['table', 'common', Network.peerId, 'graveyard'];
  }

  ngOnDestroy() {
    if (this.isEdit) {
      this.toggleEditMode();
    }
  }

  updatePanelTitle() {
    this.panelService.title = this.character ? this.character.name + ' のリモコン' : 'リモコン';
  }

  onSelectedCharacter(identifier: string) {
    if (this.isEdit) {
      this.toggleEditMode();
    }
    const object = this.objectStore.get(identifier);
    if (object instanceof GameCharacter) {
      this.character = object;
      const gameType = this.character.remoteController ? this.character.remoteController.dicebot : '';
      if (0 < gameType.length) {
        this.gameType = gameType;
      }
    }
    this.updatePanelTitle();
  }

  selectPalette(line: string) {
    this.text = line;
  }

  clickPalette(line: string) {
    if (this.doubleClickTimer && this.text === line) {
      clearTimeout(this.doubleClickTimer);
      this.doubleClickTimer = null;
      this.controllerInputComponent().sendChat(null);
    } else {
      this.text = line;
      this.doubleClickTimer = setTimeout(() => {
        this.doubleClickTimer = null;
      }, 400);
    }
  }

  resetPaletteSelect() {
    if (!this.chatPaletteElementRef()?.nativeElement) {
      return;
    }
    this.chatPaletteElementRef()!.nativeElement.selectedIndex = -1;
  }

  toggleEditMode() {
    this.isEdit = this.isEdit ? false : true;
    if (this.isEdit) {
      this.editPalette = this.palette.value + '';
    } else {
      this.palette.setPalette(this.editPalette);
    }
  }

  ngAfterViewInit() {}

  getTabTitle(inventoryType: string) {
    return getTabTitle(inventoryType);
  }

  getInventory(inventoryType: string) {
    return getInventory(inventoryType, this.inventoryService);
  }

  getGameObjects(inventoryType: string): TabletopObject[] {
    this.inventoryService.inventoryVersion();
    this.objectChange.fileVersion();
    this.objectChange.collectionOf('character')();
    return getGameObjects(inventoryType, this.inventoryService);
  }

  getInventoryTags(gameObject: GameCharacter): DataElement[] {
    return getInventoryTags(gameObject, this.inventoryService);
  }

  toggleEdit() {
    this.isEdit = !this.isEdit;
  }

  selectGameObject(gameObject: GameObject) {
    this.selectionSignalService.selectObject(gameObject.identifier, gameObject.aliasName);
    this.selectCharacter = gameObject;
  }

  getTargetCharacters(checkedOnly: boolean): GameCharacter[] {
    const objectList = this.getGameObjects(this.selectTab);
    return getTargetCharacters(objectList, checkedOnly);
  }

  remoteDecBuffRound(checkedOnly: boolean) {
    sendDecBuffRoundMessage(
      this.chatTab,
      this.chatMessageService,
      this._gameSystem,
      this.sendFrom,
      this.controllerInputComponent().tachieNum,
      this.getTargetCharacters(checkedOnly)
    );
  }

  decBuffRoundSelect() {
    this.remoteDecBuffRound(true);
  }

  decBuffRoundAll() {
    this.remoteDecBuffRound(false);
  }

  remoteBuffDeleteZeroRound(checkedOnly: boolean) {
    sendDeleteZeroRoundBuffMessage(
      this.chatTab,
      this.chatMessageService,
      this._gameSystem,
      this.sendFrom,
      this.controllerInputComponent().tachieNum,
      this.getTargetCharacters(checkedOnly)
    );
  }

  deleteZeroRoundBuffSelect() {
    this.remoteBuffDeleteZeroRound(true);
  }

  deleteZeroRoundBuffAll() {
    this.remoteBuffDeleteZeroRound(false);
  }

  sendChat(value: {
    text: string;
    gameSystem: GameSystemClass;
    sendFrom: string;
    sendTo: string;
    tachieNum: number;
    messColor: string;
  }) {
    const parsed = parseBuffInput(value.text);
    if (!parsed) return;
    const gameCharacters = this.getTargetCharacters(true);
    if (gameCharacters.length <= 0) {
      this.errorMessageBuff = '対象が未選択です';
      return;
    }
    const parts: string[] = [];
    for (const object of gameCharacters) {
      parts.push(`[${object.name}]`);
    }
    const text = parts.join('');
    addBuffRound(gameCharacters, parsed.buffname, parsed.sub, parsed.round);
    const mess = 'バフを付与 ' + parsed.bufftext + ' > ' + text;
    this.chatMessageService.sendMessage(
      this.chatTab,
      mess,
      this._gameSystem,
      this.sendFrom,
      '',
      value.tachieNum,
      value.messColor
    );
    this.errorMessageBuff = '';
  }

  remoteChangeValue() {
    const gameCharacters = this.getTargetCharacters(true);
    if (this.remoteControllerSelect.name == '') {
      this.errorMessageController = '変更項目が未選択です';
      return;
    }
    const parts: string[] = [];
    const name = this.remoteControllerSelect.name;
    const nowOrMax = this.remoteControllerSelect.nowOrMax;
    const addValue = this.remoteNumber;
    for (const object of gameCharacters) {
      parts.push(
        object.status.changeValue(name, nowOrMax, addValue, this.recoveryLimitFlagMin, this.recoveryLimitFlag)
      );
    }
    const text = parts.join('');
    if (text != '') {
      let hugou = '+';
      if (this.remoteNumber < 0) {
        hugou = '';
      }
      const mess = '[' + this.remoteControllerSelect.dispName + ']変更[' + hugou + this.remoteNumber + ']＞' + text;
      this.chatMessageService.sendMessage(
        this.chatTab,
        mess,
        this._gameSystem,
        this.sendFrom,
        '',
        this.controllerInputComponent().tachieNum,
        this.controllerInputComponent().selectChatColor
      );
      this.errorMessageController = '';
    } else {
      this.errorMessageController = '対象キャラクターが未選択です';
    }
  }

  trackByGameObject(index: number, gameObject: GameObject) {
    return gameObject ? gameObject.identifier : index;
  }

  buffEdit(gameCharacter: GameCharacter) {
    const coordinate = this.pointerDeviceService.pointers[0];
    const option: PanelOption = {
      left: coordinate.x,
      top: coordinate.y,
      width: 420,
      height: 300,
    };
    option.title = gameCharacter.name + 'のバフ編集';
    const component = this.panelService.open(GameCharacterBuffViewComponent, option);
    component.character = gameCharacter;
  }

  allBoxCheck(value: { check: boolean }) {
    const objectList = this.getGameObjects(this.selectTab);
    for (const object of objectList) {
      if (object instanceof GameCharacter) {
        object.targeted = value.check;
        this.uiSignalService.notifyTargetChange(object.identifier, object.aliasName);
      }
    }
  }

  targetBlockClick(object: GameCharacter) {
    object.targeted = !object.targeted;
    this.uiSignalService.notifyTargetChange(object.identifier, object.aliasName);
  }
}
