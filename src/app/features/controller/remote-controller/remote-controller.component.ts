import { NgTemplateOutlet } from '@angular/common';
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
import { ChatMessageService } from '@axe/application/chat/chat-message.service';
import { GameObjectInventoryService } from '@axe/application/inventory/game-object-inventory.service';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { PanelOption, PanelService } from '@axe/application/ui/panel.service';
import { SelectionSignalService } from '@axe/application/ui/selection-signal.service';
import { UiSignalService } from '@axe/application/ui/ui-signal.service';
import { PointerDeviceService } from '@axe/core/input/pointer-device.service';
import { getMyPeerId } from '@axe/core/network/peer-context-source';
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
import { SafePipe } from '@axe/ui/pipes/safe.pipe';
import GameSystemClass from 'bcdice/lib/game_system';

type PaletteLineKind = 'command' | 'heading' | 'variable' | 'empty';

interface PaletteRow {
  text: string;
  kind: PaletteLineKind;
  lineIndex: number;
  headingName?: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'remote-controller',
  templateUrl: './remote-controller.component.html',
  imports: [FormsModule, ControllerInputComponent, NgTemplateOutlet, SafePipe],
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
      this.inventoryTypes.set(['table', 'common', getMyPeerId(), 'graveyard']);
      if (!this.inventoryTypes().includes(this.selectTab())) {
        this.selectTab.set(getMyPeerId());
      }
    }, this.destroyRef);
    this.inventoryTypes.set(['table', 'common', getMyPeerId(), 'graveyard']);
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
  readonly paletteListRef = viewChild<ElementRef<HTMLDivElement>>('paletteList');
  readonly character = signal<GameCharacter | null>(null);

  readonly selectedLine = signal<number>(-1);

  readonly paletteRows = computed((): PaletteRow[] => {
    const char = this.character();
    const palette = char?.remoteController ?? null;
    if (!palette) return [];
    this.objectChange.versionOf(palette.identifier)();
    return palette.getPalette().map((text, i): PaletteRow => {
      if (/^\s*$/.test(text)) return { text, kind: 'empty', lineIndex: i };
      const m1 = text.match(/^\/\/--[-]+(.*)$/);
      const m2 = text.match(/^◆(.*)$/);
      if (m1) return { text, kind: 'heading', lineIndex: i, headingName: m1[1].replace(/-+$/, '') };
      if (m2) return { text, kind: 'heading', lineIndex: i, headingName: m2[1] };
      if (/^\s*[/／]{2}([^=＝{}｛｝\s]+)\s*[=＝]\s*(.+)/.test(text)) {
        return { text, kind: 'variable', lineIndex: i };
      }
      return { text, kind: 'command', lineIndex: i };
    });
  });

  errorMessageBuff = '';
  errorMessageController = '';

  readonly text = signal('');

  readonly buffAreaIsHide = signal(false);
  readonly controllerAreaIsHide = signal(false);

  readonly buffSectionOpen = signal(true);
  readonly counterSectionOpen = signal(true);

  readonly chatTabidentifier = signal('');
  remoteNumber = 0;

  recoveryLimitFlag = false;
  recoveryLimitFlagMin = false;
  remoteControllerSelect: RemoteControllerSelect = {
    name: '',
    nowOrMax: '',
    dispName: '',
  };
  readonly isEdit = signal(false);
  editPalette = '';

  private doubleClickTimer: ReturnType<typeof setTimeout> | null = null;

  readonly inventoryTypes = signal<string[]>(['table', 'common', 'graveyard']);
  readonly selectTab = signal('table');

  reverseValue() {
    this.remoteNumber = -this.remoteNumber;
  }

  sendBuffChat(event: KeyboardEvent | null): void {
    if (event) event.preventDefault();
    const textVal = this.text().trim();
    if (!textVal) return;
    const parsed = parseBuffInput(textVal);
    if (!parsed) return;
    const gameCharacters = this.getTargetCharacters(true);
    if (gameCharacters.length <= 0) {
      this.errorMessageBuff = '対象が未選択です';
      return;
    }
    const ci = this.controllerInputComponent();
    const parts = gameCharacters.map((o) => `[${o.name}]`).join('');
    addBuffRound(gameCharacters, parsed.buffname, parsed.sub, parsed.round);
    this.chatMessageService.sendMessage(
      this.chatTab(),
      'バフを付与 ' + parsed.bufftext + ' > ' + parts,
      this._gameSystem,
      this.sendFrom,
      '',
      ci.portraitIndex(),
      ci.selectChatColor
    );
    this.errorMessageBuff = '';
    this.text.set('');
  }

  remoteSelect(name: string, nowOrMax: string, dispName: string) {
    this.remoteControllerSelect.name = name;
    this.remoteControllerSelect.nowOrMax = nowOrMax;
    this.remoteControllerSelect.dispName = dispName;
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
    this.text.set(line);
  }

  clickPalette(line: string) {
    if (this.doubleClickTimer && this.text() === line) {
      clearTimeout(this.doubleClickTimer);
      this.doubleClickTimer = null;
      this.sendBuffChat(null);
    } else {
      this.text.set(line);
      this.doubleClickTimer = setTimeout(() => {
        this.doubleClickTimer = null;
      }, 400);
    }
  }

  resetPaletteSelect() {
    this.selectedLine.set(-1);
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
    this.objectChange.versionOf(gameObject.identifier)();
    return getInventoryTags(gameObject, this.inventoryService);
  }

  getTargetCharacters(checkedOnly: boolean): GameCharacter[] {
    this.uiSignalService.targetChange();
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

  onClickPaletteRow(row: PaletteRow): void {
    this.selectedLine.set(row.lineIndex);
    this.clickPalette(row.text);
  }
}
