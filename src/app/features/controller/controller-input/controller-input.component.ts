import { NgClass, NgStyle } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  linkedSignal,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Network } from '@axe/core/index';
import { PointerDeviceService } from '@axe/core/input/pointer-device.service';
import { PeerContext } from '@axe/core/network/peer-context';
import { ImageFile } from '@axe/core/storage/image-file';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { ObjectStore } from '@axe/core/sync/object-store';
import { ResettableTimeout } from '@axe/core/util/resettable-timeout';
import { GameCharacter } from '@axe/domain/character/game-character';
import { ChatMessage } from '@axe/domain/chat/chat-message';
import { DataElement } from '@axe/domain/data/data-element';
import { DiceBot } from '@axe/domain/dice/dice-bot';
import { callWritingAMessage } from '@axe/domain/domain-events';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { ChatMessageService } from '@axe/shared/chat/chat-message.service';
import { SafePipe } from '@axe/shared/pipes/safe.pipe';
import { ObjectChangeService } from '@axe/shared/sync/object-change.service';
import { PanelOption, PanelService } from '@axe/shared/ui/panel.service';
import { NgOptionComponent, NgSelectComponent } from '@ng-select/ng-select';
import GameSystemClass from 'bcdice/lib/game_system';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'controller-input',
  templateUrl: './controller-input.component.html',
  styleUrls: ['./controller-input.component.css'],
  imports: [NgClass, NgSelectComponent, FormsModule, NgOptionComponent, NgStyle, SafePipe],
})
export class ControllerInputComponent {
  private readonly destroyRef = inject(DestroyRef);
  chatMessageService = inject(ChatMessageService);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly panelService = inject(PanelService);
  private readonly pointerDeviceService = inject(PointerDeviceService);
  private readonly objectStore = inject(ObjectStore);
  private readonly imageStorage = inject(ImageStorage);

  readonly gameType = model('');
  readonly sendFrom = model(PeerCursor.myCursor ? PeerCursor.myCursor.identifier : '');
  readonly sendTo = model('');
  readonly text = model('');

  readonly portraitIndex = linkedSignal(() => {
    this.objectChange.versionOf(this.sendFrom())();
    const object = this.objectStore.get(this.sendFrom());
    return object instanceof GameCharacter ? object.selectedPortraitIndex : 0;
  });

  setPortraitIndex(num: number) {
    const object = this.objectStore.get(this.sendFrom());
    if (object instanceof GameCharacter) object.selectedPortraitIndex = num;
    this.portraitIndex.set(num);
  }

  stepPortrait(dir: number): void {
    const next = this.portraitIndex() + dir;
    if (next < 0 || next >= this.portraitCount()) return;
    this.setPortraitIndex(next);
  }

  get portraitLabel(): string {
    const portrait = this.selectedPortrait();
    if (portrait?.currentValue) return portrait.currentValue as string;
    return `${this.portraitIndex() + 1}/${this.portraitCount()}`;
  }

  get isDirect(): boolean {
    return this.sendTo() != null && this.sendTo().length > 0;
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

  colorSelectorStyle(index: number): Record<string, string> {
    const selected = index === this.colorSelectNo;
    return {
      'background-color': this.charactorChatColor(index),
      border: `solid ${selected ? '3px' : '1px'} #666666`,
      'border-radius': selected ? '9px' : '0px',
    };
  }

  get selectChatColor(): string {
    return this.charactorChatColor(this.colorSelectNo);
  }

  readonly selectedPortrait = computed((): DataElement | null => {
    this.objectChange.versionOf(this.sendFrom())();
    const object = this.objectStore.get(this.sendFrom());
    if (object instanceof GameCharacter) {
      if (object.imageDataElement && object.imageDataElement.children.length > this.portraitIndex()) {
        return object.imageDataElement.children[this.portraitIndex()] ?? null;
      }
    }
    return null;
  });

  readonly portraitCount = computed((): number => {
    this.objectChange.versionOf(this.sendFrom())();
    const object = this.objectStore.get(this.sendFrom());
    if (object instanceof GameCharacter) {
      return object.imageDataElement?.children.length ?? 0;
    } else if (object instanceof PeerCursor) {
      return 0;
    }
    return 0;
  });

  readonly imageFile = computed((): ImageFile => {
    this.objectChange.fileVersion();
    if (this.selectedPortrait()) {
      const imageFile = this.imageStorage.get(this.selectedPortrait()!.value as string);
      return imageFile ? imageFile : ImageFile.Empty;
    }
    const object = this.objectStore.get(this.sendFrom());
    let image: ImageFile | null = null;
    if (object instanceof GameCharacter) {
      image = object.imageFile;
    } else if (object instanceof PeerCursor) {
      image = object.image;
    }
    return image ? image : ImageFile.Empty;
  });
  readonly gameCharacters = computed(() => {
    this.objectChange.collectionOf(GameCharacter.aliasName)();
    return this.objectStore.getObjects<GameCharacter>(GameCharacter).filter((character) => this.allowsChat(character));
  });

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
    portraitIndex: number;
    messColor: string;
  }>();

