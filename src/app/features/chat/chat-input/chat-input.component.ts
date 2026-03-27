import { NgClass, NgStyle } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  DoCheck,
  effect,
  ElementRef,
  inject,
  input,
  OnDestroy,
  OnInit,
  output,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { PeerContext } from '@axe/core/network/peer-context';
import { PointerDeviceService } from '@axe/core/pointer-device.service';
import { ImageFile } from '@axe/core/storage/image-file';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { ChatMessage } from '@axe/domain/chat/chat-message';
import { DiceBot } from '@axe/domain/dice/dice-bot';
import { callWritingAMessage } from '@axe/domain/domain-events';
import { Config } from '@axe/domain/peer/config';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { ChatColorSettingComponent } from '@axe/features/chat/chat-color-setting/chat-color-setting.component';
import { ChatMessageService } from '@axe/shared/chat/chat-message.service';
import { SafePipe } from '@axe/shared/pipes/safe.pipe';
import { ObjectChangeService } from '@axe/shared/sync/object-change.service';
import { BatchService } from '@axe/shared/ui/batch.service';
import { PanelOption, PanelService } from '@axe/shared/ui/panel.service';
import { NgOptionComponent, NgSelectComponent } from '@ng-select/ng-select';
import GameSystemClass from 'bcdice/lib/game_system';

import { ChatInputDiceBotHelper } from './chat-input-dicebot';
import { allowsChat } from './chat-input-helpers';
import { ChatInputHistory } from './chat-input-history';
import { WritingPeerManager } from './chat-input-writing';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'chat-input',
  templateUrl: './chat-input.component.html',
  styleUrls: ['./chat-input.component.css'],
  imports: [NgClass, NgSelectComponent, FormsModule, NgOptionComponent, NgStyle, SafePipe],
})
export class ChatInputComponent implements OnInit, OnDestroy, DoCheck {
  private destroyRef = inject(DestroyRef);
  chatMessageService = inject(ChatMessageService);
  private batchService = inject(BatchService);
  private objectChange = inject(ObjectChangeService);
  private panelService = inject(PanelService);
  private pointerDeviceService = inject(PointerDeviceService);
  private objectStore = inject(ObjectStore);
  private imageStorage = inject(ImageStorage);

  private chatHistory = new ChatInputHistory();
  private writingManager = new WritingPeerManager();
  private dicebotHelper = new ChatInputDiceBotHelper();

  readonly textAreaElementRef = viewChild.required<ElementRef>('textArea');

  readonly onlyCharacters = input(false);
  readonly chatTabidentifier = input('');
  readonly autoCompleteIndex = input(-1);

  readonly gameTypeInput = input('', { alias: 'gameType' });
  readonly gameTypeChange = output<string>();

  private _gameType: string = '';
  private _isGameTypeByUser = 0;
  get gameType(): string {
    if (this._gameType == 'DiceBot' && this._isGameTypeByUser == 0) {
      return this.config?.defaultDiceBot ?? this._gameType;
    } else {
      return this._gameType;
    }
  }

  set gameType(gameType: string) {
    this._isGameTypeByUser = 1;
    this._gameType = gameType;
    this.gameTypeChange.emit(gameType);
  }

  readonly sendFromInput = input('', { alias: 'sendFrom' });
  readonly sendFromChange = output<string>();
  private _sendFrom: string = this.myPeer ? this.myPeer.identifier : '';
  get sendFrom(): string {
    return this._sendFrom;
  }
  set sendFrom(sendFrom: string) {
    this._sendFrom = sendFrom;
    this.sendFromChange.emit(sendFrom);
  }

  readonly sendToInput = input('', { alias: 'sendTo' });
  readonly sendToChange = output<string>();
  private _sendTo: string = '';
  get sendTo(): string {
    return this._sendTo;
  }
  set sendTo(sendTo: string) {
    this._sendTo = sendTo;
    this.sendToChange.emit(sendTo);
  }

