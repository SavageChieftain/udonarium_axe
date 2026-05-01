import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Network } from '@axe/core/index';
import { PointerDeviceService } from '@axe/core/input/pointer-device.service';
import { ImageFile } from '@axe/core/storage/image-file';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { SaveDataService } from '@axe/core/storage/save-data.service';
import { Card } from '@axe/domain/card/card';
import { CardStack } from '@axe/domain/card/card-stack';
import { GameCharacter } from '@axe/domain/character/game-character';
import { DataElement } from '@axe/domain/data/data-element';
import { DiceSymbol } from '@axe/domain/dice/dice-symbol';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { GameTableMask } from '@axe/domain/tabletop/game-table-mask';
import { GameTableScratchMask } from '@axe/domain/tabletop/game-table-scratch-mask';
import { RangeArea } from '@axe/domain/tabletop/range';
import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';
import { Terrain } from '@axe/domain/tabletop/terrain';
import { TextNote } from '@axe/domain/tabletop/text-note';
import { GameDataElementComponent } from '@axe/features/character/game-data-element/game-data-element.component';
import { ImportCharacterImgComponent } from '@axe/features/character/import-character-img/import-character-img.component';
import { FileSelecterComponent } from '@axe/shared/components/file-selecter/file-selecter.component';
import { SafePipe } from '@axe/shared/pipes/safe.pipe';
import { ObjectChangeService } from '@axe/shared/sync/object-change.service';
import { ModalService } from '@axe/shared/ui/modal.service';
import { PanelOption, PanelService } from '@axe/shared/ui/panel.service';
import { UiSignalService } from '@axe/shared/ui/ui-signal.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'game-character-sheet',
  templateUrl: './game-character-sheet.component.html',
  host: { class: 'block' },
  styleUrls: ['./game-character-sheet.component.css'],
  imports: [FormsModule, GameDataElementComponent, SafePipe],
})
export class GameCharacterSheetComponent {
  private readonly saveDataService = inject(SaveDataService);
  private readonly panelService = inject(PanelService);
  private readonly modalService = inject(ModalService);
  private readonly pointerDeviceService = inject(PointerDeviceService);
  private readonly uiSignalService = inject(UiSignalService);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly imageStorage = inject(ImageStorage);

  private readonly _tabletopObject = signal<
    | GameCharacter
    | DiceSymbol
    | Card
    | CardStack
    | Terrain
    | TextNote
    | RangeArea
    | GameTableMask
    | GameTableScratchMask
    | null
  >(null);
  get tabletopObject():
    | GameCharacter
    | DiceSymbol
    | Card
    | CardStack
    | Terrain
    | TextNote
    | RangeArea
    | GameTableMask
    | GameTableScratchMask
    | null {
    return this._tabletopObject();
  }
  set tabletopObject(
    value:
      | GameCharacter
      | DiceSymbol
      | Card
      | CardStack
      | Terrain
      | TextNote
      | RangeArea
      | GameTableMask
      | GameTableScratchMask
      | null
  ) {
    this._tabletopObject.set(value);
  }
  readonly isEdit = signal(false);

  // Typed accessors for template type narrowing via instanceof
  get diceSymbol(): DiceSymbol | null {
    return this.tabletopObject instanceof DiceSymbol ? this.tabletopObject : null;
  }
  get card(): Card | null {
    return this.tabletopObject instanceof Card ? this.tabletopObject : null;
  }
  get cardStack(): CardStack | null {
    return this.tabletopObject instanceof CardStack ? this.tabletopObject : null;
  }
  get terrain(): Terrain | null {
    return this.tabletopObject instanceof Terrain ? this.tabletopObject : null;
  }
  get character(): GameCharacter | null {
    return this.tabletopObject instanceof GameCharacter ? this.tabletopObject : null;
  }
  get textNote(): TextNote | null {
    return this.tabletopObject instanceof TextNote ? this.tabletopObject : null;
  }
  get scratchMask(): GameTableScratchMask | null {
    return this.tabletopObject instanceof GameTableScratchMask ? this.tabletopObject : null;
  }
  get rangeArea(): RangeArea | null {
    return this.tabletopObject instanceof RangeArea ? this.tabletopObject : null;
  }

  readonly imageFile = computed(() => {
    this.objectChange.fileVersion();
    const obj = this.tabletopObject as TabletopObject | null;
    if (!obj) return ImageFile.Empty;
    this.objectChange.versionOf(obj.identifier)();
    return obj.imageFile;
  });

