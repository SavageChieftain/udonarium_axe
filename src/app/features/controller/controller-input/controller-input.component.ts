import { NgClass, NgStyle } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  model,
  OnDestroy,
  OnInit,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Network } from '@axe/core/index';
import { PeerContext } from '@axe/core/network/peer-context';
import { PointerDeviceService } from '@axe/core/pointer-device.service';
import { ImageFile } from '@axe/core/storage/image-file';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { ObjectStore } from '@axe/core/sync/object-store';
import { ResettableTimeout } from '@axe/core/util/resettable-timeout';
import { GameCharacter } from '@axe/domain/character/game-character';
import { ChatMessage } from '@axe/domain/chat/chat-message';
import { DiceBot } from '@axe/domain/dice/dice-bot';
import { callWritingAMessage } from '@axe/domain/domain-events';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { ChatColorSettingComponent } from '@axe/features/chat/chat-color-setting/chat-color-setting.component';
import { ChatMessageService } from '@axe/features/chat/chat-message.service';
import { ObjectChangeService } from '@axe/shared/object-change.service';
import { PanelOption, PanelService } from '@axe/shared/panel.service';
import { SafePipe } from '@axe/shared/pipes/safe.pipe';
import { NgOptionComponent, NgSelectComponent } from '@ng-select/ng-select';
import GameSystemClass from 'bcdice/lib/game_system';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'controller-input',
  templateUrl: './controller-input.component.html',
  styleUrls: ['./controller-input.component.css'],
  imports: [NgClass, NgSelectComponent, FormsModule, NgOptionComponent, NgStyle, SafePipe],
})
export class ControllerInputComponent implements OnInit, OnDestroy {
  private destroyRef = inject(DestroyRef);
  chatMessageService = inject(ChatMessageService);
  private objectChange = inject(ObjectChangeService);
  private panelService = inject(PanelService);
  private pointerDeviceService = inject(PointerDeviceService);
  private objectStore = inject(ObjectStore);
  private imageStorage = inject(ImageStorage);

  readonly gameType = model('');
  readonly sendFrom = model(PeerCursor.myCursor ? PeerCursor.myCursor.identifier : '');
  readonly sendTo = model('');
  readonly text = model('');

  get tachieNum(): number {
    const object = this.objectStore.get(this.sendFrom());
    if (object instanceof GameCharacter) {
      return object.selectedTachieNum;
    }
    return 0;
  }

  set tachieNum(num: number) {
    const object = this.objectStore.get(this.sendFrom());
    if (object instanceof GameCharacter) {
      object.selectedTachieNum = num;
    }
  }

  get isDirect(): boolean {
    return this.sendTo() != null && this.sendTo().length ? true : false;
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
    const object = this.objectStore.get(this.sendFrom());
    if (object instanceof GameCharacter) {
      if (object.imageDataElement.children.length > this.tachieNum) {
        return object.imageDataElement.children[this.tachieNum];
      }
    }
    return null!;
  }

  get selectCharacterTachieNum(): number {
    const object = this.objectStore.get(this.sendFrom());
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
    const object = this.objectStore.get(this.sendFrom());
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
  readonly textAreaElementRef = viewChild.required<ElementRef>('textArea');

  readonly onlyCharacters = input(false);
  readonly chatTabidentifier = input('');

  readonly selectNum = input(0);

  readonly chat = output<{
    text: string;
    gameSystem: GameSystemClass;
    sendFrom: string;
    sendTo: string;
    tachieNum: number;
    messColor: string;
  }>();

  readonly allBox = output<{ check: boolean }>();
  readonly hideChkEvent = output<boolean>();
  gameHelp = '';

  colorSelectNo_: number = 0;

  private shouldUpdateCharacterList = true;
  private _gameCharacters: GameCharacter[] = [];

  private writingEventInterval: NodeJS.Timeout = null!;
  private previousWritingLength = 0;
  //  writingPeers: Map<string, NodeJS.Timeout> = new Map();
  writingPeers: Map<string, ResettableTimeout> = new Map(); // 1.13.xとのmargeで修正

  readonly writingPeerNames = signal<string[]>([]);

  buffHideIsChk = false;

  setColorNum(num: number) {
    this.colorSelectNo = num;
  }

  charactorChatColor(num: number) {
    const object = this.objectStore.get(this.sendFrom());
    if (object instanceof GameCharacter) {
      return object.chatColorCode[num];
    } else {
      return '#000000';
    }
  }

  shoeColorSetting() {
    const object = this.objectStore.get(this.sendFrom());
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
    this.objectChange.messageAdded$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      // 1.13.xとのmargeで修正
      if (event.tabIdentifier !== this.chatTabidentifier()) {
        return;
      }
      const message = this.objectStore.get<ChatMessage>(event.messageIdentifier);
      const peerCursor = this.objectStore.getObjects<PeerCursor>(PeerCursor).find((obj) => obj.userId === message.from);
      const sendFrom = peerCursor ? peerCursor.peerId : '?';
      if (this.writingPeers.has(sendFrom)) {
        this.writingPeers.get(sendFrom)!.stop();
        this.writingPeers.delete(sendFrom);
        this.updateWritingPeerNames();
      }
    });