  readonly autoCompleteListLen = input(-1);

  readonly textInput = input('', { alias: 'text' });
  readonly textChange = output<string>();
  private _text: string = '';
  get text(): string {
    return this._text;
  }
  set text(text: string) {
    this._text = text;
    this.textChange.emit(text);
  }

  readonly chat = output<{
    text: string;
    gameSystem: GameSystemClass;
    sendFrom: string;
    sendTo: string;
    tachieNum: number;
    messColor: string;
  }>();

  readonly tabSwitch = output<number>();

  readonly autoCompleteSwitch = output<number>();

  readonly autoCompleteDo = output<number>();

  constructor() {
    effect(() => {
      this._gameType = this.gameTypeInput();
    });
    effect(() => {
      this._sendFrom = this.sendFromInput();
    });
    effect(() => {
      this._sendTo = this.sendToInput();
    });
    effect(() => {
      this._text = this.textInput();
    });
  }

  get config(): Config {
    return this.objectStore.get<Config>('Config');
  }

  get tachieNum(): number {
    const object = this.objectStore.get(this.sendFrom);
    if (object instanceof GameCharacter) {
      return object.selectedTachieNum;
    }
    return 0;
  }

  set tachieNum(num: number) {
    const object = this.objectStore.get(this.sendFrom);
    if (object instanceof GameCharacter) {
      object.selectedTachieNum = num;
    }
  }

  get isDirect(): boolean {
    return this.sendTo != null && this.sendTo.length ? true : false;
  }

  colorSelectNo_ = 0;

  //  @Input() isChatWindow: boolean = false;
  get isGameCharacter(): boolean {
    const object = this.objectStore.get(this.sendFrom);
    if (object instanceof GameCharacter) {
      return true;
    }
    return false;
  }

  get colorSelectNo() {
    return this.colorSelectNo_;
  }

  set colorSelectNo(num: number) {
    if (num < 0) {
      this.colorSelectNo_ = 0;
    } else if (num > 2) {
      this.colorSelectNo_ = 2;
    } else {
      this.colorSelectNo_ = num;
    }
  }

  colorSelectorBoxBorder(n: number): string {
    return n === this.colorSelectNo ? '3px' : '1px';
  }

  colorSelectorRadius(n: number): string {
    return n === this.colorSelectNo ? '9px' : '0px';
  }

  charactorChatColor(num: number) {
    const object = this.objectStore.get(this.sendFrom);
    if (object instanceof GameCharacter) {
      this.objectChange.versionOf(object.identifier)();
      return object.chatColorCode[num];
    } else {
      return '#000000';
    }
  }

  get selectChatColor() {
    const object = this.objectStore.get(this.sendFrom);
    if (object instanceof GameCharacter) {
      return this.charactorChatColor(this.colorSelectNo);
    } else {
      return this.playerChatColor(this.colorSelectNo);
    }
  }

  playerChatColor(num: number) {
    this.objectChange.versionOf(this.myPeer.identifier)();
    return this.myPeer.chatColorCode[num];
  }

  setColorNum(num: number) {
    this.colorSelectNo = num;
  }

  get selectCharacterTachie() {
    const object = this.objectStore.get(this.sendFrom);
    if (object instanceof GameCharacter) {
      if (object.imageDataElement.children.length > this.tachieNum) {
        return object.imageDataElement.children[this.tachieNum];
      }
    }
    return null!;
  }

  get selectCharacterTachieNum() {
    const object = this.objectStore.get(this.sendFrom);
    if (object instanceof GameCharacter) {
      return object.imageDataElement.children.length;
    } else if (object instanceof PeerCursor) {
      return 0;
    }
    return 0;
  }

