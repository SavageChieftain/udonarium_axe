import { NgClass, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Network } from '@axe/core/index';
import { PointerDeviceService } from '@axe/core/input/pointer-device.service';
import { GameObject } from '@axe/core/sync/game-object';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { ChatPalette } from '@axe/domain/chat/chat-palette';
import { ChatTab } from '@axe/domain/chat/chat-tab';
import { ChatTabList } from '@axe/domain/chat/chat-tab-list';
import { DataElement } from '@axe/domain/data/data-element';
import { SortOrder } from '@axe/domain/data/data-summary-setting';
import { DiceBot } from '@axe/domain/dice/dice-bot';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';
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
  styles: [
    `
      .edit-info {
        width: 100%;
        text-align: center;
        color: #ccc;
        background-color: rgba(30, 30, 30, 0.8);
      }
      .palette {
        box-sizing: border-box;
        font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Verdana, Meiryo, sans-serif;
        width: 100%;
        height: 100%;
      }

      .remote-controller-wrapper {
        display: flex;
        flex-direction: row;
        height: 100%;
      }

      .flex-container {
        display: flex;
        flex-direction: column;
      }

      .chat-tab {
        padding: 0 5px 5px 5px;
        user-select: none;
      }

      .chat-tab label {
        display: inline-block;
        position: relative;
      }

      .chat-tab input[type='radio'] {
        display: none;
      }

      .chat-tab input[type='radio'] + div {
        display: inline-block;
        vertical-align: middle;
        outline: 0;
        font-size: 8px;
        background-color: transparent;
        color: #444;
        border: solid 1px #555;
        padding: 2px 8px;
        margin: 2px;
        border-radius: 100px;
        cursor: pointer;
      }

      .chat-tab input[type='radio'] + div:hover {
        background-color: #888;
        color: #eee;
        border: solid 1px #555;
      }

      .chat-tab input[type='radio']:checked + div {
        background: #555;
        color: #ccc;
      }

      .controller {
        padding: 0 5px 5px 5px;
        user-select: none;
      }

      .controller label {
        display: inline-block;
        position: relative;
      }

      .controller input[type='radio'] {
        display: none;
      }

      .controller input[type='radio'] + div {
        display: inline-block;
        vertical-align: middle;
        outline: 0;
        font-size: 12px;
        background-color: transparent;
        color: #444;
        border: solid 1px #555;
        padding: 2px 8px;
        margin: 2px;
        border-radius: 100px;
        cursor: pointer;
      }

      .controller input[type='radio'] + div:hover {
        background-color: #888;
        color: #eee;
        border: solid 1px #555;
      }

      .controller input[type='radio']:checked + div {
        background: #555;
        color: #ccc;
      }

      .badge {
        position: absolute;
        top: -4px;
        right: 0;
      }

      .component {
        width: 100%;
      }

      .box {
        border: transparent 2px solid;
        border-left: transparent 6px solid;
        margin-top: 2px;
        padding: 2px;
        padding-bottom: 3px;
        box-sizing: border-box;

        border-bottom: 1px dotted #666;
      }
      .selected {
        padding: 2px;
        border: 2px dotted #666;
        border-left: 6px solid #444;
      }

      .hidden-spacer {
        visibility: hidden;
        height: 0;
        font-size: 1em;
        min-width: 1em;
        max-width: 12em;
        overflow: hidden;
        padding: 0 2px;
        box-sizing: border-box;
        white-space: nowrap;
      }

      .input {
        background: none;
        border: none;
        border-radius: 2px;
        outline: none;
        color: #444;
        padding: 2px;
        box-sizing: border-box;
      }

      .input:hover {
        background: #eee;
      }

      .input:focus {
        background: #fff;
      }

      input[type='number'] {
        -moz-appearance: textfield;
        appearance: textfield;
      }

      input[type='number']:hover,
      input[type='number']:focus {
        -moz-appearance: number-input;
        appearance: auto;
      }

      .tab {
        padding: 5px;
        user-select: none;
      }

      .tab {
        padding: 0px;
        border: solid 1px #555;
        border-radius: 0.3em;
        overflow: hidden;

        display: flex;
        flex-flow: row nowrap;
        justify-content: space-around;
        align-items: stretch;

        text-align: center;

        margin: 0px;
        max-width: 500px;

        background-color: rgba(240, 218, 189, 0.9);
      }

      .tab label {
        display: inline-block;
        flex: 1 0 auto;
        flex-grow: 1;
      }

      .tab label:hover {
        background-color: #888;
        color: #eee;
        border-color: #555;
      }

      .tab label:checked {
        background: #555;
        color: #ccc;
      }

      .tab input[type='radio'] {
        display: none;
      }

      .tab input[type='radio'] + div {
        vertical-align: middle;
        outline: 0;
        font-size: 0.6em;
        background-color: transparent;
        color: #444;

        box-sizing: border-box;

        margin: 0px;
        padding: 2px 8px;

        cursor: pointer;
      }

      .tab input[type='radio'] + div:hover {
        background-color: #888;
        color: #eee;
        border-color: #555;
      }

      .tab input[type='radio']:checked + div {
        background: #555;
        color: #ccc;
      }

      .tab-setting {
        background-color: transparent;
        color: #444;
        border: solid 1px #555;
        padding: 2px 8px;
        border-radius: 5px;
        cursor: pointer;
      }

      .tab-setting:hover {
        background-color: #888;
        color: #eee;
        border: solid 1px #555;
      }

      .small-font {
        font-size: 12px;
        vertical-align: middle;
      }

      .material-icons {
        vertical-align: middle;
        font-size: 1rem;
      }

      .table {
        display: table;
        width: 100%;
      }

      .table-cell {
        display: table-cell;
      }

      .click-area {
        border: 1px dotted #666;
      }

      .image-box {
        padding: 0px;
        width: 32px;
        height: 32px;
        max-width: 32px;
        max-height: 32px;
        vertical-align: top;
      }

      .image-box img {
        width: 100%;
        height: 100%;
        vertical-align: bottom;
        object-fit: cover;
        object-position: 50% 0%;
      }

      .inventory-object {
        font-size: 14px;
        display: inline-block;
        vertical-align: text-top;
      }

      .object-name {
        font-size: 0.8em;
        font-weight: bold;
        padding: 0 0.25em;
      }

      .object-tags-box {
        display: table;
        table-layout: fixed;
      }

      .object-tag {
        display: inline-block;
        padding: 0 0.25em;
        vertical-align: middle;
      }

      .resource-tag {
        text-align: center;
        vertical-align: bottom;
        overflow: hidden;
        white-space: nowrap;
      }

      .resource-value {
        font-weight: bold;
        width: 4em;
        text-align: right;
        font-family: inherit;
      }

      .tag-name {
        font-size: 0.8em;
        text-align: left;
        vertical-align: bottom;
        min-width: 1em;
        max-width: 12em;
        overflow: hidden;
        white-space: nowrap;
      }

      .tag-value-box {
        display: table-cell;
        width: 10px;
      }

      .tag-slash {
        font-size: 1em;
        min-width: 0.1em;
        max-width: 0.1em;
        text-align: center;
        font-family: inherit;
      }

      .tag-value {
        font-size: 1em;
        font-weight: bold;
        width: 100%;
        min-width: 1em;
        max-width: 12em;
        text-align: center;
        font-family: inherit;
      }

      .flex-item {
        margin: 5px 0px;
        padding: 10px;
        flex: 1 0 auto;
        box-sizing: border-box;
        min-width: 25px;

        background-color: rgba(234, 201, 157, 0.8);
        background-color: rgba(240, 218, 189, 0.8);
        color: #444;
      }

      .table {
        display: table;
        width: 100%;
        box-sizing: border-box;
      }
      .table-row {
        display: table-row;
        box-sizing: border-box;
      }
      .table-row > div {
        display: table-cell;
        border: 1px solid #fff;
        vertical-align: top;
        box-sizing: border-box;
      }

      .sticky-top-left {
        flex: 1;
        max-width: 21em;
        height: calc(100% - 11px);
        overflow-y: scroll;
        background-color: rgba(240, 218, 189, 0.8);
        border-top: 1px dotted #666;
        padding: 5px 5px;
        margin-top: 0;
      }

      .controller-right {
        flex: 1;
        height: 100%;
        overflow-y: scroll;
      }
    `,
  ],
  imports: [FormsModule, ControllerInputComponent, NgClass, NgTemplateOutlet, SafePipe],
})
export class RemoteControllerComponent {
  readonly chatMessageService = inject(ChatMessageService);
  private readonly panelService = inject(PanelService);
  private readonly inventoryService = inject(GameObjectInventoryService);
  private readonly pointerDeviceService = inject(PointerDeviceService);
  private readonly objectStore = inject(ObjectStore);
  private readonly selectionSignalService = inject(SelectionSignalService);
  private readonly uiSignalService = inject(UiSignalService);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly destroyRef = inject(DestroyRef);