    this.objectChange.objectChanged$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      if (event.aliasName !== GameCharacter.aliasName) {
        return;
      }
      this.shouldUpdateCharacterList = true;
      if (event.identifier !== this.sendFrom()) {
        return;
      }
      const gameCharacter = this.objectStore.get<GameCharacter>(event.identifier);
      if (gameCharacter && !this.allowsChat(gameCharacter)) {
        if (0 < this.gameCharacters.length && this.onlyCharacters()) {
          this.sendFrom.set(this.gameCharacters[0].identifier);
        } else {
          this.sendFrom.set(this.myPeer.identifier);
        }
      }
    });

    this.objectChange.peerDisconnect$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      const object = this.objectStore.get(this.sendTo());
      if (object instanceof PeerCursor && object.peerId === event.peerId) {
        this.sendTo.set('');
      }
    });

    this.objectChange.writingMessage$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      // 1.13.xとのmargeで修正
      if (event.isSendFromSelf || event.tabIdentifier !== this.chatTabidentifier()) {
        return;
      }
      if (!this.writingPeers.has(event.sendFrom)) {
        this.writingPeers.set(
          event.sendFrom,
          new ResettableTimeout(() => {
            this.writingPeers.delete(event.sendFrom);
            this.updateWritingPeerNames();
          }, 2000)
        );
      }
      this.writingPeers.get(event.sendFrom)!.reset();
      this.updateWritingPeerNames();
    });
  }

  ngOnDestroy() {
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
    this.writingPeerNames.set(
      Array.from(this.writingPeers.keys()).map((peerId) => {
        //      let peer = PeerCursor.find(peerId);
        const peer = PeerCursor.findByPeerId(peerId); // 1.13.xとのmargeで修正
        return peer ? peer.name : '';
      })
    );
  }

  onInput() {
    if (this.writingEventInterval === null && this.previousWritingLength <= this.text().length) {
      let sendTo: string = null!;
      if (this.isDirect) {
        const object = this.objectStore.get(this.sendTo());
        if (object instanceof PeerCursor) {
          //          let peer = PeerContext.create(object.peerId);
          //          if (peer) sendTo = peer.id;
          const peer = PeerContext.parse(object.peerId);
          if (peer) {
            sendTo = peer.peerId;
          } // 1.13.xとのmargeで修正
        }
      }
      callWritingAMessage(this.chatTabidentifier(), sendTo);
      this.writingEventInterval = setTimeout(() => {
        this.writingEventInterval = null!;
      }, 200);
    }
    this.previousWritingLength = this.text().length;
    this.calcFitHeight();
  }

  sendChat(event: Event | null) {
    if (event) {
      event.preventDefault();
    }

    if (!this.text().length) {
      return;
    }
    if (event && (event as KeyboardEvent).keyCode !== 13) {
      return;
    }

    if (!this.sendFrom().length) {
      this.sendFrom.set(this.myPeer.identifier);
    }

    const message = {
      text: this.text(),
      sendFrom: this.sendFrom(),
      sendTo: this.sendTo(),
      tachieNum: this.tachieNum,
      messColor: this.selectChatColor,
    };
    DiceBot.loadGameSystemAsync(this.gameType()).then((gameSystem) => {
      this.chat.emit({
        text: message.text,
        gameSystem,
        sendFrom: message.sendFrom,
        sendTo: message.sendTo,
        tachieNum: message.tachieNum,
        messColor: message.messColor,
      });
    });
    this.text.set('');
    this.previousWritingLength = this.text().length;
    const textArea: HTMLTextAreaElement = this.textAreaElementRef().nativeElement;
    textArea.value = '';
    this.calcFitHeight();
  }

  allBoxCheck() {
    if (this.selectNum() > 0) {
      this.allBox.emit({ check: false });
    } else {
      this.allBox.emit({ check: true });
    }
  }

  calcFitHeight() {
    const textArea: HTMLTextAreaElement = this.textAreaElementRef().nativeElement;
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
