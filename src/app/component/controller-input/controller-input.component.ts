import { NgClass, NgStyle } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatMessage } from '@axe/class/chat-message';
import { ImageFile } from '@axe/class/core/file-storage/image-file';
import { ImageStorage } from '@axe/class/core/file-storage/image-storage';
import { ObjectStore } from '@axe/class/core/synchronize-object/object-store';
import { EventSystem, Network } from '@axe/class/core/system';
import { PeerContext } from '@axe/class/core/system/network/peer-context';
import { ResettableTimeout } from '@axe/class/core/system/util/resettable-timeout';
import { DiceBot } from '@axe/class/dice-bot';
import { GameCharacter } from '@axe/class/game-character';
import { PeerCursor } from '@axe/class/peer-cursor';
import { NgOptionComponent, NgSelectComponent } from '@ng-select/ng-select';
import GameSystemClass from 'bcdice/lib/game_system';
import { ChatColorSettingComponent } from '@axe/component/chat-color-setting/chat-color-setting.component';
import { SafePipe } from '@axe/pipe/safe.pipe';
import { BatchService } from '@axe/service/batch.service';
import { ChatMessageService } from '@axe/service/chat-message.service';
import { PanelOption, PanelService } from '@axe/service/panel.service';
import { PointerDeviceService } from '@axe/service/pointer-device.service';

@Component({
  selector: 'controller-input',
  templateUrl: './controller-input.component.html',
  styleUrls: ['./controller-input.component.css'],
  imports: [NgClass, NgSelectComponent, FormsModule, NgOptionComponent, NgStyle, SafePipe],
})
export class ControllerInputComponent implements OnInit, OnDestroy {
  private ngZone = inject(NgZone);
  chatMessageService = inject(ChatMessageService);
  private batchService = inject(BatchService);
  private panelService = inject(PanelService);
  private pointerDeviceService = inject(PointerDeviceService);
  private objectStore = inject(ObjectStore);
  private imageStorage = inject(ImageStorage);