  readonly portraitImages = computed(() => {
    this.objectChange.fileVersion();
    const char = this.character;
    if (!char?.imageDataElement) return [];
    this.objectChange.versionOf(char.identifier)();
    return char.imageDataElement.children.map((child, index) => {
      const file = this.imageStorage.get(child.value as string) ?? ImageFile.Empty;
      return { index, imageFile: file };
    });
  });

  /**
   * テーブル上のコマとして現在選択されている立ち絵インデックス (ICON.currentValue)
   */
  readonly komaImageIndex = computed(() => {
    const char = this.character;
    if (!char) return 0;
    this.objectChange.versionOf(char.identifier)();
    const iconEl = char.detailDataElement?.getFirstElementByName('ICON');
    return iconEl ? (iconEl.currentValue as number) : 0;
  });

  /**
   * チャット立ち絵スロット (POS.currentValue, 0-11)
   */
  readonly portraitPosIndex = computed(() => {
    const char = this.character;
    if (!char) return 0;
    this.objectChange.versionOf(char.identifier)();
    const posEl = char.detailDataElement?.getFirstElementByName('POS');
    return posEl ? (posEl.currentValue as number) : 0;
  });

  readonly komaImageFile = computed(() => {
    this.objectChange.fileVersion();
    const char = this.character;
    if (!char?.imageDataElement) return ImageFile.Empty;
    this.objectChange.versionOf(char.identifier)();
    const idx = this.komaImageIndex();
    const images = char.imageDataElement.children;
    if (images.length === 0) return ImageFile.Empty;
    const target = images[Math.min(idx, images.length - 1)];
    return this.imageStorage.get(target.value as string) ?? ImageFile.Empty;
  });

  /**
   * detailDataElement の子要素から 立ち絵位置・コマ画像 を除いたもの
   * (これらは専用UIで扱うため生スライダー表示から除外)
   */
  readonly detailElements = computed(() => {
    const char = this.character;
    if (!char?.detailDataElement) return [];
    this.objectChange.versionOf(char.identifier)();
    const HIDDEN = new Set(['\u7acb\u3061\u7d75\u4f4d\u7f6e', '\u30b3\u30de\u753b\u50cf']);
    return char.detailDataElement.children.filter((el) => !HIDDEN.has(el.name));
  });

  networkService = Network;

  readonly isSaving = signal(false);
  readonly progressPercent = signal(0);

  constructor() {
    this.objectChange.objectDeleted$.subscribe((e) => {
      if (this.tabletopObject && this.tabletopObject.identifier === e.identifier) {
        this.panelService.close();
      }
    }, this.destroyRef);

    effect(() => {
      const char = this.character;
      if (char) untracked(() => char.addExtendData());
    });
  }

  toggleEditMode() {
    this.isEdit.update((v) => !v);
  }

  addDataElement() {
    const obj = this.tabletopObject;
    if (obj?.detailDataElement) {
      const title = DataElement.create('見出し', '', {});
      const tag = DataElement.create('タグ', '', {});
      title.appendChild(tag);
      obj.detailDataElement.appendChild(title);
    }
  }

  clone() {
    const obj = this.tabletopObject;
    if (!obj) return;
    const cloneObject = obj.clone();
    cloneObject.location.x += 50;
    cloneObject.location.y += 50;
    if (obj.parent) obj.parent.appendChild(cloneObject);
    cloneObject.update();
    if (cloneObject instanceof Terrain) {
      cloneObject.isLocked = false;
      SoundEffect.play(PresetSound.blockPut);
    } else if (cloneObject instanceof Card) {
      cloneObject.owner = '';
      cloneObject.toTopmost();
      cloneObject.isLock = false;
      SoundEffect.play(PresetSound.cardPut);
    } else if (cloneObject instanceof CardStack) {
      cloneObject.owner = '';
      cloneObject.toTopmost();
      cloneObject.isLock = false;
      SoundEffect.play(PresetSound.cardPut);
    } else if (cloneObject instanceof GameTableMask) {
      cloneObject.isLock = false;
      SoundEffect.play(PresetSound.cardPut);
    } else if (cloneObject instanceof TextNote) {
      cloneObject.toTopmost();
      SoundEffect.play(PresetSound.cardPut);
    } else if (cloneObject instanceof DiceSymbol) {
      SoundEffect.play(PresetSound.dicePut);
      SoundEffect.play(PresetSound.piecePut);
    } else {
      SoundEffect.play(PresetSound.piecePut);
    }
  }