  readonly allBox = output<{ check: boolean }>();
  readonly hideChkEvent = output<boolean>();

  colorSelectNo_: number = 0;

  private writingEventInterval: NodeJS.Timeout | null = null;
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
      this.panelService.openLazy(
        () =>
          import('@axe/features/chat/chat-color-setting/chat-color-setting.component').then(
            (m) => m.ChatColorSettingComponent
          ),
        option,
        (component) => (component.tabletopObject = object)
      );
    }
  }

  constructor() {
    this.objectChange.messageAdded$.subscribe((event) => {
      // 1.13.xとのmargeで修正
      if (event.tabIdentifier !== this.chatTabidentifier()) {
        return;
      }
      const message = this.objectStore.get<ChatMessage>(event.messageIdentifier);
      const peerCursor = this.objectStore
        .getObjects<PeerCursor>(PeerCursor)
        .find((obj) => obj.userId === message?.from);
      const sendFrom = peerCursor ? peerCursor.peerId : '?';
      if (this.writingPeers.has(sendFrom)) {
        this.writingPeers.get(sendFrom)!.stop();
        this.writingPeers.delete(sendFrom);
        this.updateWritingPeerNames();
      }
    }, this.destroyRef);

    this.objectChange.objectChanged$.subscribe((event) => {
      if (event.aliasName !== GameCharacter.aliasName) {
        return;
      }
      if (event.identifier !== this.sendFrom()) {
        return;
      }
      const gameCharacter = this.objectStore.get<GameCharacter>(event.identifier);
      if (gameCharacter && !this.allowsChat(gameCharacter)) {
        if (0 < this.gameCharacters().length && this.onlyCharacters()) {
          this.sendFrom.set(this.gameCharacters()[0].identifier);
        } else {
          this.sendFrom.set(this.myPeer.identifier);
        }
      }
    }, this.destroyRef);

    this.objectChange.peerDisconnect$.subscribe((event) => {
      const object = this.objectStore.get(this.sendTo());
      if (object instanceof PeerCursor && object.peerId === event.peerId) {
        this.sendTo.set('');
      }
    }, this.destroyRef);

    this.objectChange.writingMessage$.subscribe((event) => {
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
    }, this.destroyRef);

    this.destroyRef.onDestroy(() => {
      if (this.writingEventInterval) {
        clearTimeout(this.writingEventInterval);
        this.writingEventInterval = null;
      }
      for (const [, timeout] of this.writingPeers) {
        timeout.stop();
      }
      this.writingPeers.clear();
    });
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
      let sendTo: string | undefined;
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
        this.writingEventInterval = null;
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
      portraitIndex: this.portraitIndex(),
      messColor: this.selectChatColor,
    };
    DiceBot.loadGameSystemAsync(this.gameType()).then((gameSystem) => {
      this.chat.emit({
        text: message.text,
        gameSystem,
        sendFrom: message.sendFrom,
        sendTo: message.sendTo,
        portraitIndex: message.portraitIndex,
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
  onBuffHideChkChange(event: Event): void {
    this.buffHideChkChange((event.target as HTMLInputElement).checked);
  }

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