  get gameType(): string {
    return this._gameType;
  }
  set gameType(gameType: string) {
    this._gameType = gameType;
    this.gameTypeChange.emit(gameType);
  }
  get sendFrom(): string {
    return this._sendFrom;
  }
  set sendFrom(sendFrom: string) {
    this._sendFrom = sendFrom;
    this.sendFromChange.emit(sendFrom);
  }
  get sendTo(): string {
    return this._sendTo;
  }
  set sendTo(sendTo: string) {
    this._sendTo = sendTo;
    this.sendToChange.emit(sendTo);
  }
  get text(): string {
    return this._text;
  }
  set text(text: string) {
    this._text = text;
    this.textChange.emit(text);
  }
  get selectNum(): number {
    return this._selectNum;
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

  get colorSelectNo(): number {
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

  get colorSelectorBoxBorder_0(): string {
    if (0 === this.colorSelectNo) {
      return '3px';
    }
    return '1px';
  }

  get colorSelectorBoxBorder_1(): string {
    if (1 === this.colorSelectNo) {
      return '3px';
    }
    return '1px';
  }

  get colorSelectorBoxBorder_2(): string {
    if (2 === this.colorSelectNo) {
      return '3px';
    }
    return '1px';
  }

  get colorSelectorRadius_0(): string {
    if (0 === this.colorSelectNo) {
      return '9px';
    }
    return '0px';
  }

  get colorSelectorRadius_1(): string {
    if (1 === this.colorSelectNo) {
      return '9px';
    }
    return '0px';
  }

  get colorSelectorRadius_2(): string {
    if (2 === this.colorSelectNo) {
      return '9px';
    }
    return '0px';
  }

  get selectChatColor(): string {
    return this.charactorChatColor(this.colorSelectNo);
  }

  get charactorChatColor_0(): string {
    return this.charactorChatColor(0);
  }

  get charactorChatColor_1(): string {
    return this.charactorChatColor(1);
  }

  get charactorChatColor_2(): string {
    return this.charactorChatColor(2);
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

  get selectCharacterTachieNum(): number {
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
      const imageFile: ImageFile = this.imageStorage.get(this.selectCharacterTachie.value as string);
      return imageFile ? imageFile : ImageFile.Empty;
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
  get gameCharacters(): GameCharacter[] {
    if (this.shouldUpdateCharacterList) {
      this.shouldUpdateCharacterList = false;
      this._gameCharacters = this.objectStore
        .getObjects<GameCharacter>(GameCharacter)
        .filter((character) => this.allowsChat(character));
    }
    return this._gameCharacters;
  }

  get diceBotInfos() {
    return DiceBot.diceBotInfos;
  }
  get myPeer(): PeerCursor {
    return PeerCursor.myCursor;
  }
  get otherPeers(): PeerCursor[] {
    return this.objectStore.getObjects(PeerCursor);
  }
  @ViewChild('textArea', { static: true }) textAreaElementRef: ElementRef;

  @Input() onlyCharacters = false;
  @Input() chatTabidentifier = '';

  @Input('gameType') _gameType = '';
  @Output() gameTypeChange = new EventEmitter<string>();

  @Input('sendFrom') _sendFrom: string = this.myPeer ? this.myPeer.identifier : '';
  @Output() sendFromChange = new EventEmitter<string>();

  @Input('sendTo') _sendTo = '';
  @Output() sendToChange = new EventEmitter<string>();

  @Input('text') _text = '';
  @Output() textChange = new EventEmitter<string>();

  @Input('selectNum') _selectNum = 0;
  //  set selectNum( num :number){ this._selectNum = num; }

  @Output() selectNumChange = new EventEmitter<number>();

  @Output() chat = new EventEmitter<{
    text: string;
    gameSystem: GameSystemClass;
    sendFrom: string;
    sendTo: string;
    tachieNum: number;
    messColor: string;
  }>();

  @Output() allBox = new EventEmitter<{ check: boolean }>();
  @Output() hideChkEvent = new EventEmitter<boolean>();
  gameHelp = '';

  colorSelectNo_: number = 0;

  private shouldUpdateCharacterList = true;
  private _gameCharacters: GameCharacter[] = [];

  private writingEventInterval: NodeJS.Timeout = null!;
  private previousWritingLength = 0;
  //  writingPeers: Map<string, NodeJS.Timeout> = new Map();
  writingPeers: Map<string, ResettableTimeout> = new Map(); // 1.13.xとのmargeで修正

  writingPeerNames: string[] = [];

  buffHideIsChk = false;

  setColorNum(num: number) {
    this.colorSelectNo = num;
  }

  charactorChatColor(num: number) {
    const object = this.objectStore.get(this.sendFrom);
    if (object instanceof GameCharacter) {
      return object.chatColorCode[num];
    } else {
      return '#000000';
    }
  }

  shoeColorSetting() {
    const object = this.objectStore.get(this.sendFrom);
    if (object instanceof GameCharacter) {
      const coordinate = this.pointerDeviceService.pointers[0];
      let title = '色設定';
      if (object.name.length) {
        title += ' - ' + object.name;
      }
      const option: PanelOption = {
        title,
        left: coordinate.x + 50,
        top: coordinate.y - 150,
        width: 300,
        height: 120,
      };
      const component = this.panelService.open<ChatColorSettingComponent>(ChatColorSettingComponent, option);
      component.tabletopObject = object;
    }
  }

  ngOnInit(): void {
    EventSystem.register(this)
      .on('MESSAGE_ADDED', (event) => {
        /*
        if (event.data.tabIdentifier !== this.chatTabidentifier) return;
        let message = this.objectStore.get<ChatMessage>(event.data.messageIdentifier);
        let sendFrom = message ? message.from : '?';
        if (this.writingPeers.has(sendFrom)) {
          clearTimeout(this.writingPeers.get(sendFrom));
          this.writingPeers.delete(sendFrom);
          this.updateWritingPeerNames();
        }
*/
        // 1.13.xとのmargeで修正
        if (event.data.tabIdentifier !== this.chatTabidentifier) {
          return;
        }
        const message = this.objectStore.get<ChatMessage>(event.data.messageIdentifier);
        const peerCursor = this.objectStore
          .getObjects<PeerCursor>(PeerCursor)
          .find((obj) => obj.userId === message.from);
        const sendFrom = peerCursor ? peerCursor.peerId : '?';
        if (this.writingPeers.has(sendFrom)) {
          this.writingPeers.get(sendFrom)!.stop();
          this.writingPeers.delete(sendFrom);
          this.updateWritingPeerNames();
        }
      })
      .on('UPDATE_GAME_OBJECT', -1000, (event) => {
        if (event.data.aliasName !== GameCharacter.aliasName) {
          return;
        }
        this.shouldUpdateCharacterList = true;
        if (event.data.identifier !== this.sendFrom) {
          return;
        }
        const gameCharacter = this.objectStore.get<GameCharacter>(event.data.identifier);
        if (gameCharacter && !this.allowsChat(gameCharacter)) {
          if (0 < this.gameCharacters.length && this.onlyCharacters) {
            this.sendFrom = this.gameCharacters[0].identifier;
          } else {
            this.sendFrom = this.myPeer.identifier;
          }
        }
      })
      .on('DISCONNECT_PEER', (event) => {
        const object = this.objectStore.get(this.sendTo);
        //        if (object instanceof PeerCursor && object.peerId === event.data.peer) {
        if (object instanceof PeerCursor && object.peerId === event.data.peerId) {
          // #marge

          this.sendTo = '';
        }
      })
      .on<string>('WRITING_A_MESSAGE', (event) => {
        /*
        if (event.isSendFromSelf || event.data !== this.chatTabidentifier) return;
        this.ngZone.run(() => {
          if (this.writingPeers.has(event.sendFrom)) clearTimeout(this.writingPeers.get(event.sendFrom));
          this.writingPeers.set(event.sendFrom, setTimeout(() => {
            this.writingPeers.delete(event.sendFrom);
            this.updateWritingPeerNames();
          }, 2000));
          this.updateWritingPeerNames();
        });
*/
        // 1.13.xとのmargeで修正
        if (event.isSendFromSelf || event.data !== this.chatTabidentifier) {
          return;
        }
        if (!this.writingPeers.has(event.sendFrom)) {
          this.writingPeers.set(
            event.sendFrom,
            new ResettableTimeout(() => {
              this.writingPeers.delete(event.sendFrom);
              this.updateWritingPeerNames();
              this.ngZone.run(() => {});
            }, 2000)
          );
        }
        this.writingPeers.get(event.sendFrom)!.reset();
        this.updateWritingPeerNames();
        this.batchService.add(() => this.ngZone.run(() => {}), this);
      });
  }

  ngOnDestroy() {
    EventSystem.unregister(this);
    this.batchService.remove(this);
    if (this.writingEventInterval) {
      clearTimeout(this.writingEventInterval);
      this.writingEventInterval = null!;
    }
    for (const [, timeout] of this.writingPeers) {
      timeout.stop();
    }
    this.writingPeers.clear();
  }

  private updateWritingPeerNames() {
    this.writingPeerNames = Array.from(this.writingPeers.keys()).map((peerId) => {
      //      let peer = PeerCursor.find(peerId);
      const peer = PeerCursor.findByPeerId(peerId); // 1.13.xとのmargeで修正
      return peer ? peer.name : '';
    });
  }

  onInput() {
    if (this.writingEventInterval === null && this.previousWritingLength <= this.text.length) {
      let sendTo: string = null!;
      if (this.isDirect) {
        const object = this.objectStore.get(this.sendTo);
        if (object instanceof PeerCursor) {
          //          let peer = PeerContext.create(object.peerId);
          //          if (peer) sendTo = peer.id;
          const peer = PeerContext.parse(object.peerId);
          if (peer) {
            sendTo = peer.peerId;
          } // 1.13.xとのmargeで修正
        }
      }
      EventSystem.call('WRITING_A_MESSAGE', this.chatTabidentifier, sendTo);
      this.writingEventInterval = setTimeout(() => {
        this.writingEventInterval = null!;
      }, 200);
    }
    this.previousWritingLength = this.text.length;
    this.calcFitHeight();
  }

  sendChat(event: Event | null) {
    if (event) {
      event.preventDefault();
    }

    if (!this.text.length) {
      return;
    }
    if (event && (event as KeyboardEvent).keyCode !== 13) {
      return;
    }

    if (!this.sendFrom.length) {
      this.sendFrom = this.myPeer.identifier;
    }

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
        gameSystem,
        sendFrom: message.sendFrom,
        sendTo: message.sendTo,
        tachieNum: message.tachieNum,
        messColor: message.messColor,
      });
    });
    this.text = '';
    this.previousWritingLength = this.text.length;
    const textArea: HTMLTextAreaElement = this.textAreaElementRef.nativeElement;
    textArea.value = '';
    this.calcFitHeight();
  }

