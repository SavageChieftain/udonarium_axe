import { ImageFile } from '@axe/core/storage/image-file';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { SyncObject, SyncVar } from '@axe/core/sync/decorator';
import { ObjectStore } from '@axe/core/sync/object-store';
import { generateUuid } from '@axe/core/util/uuid';
import { BuffManager } from '@axe/domain/character/buff-manager';
import { CharacterTemplateFactory } from '@axe/domain/character/character-template-factory';
import { StatusAccessor } from '@axe/domain/character/status-accessor';
import { BuffPalette, ChatPalette } from '@axe/domain/chat/chat-palette';
import { DataElement, DataElementType } from '@axe/domain/data/data-element';
import { DEFAULT_CHAT_COLOR_CODES } from '@axe/domain/shared/constants';
import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';

@SyncObject('character')
export class GameCharacter extends TabletopObject {
  override get aliasName(): 'character' {
    return 'character';
  }
  constructor(identifier: string = generateUuid()) {
    super(identifier);
    this.isAltitudeIndicate = true;
  }

  @SyncVar() isLock: boolean = false;

  @SyncVar() rotate: number = 0;
  @SyncVar() roll: number = 0;
  @SyncVar() isDropShadow: boolean = false;

  @SyncVar() hideInventory: boolean = false;
  @SyncVar() nonTalkFlag: boolean = false;
  @SyncVar() overViewWidth: number = 270;
  @SyncVar() overViewMaxHeight: number = 250;

  @SyncVar() specifyKomaImageFlag: boolean = false;
  @SyncVar('komaImageHeignt') komaImageHeight: number = 100;

  @SyncVar() chatColorCode: string[] = [...DEFAULT_CHAT_COLOR_CODES];
  @SyncVar() syncDummyCounter: number = 0;

  chatBubbleAltitude: number = 0;

  _targeted: boolean = false;
  get targeted(): boolean {
    return this._targeted;
  }
  set targeted(flag: boolean) {
    this._targeted = flag;
  }

  _selectedTachieNum: number = 0;
  get selectedTachieNum(): number {
    if (this._selectedTachieNum > this.imageDataElement.children.length - 1) {
      this._selectedTachieNum = this.imageDataElement.children.length - 1;
    }
    if (this._selectedTachieNum < 0) {
      this._selectedTachieNum = 0;
    }

    return this._selectedTachieNum;
  }

  set selectedTachieNum(num: number) {
    if (num > this.imageDataElement.children.length - 1) {
      num = this.imageDataElement.children.length - 1;
    }
    if (num < 0) {
      num = 0;
    }
    this._selectedTachieNum = num;
  }

  private getIconNumElement(): DataElement {
    if (!this.detailDataElement) return null!;
    const iconNum = this.detailDataElement.getFirstElementByName('ICON');
    if (!iconNum || !iconNum.isNumberResource) return null!;
    return iconNum;
  }

  get imageFile(): ImageFile {
    if (!this.imageDataElement) return ImageFile.Empty;

    const iconNum = this.getIconNumElement();
    if (!iconNum) {
      const image: DataElement = this.imageDataElement.getFirstElementByName('imageIdentifier');
      if (!image) return ImageFile.Empty;
      const file = ImageStorage.instance.get(image.value as string);
      return file ? file : ImageFile.Empty;
    } else {
      let n = iconNum.currentValue as number;
      if (n > this.imageDataElement.children.length - 1) n = this.imageDataElement.children.length - 1;
      if (n < 0 || this.imageDataElement.children.length === 0) return ImageFile.Empty;
      const image = this.imageDataElement.children[n];
      const file = ImageStorage.instance.get(image.value as string);
      return file ? file : ImageFile.Empty;
    }
  }

  get name(): string {
    return this.getCommonValue('name', '');
  }
  get size(): number {
    return this.getCommonValue('size', 1);
  }
  get chatPalette(): ChatPalette {
    for (const child of this.children) {
      if (child instanceof ChatPalette) return child;
    }
    return null!;
  }

  set name(value: string) {
    this.setCommonValue('name', value);
  }