  clickHide() {
    //処理なし
  }

  clickNoTalk() {
    //処理なし
  }

  clickImageFlag() {
    //処理なし
  }

  clickGrid() {
    //処理なし
  }

  /** コマとして使う立ち絵インデックスを切り替える */
  setKomaIndex(index: number) {
    const char = this.character;
    if (!char?.imageDataElement) return;
    char.addExtendData();
    const iconEl = char.detailDataElement?.getFirstElementByName('ICON');
    if (!iconEl) return;
    const max = char.imageDataElement.children.length - 1;
    iconEl.currentValue = Math.max(0, Math.min(index, max));
    iconEl.value = max;
    char.update();
  }

  /** コマ画像の実ファイルを変更（現在のICONインデックスが指す立ち絵を差し替え）*/
  openKomaImageModal() {
    const char = this.character;
    if (!char?.imageDataElement) return;
    char.addExtendData();
    this.modalService.open<string>(FileSelecterComponent, { isAllowedEmpty: false }).then((value) => {
      if (!value || !char.imageDataElement) return;
      const iconEl = char.detailDataElement?.getFirstElementByName('ICON');
      const idx = iconEl ? (iconEl.currentValue as number) : 0;
      const images = char.imageDataElement.children;
      if (idx >= 0 && idx < images.length) {
        images[idx].value = value;
      } else if (images.length > 0) {
        images[0].value = value;
      }
      char.update();
    });
  }

  /** チャット立ち絵スロット (0-11) を設定 */
  setPortraitPos(pos: number) {
    const char = this.character;
    if (!char) return;
    char.addExtendData();
    const posEl = char.detailDataElement?.getFirstElementByName('POS');
    if (!posEl) return;
    posEl.currentValue = Math.max(0, Math.min(11, Math.round(pos)));
    char.update();
  }

  onSetPortraitPos(event: Event): void {
    this.setPortraitPos((event.target as HTMLInputElement).valueAsNumber);
  }

  addPortrait() {
    const char = this.character;
    if (!char?.imageDataElement) return;
    this.modalService.open<string>(FileSelecterComponent, { isAllowedEmpty: false }).then((value) => {
      if (!value) return;
      char.imageDataElement!.appendChild(DataElement.create('imageIdentifier', value, { type: 'image' }, ''));
      // ICON.value (max) を同期
      const iconEl = char.detailDataElement?.getFirstElementByName('ICON');
      if (iconEl) iconEl.value = char.imageDataElement!.children.length - 1;
      char.update();
    });
  }

  changePortrait(index: number) {
    const char = this.character;
    if (!char?.imageDataElement) return;
    this.modalService.open<string>(FileSelecterComponent, { isAllowedEmpty: false }).then((value) => {
      if (!value) return;
      const images = char.imageDataElement!.children;
      if (index < images.length) {
        images[index].value = value;
        char.update();
      }
    });
  }

  removePortrait(index: number) {
    const char = this.character;
    if (!char?.imageDataElement) return;
    const images = char.imageDataElement.children;
    if (images.length <= 1) return;
    const el = images[index];
    if (!el) return;
    const iconEl = char.detailDataElement?.getFirstElementByName('ICON');
    if (iconEl) {
      const komaIdx = iconEl.currentValue as number;
      if (komaIdx === index) {
        iconEl.currentValue = 0;
      } else if (komaIdx > index) {
        iconEl.currentValue = (komaIdx as number) - 1;
      }
      // 削除後の最大値に合わせる
      iconEl.value = images.length - 2;
    }
    char.imageDataElement.removeChild(el);
    char.update();
  }

  showImportImages() {
    const obj = this.tabletopObject;
    if (!obj) return;
    const coordinate = this.pointerDeviceService.pointers[0];
    const option: PanelOption = {
      left: coordinate.x - 250,
      top: coordinate.y - 175,
      width: 350,
      height: 250,
    };
    option.title = (obj as GameCharacter).name + 'への画像複製';
    const component = this.panelService.open<ImportCharacterImgComponent>(ImportCharacterImgComponent, option);
    component.tabletopObject = obj as GameCharacter;
  }

  clickRangeOffSetX() {
    // 処理なし
  }

  clickRangeOffSetY() {
    // 処理なし
  }

  fillOutLine() {
    // 処理なし
  }

  subDivisionSnapPolygonal() {
    // 処理なし
  }

