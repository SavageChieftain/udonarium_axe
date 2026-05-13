import { NgClass, NgStyle } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  linkedSignal,
  model,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { PanelOption, PanelService } from '@axe/application/ui/panel.service';
import { Network } from '@axe/core/index';
import { PointerDeviceService } from '@axe/core/input/pointer-device.service';
import { ImageFile } from '@axe/core/storage/image-file';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { DataElement } from '@axe/domain/data/data-element';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { SafePipe } from '@axe/ui/pipes/safe.pipe';
import { NgOptionComponent, NgSelectComponent } from '@ng-select/ng-select';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'controller-input',
  templateUrl: './controller-input.component.html',
  imports: [NgClass, NgSelectComponent, FormsModule, NgOptionComponent, NgStyle, SafePipe],
})
export class ControllerInputComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly panelService = inject(PanelService);
  private readonly pointerDeviceService = inject(PointerDeviceService);
  private readonly objectStore = inject(ObjectStore);
  private readonly imageStorage = inject(ImageStorage);

  readonly sendFrom = model(PeerCursor.myCursor ? PeerCursor.myCursor.identifier : '');
  readonly sendTo = model('');

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

  private _colorSelectNo: number = 0;

  get colorSelectNo(): number {
    return this._colorSelectNo;
  }

  set colorSelectNo(num: number) {
    this._colorSelectNo = Math.max(0, Math.min(2, num));
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
    const all = this.objectStore.getObjects<GameCharacter>(GameCharacter);
    for (const c of all) this.objectChange.versionOf(c.identifier)();
    return all.filter((character) => this.allowsChat(character));
  });

  get myPeer(): PeerCursor {
    return PeerCursor.myCursor;
  }

  readonly onlyCharacters = input(false);
  readonly chatTabidentifier = input('');
  readonly selectNum = input(0);
  readonly allBox = output<{ check: boolean }>();

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
    this.objectChange.onObjectChangedForAlias(
      [GameCharacter.aliasName],
      (event) => {
        if (event.identifier !== this.sendFrom()) return;
        const gameCharacter = this.objectStore.get<GameCharacter>(event.identifier);
        if (gameCharacter && !this.allowsChat(gameCharacter)) {
          if (0 < this.gameCharacters().length && this.onlyCharacters()) {
            this.sendFrom.set(this.gameCharacters()[0].identifier);
          } else {
            this.sendFrom.set(this.myPeer.identifier);
          }
        }
      },
      this.destroyRef
    );

    this.objectChange.peerDisconnect$.subscribe((event) => {
      const object = this.objectStore.get(this.sendTo());
      if (object instanceof PeerCursor && object.peerId === event.peerId) {
        this.sendTo.set('');
      }
    }, this.destroyRef);
  }

  allBoxCheck() {
    if (this.selectNum() > 0) {
      this.allBox.emit({ check: false });
    } else {
      this.allBox.emit({ check: true });
    }
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
          if (conn.isOpen && gameCharacter.location.name === conn.peerId) {
            return false;
          }
        }
        return true;
    }
  }
}