  get palette(): ChatPalette | null {
    return this.character()?.remoteController ?? null;
  }

  private _gameSystem!: GameSystemClass;

  get gameType(): string {
    return this._gameSystem == null ? '' : this._gameSystem.ID;
  }
  set gameType(gameType: string) {
    DiceBot.loadGameSystemAsync(gameType).then((gameSystem) => {
      this._gameSystem = gameSystem;
      const char = this.character();
      if (char?.remoteController) {
        char.remoteController.dicebot = gameSystem.ID;
      }
    });
  }

  get sendFrom(): string {
    return this.character()?.identifier ?? '';
  }
  set sendFrom(sendFrom: string) {
    this.onSelectedCharacter(sendFrom);
  }

  get diceBotInfos() {
    return DiceBot.diceBotInfos;
  }

  readonly chatTab = computed(() => {
    this.objectChange.versionOf(this.chatTabidentifier())();
    this.objectChange.collectionOf('chat-tab')();
    return this.objectStore.get<ChatTab>(this.chatTabidentifier())!;
  });

  readonly chatTabsVersion = computed(() => {
    this.objectChange.collectionOf('chat-tab')();
    this.objectChange.versionOf(ChatTabList.instance.identifier)();
    const tabs = this.chatMessageService.chatTabs;
    for (const tab of tabs) this.objectChange.versionOf(tab.identifier)();
    return [...tabs];
  });
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
    queueMicrotask(() => this.updatePanelTitle());
    this.chatTabidentifier.set(this.chatMessageService.chatTabs[0]?.identifier ?? '');
    effect(() => {
      const dicebot = this.character()?.remoteController?.dicebot ?? '';
      if (0 < dicebot.length) {
        untracked(() => (this.gameType = dicebot));
      }
    });
    this.objectChange.objectDeleted$.subscribe((e) => {
      if (this.character() && this.character()!.identifier === e.identifier) {
        this.panelService.close();
      }
      if (this.chatTabidentifier() === e.identifier) {
        this.chatTabidentifier.set(this.chatMessageService.chatTabs[0]?.identifier ?? '');
      }
    }, this.destroyRef);
    this.objectChange.networkOpen$.subscribe(() => {
      this.inventoryTypes.set(['table', 'common', Network.peerId, 'graveyard']);
      if (!this.inventoryTypes().includes(this.selectTab())) {
        this.selectTab.set(Network.peerId);
      }
    }, this.destroyRef);
    this.inventoryTypes.set(['table', 'common', Network.peerId, 'graveyard']);
    this.destroyRef.onDestroy(() => {
      if (this.isEdit()) this.toggleEditMode();
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
  readonly character = signal<GameCharacter | null>(null);
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

  readonly buffAreaIsHide = signal(false);
  readonly controllerAreaIsHide = signal(false);

  readonly chatTabidentifier = signal('');
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
  readonly isEdit = signal(false);
  editPalette = '';

  private doubleClickTimer: ReturnType<typeof setTimeout> | null = null;
  charList: string[] = [];

  readonly inventoryTypes = signal<string[]>(['table', 'common', 'graveyard']);
  readonly selectTab = signal('table');

  hideChkBoxEvent(eventValue: boolean) {
    this.buffAreaIsHide.set(eventValue);
  }
  controllerHideChkChange(eventValue: boolean) {
    this.controllerAreaIsHide.set(eventValue);
  }
  recoveryLimitFlagChange(_value: boolean) {
    // 現状特に処理なし
  }
  onControllerHideChkChange(event: Event): void {
    this.controllerHideChkChange((event.target as HTMLInputElement).checked);
  }
  onRecoveryLimitFlagChange(event: Event): void {
    this.recoveryLimitFlagChange((event.target as HTMLInputElement).checked);
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

  updatePanelTitle() {
    const char = this.character();
    this.panelService.title = char ? char.name + ' のリモコン' : 'リモコン';
  }

  onSelectedCharacter(identifier: string) {
    if (this.isEdit()) {
      this.toggleEditMode();
    }
    const object = this.objectStore.get(identifier);
    if (object instanceof GameCharacter) {
      this.character.set(object);
      const gameType = object.remoteController ? object.remoteController.dicebot : '';
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
    this.isEdit.set(!this.isEdit());
    if (this.isEdit()) {
      if (!this.palette) return;
      this.editPalette = this.palette.value + '';
    } else {
      if (!this.palette) return;
      this.palette.setPalette(this.editPalette);
    }
  }

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

  getInventoryTags(gameObject: GameCharacter): (DataElement | null)[] {
    return getInventoryTags(gameObject, this.inventoryService);
  }

  selectGameObject(gameObject: GameObject) {
    this.selectionSignalService.selectObject(gameObject.identifier, gameObject.aliasName);
    this.selectCharacter = gameObject;
  }

  getTargetCharacters(checkedOnly: boolean): GameCharacter[] {
    const objectList = this.getGameObjects(this.selectTab());
    return getTargetCharacters(objectList, checkedOnly);
  }

  remoteDecBuffRound(checkedOnly: boolean) {
    sendDecBuffRoundMessage(
      this.chatTab(),
      this.chatMessageService,
      this._gameSystem,
      this.sendFrom,
      this.controllerInputComponent().portraitIndex(),
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
      this.chatTab(),
      this.chatMessageService,
      this._gameSystem,
      this.sendFrom,
      this.controllerInputComponent().portraitIndex(),
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
    portraitIndex: number;
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
      this.chatTab(),
      mess,
      this._gameSystem,
      this.sendFrom,
      '',
      value.portraitIndex,
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
        this.chatTab(),
        mess,
        this._gameSystem,
        this.sendFrom,
        '',
        this.controllerInputComponent().portraitIndex(),
        this.controllerInputComponent().selectChatColor
      );
      this.errorMessageController = '';
    } else {
      this.errorMessageController = '対象キャラクターが未選択です';
    }
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
    this.panelService.openLazy(
      () =>
        import('@axe/features/character/game-character-buff-view/game-character-buff-view.component').then(
          (m) => m.GameCharacterBuffViewComponent
        ),
      option,
      (component) => component.character.set(gameCharacter)
    );
  }

  allBoxCheck(value: { check: boolean }) {
    const objectList = this.getGameObjects(this.selectTab());
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

  onSelectPalette(event: Event): void {
    this.selectPalette((event.target as HTMLInputElement).value);
  }
  onClickPalette(event: Event): void {
    this.clickPalette((event.target as HTMLInputElement).value);
  }
}