  clickLimitHeight() {
    //高さが更新されない場合があるので雑だがこの方法で処理する
    const obj = this.tabletopObject;
    if (!obj) return;
    setTimeout(() => {
      this.uiSignalService.requestNoteResize(obj.identifier);
    }, 100);
  }

  chkKomaSize(height: number) {
    const character = this.tabletopObject as GameCharacter;
    character.komaImageHeight = this.normalizeKomaImageHeight(height, character.komaImageHeight);
    this.pointerDeviceService.isDragging = false;
  }

  chkDiceKomaSize(height: number) {
    const character = this.tabletopObject as DiceSymbol;
    character.komaImageHeight = this.normalizeKomaImageHeight(height, character.komaImageHeight);
    this.pointerDeviceService.isDragging = false;
  }

  private normalizeKomaImageHeight(height: number, currentValue: number): number {
    const numericHeight = Number(height);
    if (!Number.isFinite(numericHeight)) return currentValue;
    if (numericHeight < 50) return 50;
    if (numericHeight > 750) return 750;
    return numericHeight;
  }

  chkPopWidth(width: number) {
    const character = this.tabletopObject as GameCharacter;
    if (width < 270) width = 270;
    if (width > 800) width = 800;
    character.overViewWidth = width;
  }

  chkPopMaxHeight(maxHeight: number) {
    const character = this.tabletopObject as GameCharacter;
    if (maxHeight < 250) maxHeight = 250;
    if (maxHeight > 1000) maxHeight = 1000;
    character.overViewMaxHeight = maxHeight;
  }
  async saveToXML() {
    const obj = this.tabletopObject;
    if (!obj || this.isSaving()) return;
    this.isSaving.set(true);
    this.progressPercent.set(0);
    const element = obj.commonDataElement?.getFirstElementByName('name');
    const objectName: string = element ? (element.value as string) : '';

    await this.saveDataService.saveGameObjectAsync(obj, 'xml_' + objectName, (percent) => {
      this.progressPercent.set(percent);
    });

    setTimeout(() => {
      this.isSaving.set(false);
      this.progressPercent.set(0);
    }, 500);
  }

  setLocation(locationName: string) {
    this.tabletopObject?.setLocation(locationName);
  }

  openModal(name: string = '', isAllowedEmpty: boolean = false) {
    this.modalService.open<string>(FileSelecterComponent, { isAllowedEmpty: isAllowedEmpty }).then((value) => {
      const obj = this.tabletopObject;
      if (!obj || !obj.imageDataElement || !value) return;
      const element = obj.imageDataElement.getFirstElementByName(name);
      if (!element) return;
      element.value = value;
    });
  }

  changeMaskFillColor(event: string) {
    if (this.tabletopObject) {
      const mask: GameTableScratchMask = this.tabletopObject as GameTableScratchMask;
      mask.color = event;
    }
  }

  changeMaskChangeColor(event: string) {
    if (this.tabletopObject) {
      const mask: GameTableScratchMask = this.tabletopObject as GameTableScratchMask;
      mask.changeColor = event;
    }
  }

  changeGridColor(event: string) {
    if (this.tabletopObject) {
      const range: RangeArea = this.tabletopObject as RangeArea;
      range.gridColor = event;
    }
  }

  changeRangeColor(event: string) {
    if (this.tabletopObject) {
      const range: RangeArea = this.tabletopObject as RangeArea;
      range.rangeColor = event;
    }
  }

  onChkDiceKomaSize(event: Event): void {
    this.chkDiceKomaSize((event.target as HTMLInputElement).valueAsNumber);
  }
  onChkKomaSize(event: Event): void {
    this.chkKomaSize((event.target as HTMLInputElement).valueAsNumber);
  }
  onChkPopWidth(event: Event): void {
    this.chkPopWidth((event.target as HTMLInputElement).valueAsNumber);
  }
  onChkPopMaxHeight(event: Event): void {
    this.chkPopMaxHeight((event.target as HTMLInputElement).valueAsNumber);
  }
  onSetLocation(event: Event): void {
    this.setLocation((event.target as HTMLInputElement).value);
  }
  onChangeMaskFillColor(event: Event): void {
    this.changeMaskFillColor((event.target as HTMLInputElement).value);
  }
  onChangeMaskChangeColor(event: Event): void {
    this.changeMaskChangeColor((event.target as HTMLInputElement).value);
  }
  onChangeRangeColor(event: Event): void {
    this.changeRangeColor((event.target as HTMLInputElement).value);
  }
  onChangeGridColor(event: Event): void {
    this.changeGridColor((event.target as HTMLInputElement).value);
  }
}