  allBoxCheck() {
    if (this.selectNum > 0) {
      this.allBox.emit({ check: false });
    } else {
      this.allBox.emit({ check: true });
    }
  }

  calcFitHeight() {
    const textArea: HTMLTextAreaElement = this.textAreaElementRef.nativeElement;
    textArea.style.height = '';
    if (textArea.scrollHeight >= textArea.offsetHeight) {
      textArea.style.height = textArea.scrollHeight + 'px';
    }
  }

  loadDiceBot(gameType: string) {
    DiceBot.getHelpMessage(gameType).then(() => {});
  }
  // 親コンポーネントにもCHKBOX情報を渡す、作りが悪いがチャット入力部流用のためひとまずこのまま
  buffHideChkChange(chk: boolean) {
    this.hideChkEvent.emit(chk);
    this.buffHideIsChk = chk;
  }

  private allowsChat(gameCharacter: GameCharacter): boolean {
    switch (gameCharacter.location.name) {
      case 'table':
        return !gameCharacter.hideInventory;
      case this.myPeer.peerId:
        return true;
      case 'graveyard':
        return false;
      default:
        for (const conn of Network.peerContexts) {
          //          if (conn.isOpen && gameCharacter.location.name === conn.fullstring) {
          if (conn.isOpen && gameCharacter.location.name === conn.peerId) {
            return false;
          }
        }
        return true;
    }
  }
}