  get imageFile(): ImageFile {
    if (this.selectCharacterTachie) {
      const image: ImageFile = this.imageStorage.get(<string>this.selectCharacterTachie.value);
      return image ? image : ImageFile.Empty;
    }

    const object = this.objectStore.get(this.sendFrom);
    let image: ImageFile = null!;
    if (object instanceof GameCharacter) {
      image = object.imageFile;
    } else if (object instanceof PeerCursor) {
      image = object.image;
    }
    return image ? image : ImageFile.Empty;
  }

  private shouldUpdateCharacterList: boolean = true;
  private _gameCharacters: GameCharacter[] = [];
  get gameCharacters(): GameCharacter[] {
    if (this.shouldUpdateCharacterList) {
      this.shouldUpdateCharacterList = false;
      this._gameCharacters = this.objectStore
        .getObjects<GameCharacter>(GameCharacter)
        .filter((character) => allowsChat(character, this.myPeer.peerId));
    }
    return this._gameCharacters;
  }

  private writingEventInterval: NodeJS.Timeout = null!;
  private previousWritingLength: number = 0;
  readonly writingPeerNames = this.writingManager.names;

  private _diceBotInfosSnapshot: typeof DiceBot.diceBotInfos = [];
  get diceBotInfos() {
    return this._diceBotInfosSnapshot;
  }
  get myPeer(): PeerCursor {
    return PeerCursor.myCursor;
  }
  get otherPeers(): PeerCursor[] {
    return this.objectStore.getObjects(PeerCursor);
  }

  ngDoCheck(): void {
    if (this._diceBotInfosSnapshot !== DiceBot.diceBotInfos) {
      this._diceBotInfosSnapshot = DiceBot.diceBotInfos;
    }
  }

