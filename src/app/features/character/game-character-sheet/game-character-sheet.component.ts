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
import { SaveDataService } from '@axe/application/file/save-data.service';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { DataElementDragService } from '@axe/application/ui/data-element-drag.service';
import { ModalService } from '@axe/application/ui/modal.service';
import { PanelOption, PanelService } from '@axe/application/ui/panel.service';
import { UiSignalService } from '@axe/application/ui/ui-signal.service';
import { Network } from '@axe/core/index';
import { PointerDeviceService } from '@axe/core/input/pointer-device.service';
import { ImageFile } from '@axe/core/storage/image-file';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { ObjectStore } from '@axe/core/sync/object-store';
import { Card } from '@axe/domain/card/card';
import { CardStack } from '@axe/domain/card/card-stack';
import { GameCharacter } from '@axe/domain/character/game-character';
import {
  convertLegacyCheckTableElements,
  countConvertibleCheckTableElements,
} from '@axe/domain/data/check-table-converter';
import {
  DataElement,
  DataElementAttribute,
  DataElementFieldType,
  DataElementRole,
} from '@axe/domain/data/data-element';
import { DiceSymbol } from '@axe/domain/dice/dice-symbol';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { CharacterSheetTarget } from '@axe/domain/tabletop/character-sheet-target';
import { GameTableScratchMask } from '@axe/domain/tabletop/game-table-scratch-mask';
import { RangeArea } from '@axe/domain/tabletop/range';
import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';
import { Terrain } from '@axe/domain/tabletop/terrain';
import { TextNote } from '@axe/domain/tabletop/text-note';
import { cloneTabletopObject } from '@axe/features/character/game-character-sheet/character-sheet-target-helpers';
import {
  canReorderDetailElement,
  reorderDetailElement,
} from '@axe/features/character/game-character-sheet/detail-element-reorder-helpers';
import { clampInRange, floatOr, roundOr } from '@axe/features/character/game-character-sheet/numeric-input-helpers';
import { ImportCharacterImgComponent } from '@axe/features/character/import-character-img/import-character-img.component';
import { GameDataElementComponent } from '@axe/features/data-element/game-data-element/game-data-element.component';
import { FileSelecterComponent } from '@axe/ui/components/file-selecter/file-selecter.component';
import { SafePipe } from '@axe/ui/pipes/safe.pipe';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'game-character-sheet',
  templateUrl: './game-character-sheet.component.html',
  host: { class: 'block' },
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
  private readonly objectStore = inject(ObjectStore);
  private readonly dataElementDrag = inject(DataElementDragService);

  private readonly _tabletopObject = signal<CharacterSheetTarget | null>(null);
  get tabletopObject(): CharacterSheetTarget | null {
    return this._tabletopObject();
  }
  set tabletopObject(value: CharacterSheetTarget | null) {
    this._tabletopObject.set(value);
    this.editingIds.set(new Set());
    this.activeTab.set('sheet');
  }
  readonly isEdit = signal(false);

  /** キャラクターシートのアクティブタブ */
  readonly activeTab = signal<'sheet' | 'settings'>('sheet');

  // ── キャラクターシート: カード単位編集状態 ──
  readonly editingIds = signal(new Set<string>());

  isElementEditing(id: string): boolean {
    return this.editingIds().has(id);
  }

  toggleElementEdit(id: string) {
    this.editingIds.update((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ── 詳細カード drag-and-drop ──
  readonly dragOverId = signal<string | null>(null);
  private _draggedId: string | null = null;

  onDragStart(event: DragEvent, id: string) {
    this._draggedId = id;
    this.dataElementDrag.start(event, id);
    event.stopPropagation();
  }

  onDragEnd() {
    this._draggedId = null;
    this.dataElementDrag.end();
    this.dragOverId.set(null);
  }

  onDragOver(event: DragEvent, id: string) {
    const draggedId = this.dataElementDrag.getDraggedId(event) ?? this._draggedId;
    if (!draggedId || draggedId === id || !canReorderDetailElement(this.character, this.objectStore, draggedId, id))
      return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    this.dragOverId.set(id);
  }

  onDragLeave(id: string) {
    if (this.dragOverId() === id) this.dragOverId.set(null);
  }

  onDrop(event: DragEvent, targetId: string) {
    event.preventDefault();
    this.dragOverId.set(null);
    const draggedId = this.dataElementDrag.getDraggedId(event) ?? this._draggedId;
    this._draggedId = null;
    this.dataElementDrag.end();
    if (!draggedId || draggedId === targetId) return;
    reorderDetailElement(this.character, this.objectStore, this.objectChange, draggedId, targetId);
  }

  // ── カード占有幅（colspan）──
  private static readonly COLSPAN_CYCLE = ['1', '2', 'full'] as const;

  getCardColspan(el: DataElement): string {
    this.objectChange.versionOf(el.identifier)();
    return (el.getAttribute('cs-colspan') as string) || '1';
  }

  getCardName(el: DataElement): string {
    this.objectChange.versionOf(el.identifier)();
    return el.name || '';
  }

  getCardIcon(el: DataElement): string {
    this.objectChange.versionOf(el.identifier)();
    return (el.getAttribute('cs-icon') as string) || '';
  }

  cycleCardColspan(el: DataElement) {
    const cur = this.getCardColspan(el);
    const idx = GameCharacterSheetComponent.COLSPAN_CYCLE.indexOf(
      cur as (typeof GameCharacterSheetComponent.COLSPAN_CYCLE)[number]
    );
    const next =
      GameCharacterSheetComponent.COLSPAN_CYCLE[(idx + 1) % GameCharacterSheetComponent.COLSPAN_CYCLE.length];
    el.setAttribute('cs-colspan', next);
  }

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

  readonly rangeTypeItems: { type: string; label: string; icon: string }[] = [
    { type: 'LINE', label: '直線', icon: 'remove' },
    { type: 'CORN', label: 'コーン', icon: 'change_history' },
    { type: 'TRIANGLE', label: '三角形', icon: 'details' },
    { type: 'SQUARE', label: '四角形', icon: 'crop_square' },
    { type: 'PENTAGON', label: '五角形', icon: 'pentagon' },
    { type: 'HEXAGON', label: '六角形', icon: 'hexagon' },
    { type: 'CIRCLE', label: '円形', icon: 'radio_button_unchecked' },
  ];

  readonly imageFile = computed(() => {
    this.objectChange.fileVersion();
    const obj = this.tabletopObject as TabletopObject | null;
    if (!obj) return ImageFile.Empty;
    this.objectChange.versionOf(obj.identifier)();
    return obj.imageFile;
  });

  readonly terrainFloorImage = computed(() => {
    this.objectChange.fileVersion();
    const terrain = this.terrain;
    if (!terrain) return ImageFile.Empty;
    this.objectChange.versionOf(terrain.identifier)();
    return terrain.floorImage ?? ImageFile.Empty;
  });

  readonly terrainWallImage = computed(() => {
    this.objectChange.fileVersion();
    const terrain = this.terrain;
    if (!terrain) return ImageFile.Empty;
    this.objectChange.versionOf(terrain.identifier)();
    return terrain.wallImage ?? ImageFile.Empty;
  });

  readonly characterPieceSignals = computed(() => {
    const char = this.character;
    if (!char) return { roll: 0, rotate: 0, locationX: 0, locationY: 0 };
    this.objectChange.versionOf(char.identifier)();
    return {
      roll: char.roll,
      rotate: char.rotate,
      locationX: char.location.x,
      locationY: char.location.y,
    };
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
      const titleName = DataElement.createUniqueSiblingName(obj.detailDataElement, '見出し');

      const title = DataElement.create(titleName, '', {
        [DataElementAttribute.ROLE]: DataElementRole.SECTION,
      });
      const groupName = DataElement.createUniqueSiblingName(title, 'グループ');
      const group = DataElement.create(groupName, '', {
        [DataElementAttribute.ROLE]: DataElementRole.GROUP,
      });
      const tagName = DataElement.createUniqueSiblingName(group, 'タグ');
      const tag = DataElement.create(tagName, '', {
        [DataElementAttribute.FIELD_TYPE]: DataElementFieldType.TEXT,
        [DataElementAttribute.ROLE]: DataElementRole.FIELD,
      });
      group.appendChild(tag);
      title.appendChild(group);
      obj.detailDataElement.appendChild(title);
    }
  }

  deleteTopLevelElement(id: string) {
    const char = this.character;
    if (!char?.detailDataElement) return;
    const el = char.detailDataElement.children.find((e) => e.identifier === id);
    if (!el) return;
    el.destroy();
    this.editingIds.update((set) => {
      const next = new Set(set);
      next.delete(id);
      return next;
    });
    char.update();
  }

  clone() {
    if (this.tabletopObject) cloneTabletopObject(this.tabletopObject);
  }

  clickHide() {
    //処理なし
  }

  clickNoTalk() {
    //処理なし
  }

  setSpecifyKomaImageFlag(value: boolean) {
    const character = this.character;
    if (!character) return;
    character.specifyKomaImageFlag = value;
    this.objectChange.notifyChanged(character.identifier);
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
    character.komaImageHeight = clampInRange(Number(height), 50, 750, character.komaImageHeight);
    this.objectChange.notifyChanged(character.identifier);
    this.pointerDeviceService.isDragging = false;
  }

  chkDiceKomaSize(height: number) {
    const character = this.tabletopObject as DiceSymbol;
    character.komaImageHeight = clampInRange(Number(height), 50, 750, character.komaImageHeight);
    this.pointerDeviceService.isDragging = false;
  }

  chkPopWidth(width: number) {
    const character = this.tabletopObject as GameCharacter;
    character.overViewWidth = clampInRange(width, 270, 800, character.overViewWidth);
  }

  chkPopMaxHeight(maxHeight: number) {
    const character = this.tabletopObject as GameCharacter;
    character.overViewMaxHeight = clampInRange(maxHeight, 250, 1000, character.overViewMaxHeight);
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
  onChkAltitude(event: Event): void {
    const character = this.tabletopObject as GameCharacter;
    character.altitude = roundOr((event.target as HTMLInputElement).valueAsNumber, 0);
  }
  onChkLocationX(event: Event): void {
    const character = this.tabletopObject as GameCharacter;
    const x = roundOr((event.target as HTMLInputElement).valueAsNumber, 0);
    character.location = { ...character.location, x };
  }
  onChkLocationY(event: Event): void {
    const character = this.tabletopObject as GameCharacter;
    const y = roundOr((event.target as HTMLInputElement).valueAsNumber, 0);
    character.location = { ...character.location, y };
  }
  onChkRotate(event: Event): void {
    const character = this.tabletopObject as GameCharacter;
    character.rotate = floatOr((event.target as HTMLInputElement).valueAsNumber, 0);
  }
  resetRotate(): void {
    const character = this.tabletopObject as GameCharacter;
    character.rotate = 0;
    SoundEffect.play(PresetSound.sweep);
  }
  onChkRoll(event: Event): void {
    const character = this.tabletopObject as GameCharacter;
    character.roll = floatOr((event.target as HTMLInputElement).valueAsNumber, 0);
  }
  resetRoll(): void {
    const character = this.tabletopObject as GameCharacter;
    character.roll = 0;
    SoundEffect.play(PresetSound.sweep);
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

  isPopupDataElement(element: DataElement): boolean {
    this.objectChange.versionOf(element.identifier)();
    return (
      element.getAttribute(DataElementAttribute.POPUP) === 'true' ||
      (this.character?.overViewDataTags.includes(element.identifier) ?? false)
    );
  }

  togglePopupDataElement(element: DataElement, event?: MouseEvent): void {
    event?.stopPropagation();
    const char = this.character;
    if (!char) return;

    const legacyTags = char.overViewDataTags.filter((id) => id !== element.identifier);
    if (this.isPopupDataElement(element)) element.removeAttribute(DataElementAttribute.POPUP);
    else element.setAttribute(DataElementAttribute.POPUP, 'true');

    char.overViewDataTags = legacyTags;
    this.objectChange.notifyChanged(element.identifier);
  }

  /** 旧チェック/表フィールドの要素数（移行バナー表示判定用） */
  legacyCheckTableCount(): number {
    const char = this.character;
    if (!char?.detailDataElement) return 0;
    return countConvertibleCheckTableElements(char.detailDataElement);
  }

  /** 旧チェック/表フィールド → 構造化テーブルに一括変換 */
  convertLegacyCheckTables(): void {
    const char = this.character;
    if (!char?.detailDataElement) return;

    const convertedCount = convertLegacyCheckTableElements(char.detailDataElement);
    if (convertedCount < 1) return;

    this.objectChange.notifyChanged(char.detailDataElement.identifier);
    char.update();
  }
}