  get remoteController(): BuffPalette {
    for (const child of this.children) {
      if (child instanceof BuffPalette) {
        return child;
      }
    }
    return null!;
  }

  private _buffs: BuffManager | null = null;
  private _status: StatusAccessor | null = null;

  get buffs(): BuffManager {
    return (this._buffs ??= new BuffManager(this.buffDataElement));
  }

  get status(): StatusAccessor {
    return (this._status ??= new StatusAccessor(this.detailDataElement, () => this.name));
  }

  public override createDataElements(): void {
    super.createDataElements();
  }

  static create(name: string, size: number, imageIdentifier: string): GameCharacter {
    const gameCharacter: GameCharacter = new GameCharacter();
    gameCharacter.createDataElements();
    gameCharacter.initialize();

    CharacterTemplateFactory.createDefault(gameCharacter, name, size, imageIdentifier);

    return gameCharacter;
  }

  addExtendData() {
    this.addBuffDataElement();

    const istachie = this.detailDataElement.getElementsByName('立ち絵位置');
    if (istachie.length == 0) {
      const testElement: DataElement = DataElement.create('立ち絵位置', '', {}, `立ち絵位置${this.identifier}`);
      this.detailDataElement.appendChild(testElement);
      testElement.appendChild(
        DataElement.create(
          'POS',
          11,
          { type: DataElementType.NUMBER_RESOURCE, currentValue: '0' },
          `POS_${this.identifier}`
        )
      );
    }

    const iconNum = this.detailDataElement.getElementsByName('コマ画像');
    if (iconNum.length == 0) {
      const elementKoma: DataElement = DataElement.create('コマ画像', '', {}, `コマ画像${this.identifier}`);
      this.detailDataElement.appendChild(elementKoma);

      //コマ画像作成時は立ち絵の次に差し込み
      const tachies = this.detailDataElement.getElementsByName('立ち絵位置');
      if (tachies.length != 0) {
        const parentElement = tachies[0].parent;
        if (!parentElement) return;
        const index: number = parentElement.children.indexOf(tachies[0]);
        if (index < parentElement.children.length - 1) {
          const nextElement = parentElement.children[index + 1];

          parentElement.insertBefore(elementKoma, nextElement);
        }
      }
      elementKoma.appendChild(
        DataElement.create(
          'ICON',
          this.imageDataElement.children.length - 1,
          { type: DataElementType.NUMBER_RESOURCE, currentValue: 0 },
          `ICON_${this.identifier}`
        )
      );
    }

    const isbuff = this.buffDataElement.getElementsByName('バフ/デバフ');
    if (isbuff.length == 0) {
      const buffElement: DataElement = DataElement.create('バフ/デバフ', '', {}, `バフ/デバフ${this.identifier}`);
      this.buffDataElement.appendChild(buffElement);
    }
    if (this.remoteController == null) {
      const controller: BuffPalette = new BuffPalette(`RemotController_${this.identifier}`);
      controller.setPalette(`コントローラ入力例：
マッスルベアー DB+2 3
クリティカルレイ A 18
セイクリッドウェポン 命+1攻+2 18`);
      controller.initialize();
      this.appendChild(controller);
    }
  }

  clone(): this {
    const cloneObject = super.clone();

    let objectname: string;
    const reg = new RegExp('^(.*)_([0-9]+)$');
    let res = cloneObject.name.match(reg);

    let cloneNumber: number;
    if (res != null && res.length == 3) {
      objectname = res[1];
      cloneNumber = parseInt(res[2]) + 1;
    } else {
      objectname = cloneObject.name;
      cloneNumber = 2;
    }

    const list = ObjectStore.instance.getObjects(GameCharacter);
    for (const character of list) {
      if (character.location.name == 'graveyard') continue;

      res = character.name.match(reg);
      if (res != null && res.length == 3 && res[1] == objectname) {
        const numberChk = parseInt(res[2]) + 1;
        if (cloneNumber <= numberChk) {
          cloneNumber = numberChk;
        }
      }
    }

    cloneObject.name = `${objectname}_${cloneNumber}`;
    cloneObject.update();

    return cloneObject;
  }
}