  private calcFitHeightInterval: NodeJS.Timeout = null!;
  ngOnInit(): void {
    this.objectChange.messageAdded$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      if (event.tabIdentifier !== this.chatTabidentifier()) return;
      const message = this.objectStore.get<ChatMessage>(event.messageIdentifier);
      const peerCursor = this.objectStore.getObjects<PeerCursor>(PeerCursor).find((obj) => obj.userId === message.from);
      const sendFrom = peerCursor ? peerCursor.peerId : '?';
      this.writingManager.remove(sendFrom);
    });

    this.objectChange.objectChanged$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      if (event.aliasName !== GameCharacter.aliasName) return;
      this.shouldUpdateCharacterList = true;
      if (event.identifier !== this.sendFrom) return;
      const gameCharacter = this.objectStore.get<GameCharacter>(event.identifier);
      if (gameCharacter && !allowsChat(gameCharacter, this.myPeer.peerId)) {
        if (0 < this.gameCharacters.length && this.onlyCharacters()) {
          this.sendFrom = this.gameCharacters[0].identifier;
        } else {
          this.sendFrom = this.myPeer.identifier;
        }
      }
    });

    this.objectChange.peerDisconnect$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      const object = this.objectStore.get(this.sendTo);
      if (object instanceof PeerCursor && object.peerId === event.peerId) {
        this.sendTo = '';
      }
    });

    this.objectChange.writingMessage$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      if (event.isSendFromSelf || event.tabIdentifier !== this.chatTabidentifier()) return;
      this.writingManager.add(event.sendFrom);
    });
  }

  ngOnDestroy() {
    this.batchService.remove(this);
    if (this.writingEventInterval) {
      clearTimeout(this.writingEventInterval);
      this.writingEventInterval = null!;
    }
    if (this.calcFitHeightInterval) {
      clearTimeout(this.calcFitHeightInterval);
      this.calcFitHeightInterval = null!;
    }
    this.writingManager.destroy();
  }

  onInput() {
    if (this.writingEventInterval === null && this.previousWritingLength <= this.text.length) {
      let sendTo: string = null!;
      if (this.isDirect) {
        const object = this.objectStore.get(this.sendTo);
        if (object instanceof PeerCursor) {
          const peer = PeerContext.parse(object.peerId);
          if (peer) sendTo = peer.peerId;
        }
      }
      callWritingAMessage(this.chatTabidentifier(), sendTo);
      this.writingEventInterval = setTimeout(() => {
        this.writingEventInterval = null!;
      }, 200);
    }
    this.previousWritingLength = this.text.length;
    this.calcFitHeight();
  }

  moveHistory(event: Event, direction: number) {
    if (event) event.preventDefault();
    this.text = this.chatHistory.navigate(direction);
    this.previousWritingLength = this.text.length;
    this.kickCalcFitHeight();
  }

  selectAutoComplete(event: Event, direction: number) {
    if (this.autoCompleteListLen() > 1) {
      if (event) event.preventDefault();
    }
    this.autoCompleteSwitch.emit(direction);
  }

  tabSwitchAction(event: Event, direction: number) {
    if (event) event.preventDefault();
    this.tabSwitch.emit(direction);
  }

  sendChat(event: Event | null) {
    if (event) event.preventDefault();

    if (!this.text.length) return;
    if (event && (event as KeyboardEvent).keyCode !== 13) return;

    if (this.autoCompleteIndex() >= 0) {
      this.autoCompleteDo.emit(this.autoCompleteIndex());
      return;
    }

    if (!this.sendFrom.length) this.sendFrom = this.myPeer.identifier;

    this.chatHistory.push(this.text);

    const message = {
      text: this.text,
      sendFrom: this.sendFrom,
      sendTo: this.sendTo,
      tachieNum: this.tachieNum,
      messColor: this.selectChatColor,
    };
    DiceBot.loadGameSystemAsync(this.gameType).then((gameSystem) => {
      this.chat.emit({
        text: message.text,
        gameSystem: gameSystem,
        sendFrom: message.sendFrom,
        sendTo: message.sendTo,
        tachieNum: message.tachieNum,
        messColor: message.messColor,
      });
    });
    this.text = '';
    this.previousWritingLength = this.text.length;
    this.kickCalcFitHeight();
  }

  kickCalcFitHeight() {
    if (this.calcFitHeightInterval == null) {
      this.calcFitHeightInterval = setTimeout(() => {
        this.calcFitHeightInterval = null!;
        this.calcFitHeight();
      }, 0);
    }
  }

  calcFitHeight() {
    const textArea: HTMLTextAreaElement = this.textAreaElementRef().nativeElement;
    textArea.style.height = '';
    if (textArea.scrollHeight >= textArea.offsetHeight) {
      textArea.style.height = textArea.scrollHeight + 'px';
    }
  }

  get gameHelp(): string {
    return this.dicebotHelper.gameHelp;
  }

  loadDiceBot(gameType: string) {
    this.dicebotHelper.load(gameType);
  }

  isGameTypeInList(): boolean {
    return this.dicebotHelper.isGameTypeInList(this.gameType, this.diceBotInfos);
  }

  showDicebotHelp() {
    this.dicebotHelper.showHelp(this.gameType);
  }

  shoeColorSetting() {
    const object = this.objectStore.get(this.sendFrom);
    if (object instanceof GameCharacter) {
      const coordinate = this.pointerDeviceService.pointers[0];
      let title = '色設定';
      if (object.name.length) title += ' - ' + object.name;
      const option: PanelOption = {
        title: title,
        left: coordinate.x + 50,
        top: coordinate.y - 300,
        width: 300,
        height: 170,
      };
      const component = this.panelService.open<ChatColorSettingComponent>(ChatColorSettingComponent, option);
      component.tabletopObject = object;
    } else {
      const coordinate = this.pointerDeviceService.pointers[0];
      const title = '色設定';
      const option: PanelOption = {
        title: title,
        left: coordinate.x + 50,
        top: coordinate.y - 150,
        width: 300,
        height: 120,
      };
      const component = this.panelService.open<ChatColorSettingComponent>(ChatColorSettingComponent, option);
      component.tabletopObject = null!;
    }
  }
}
