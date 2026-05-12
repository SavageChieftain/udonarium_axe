import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ImageService } from '@axe/core/storage/image.service';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { SaveDataService } from '@axe/core/storage/save-data.service';
import { DataElement } from '@axe/domain/data/data-element';
import { DiceSymbol } from '@axe/domain/dice/dice-symbol';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { FileSelecterComponent } from '@axe/shared/components/file-selecter/file-selecter.component';
import { SafePipe } from '@axe/shared/pipes/safe.pipe';
import { ObjectChangeService } from '@axe/shared/sync/object-change.service';
import { ModalService } from '@axe/shared/ui/modal.service';
import { PanelService } from '@axe/shared/ui/panel.service';

/** face 配列からデフォルト画像パスの prefix を導出する */
function getDiceImagePrefix(faces: string[]): string | null {
  if (faces.length === 0) return null;
  // D10_10TIMES: 面の値がすべて10の倍数
  if (faces.every((f) => Number(f) % 10 === 0)) return '100_dice';
  switch (faces.length) {
    case 4:
      return '4_dice';
    case 6:
      return '6_dice';
    case 8:
      return '8_dice';
    case 10:
      return '10_dice';
    case 12:
      return '12_dice';
    case 20:
      return '20_dice';
    default:
      return null;
  }
}

@Component({
  selector: 'app-dice-symbol-sheet',
  templateUrl: './dice-symbol-sheet.component.html',
  styleUrls: ['./dice-symbol-sheet.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, SafePipe],
})
export class DiceSymbolSheetComponent {
  private readonly modalService = inject(ModalService);
  private readonly panelService = inject(PanelService);
  private readonly saveDataService = inject(SaveDataService);
  private readonly imageService = inject(ImageService);
  private readonly imageStorage = inject(ImageStorage);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _diceSymbol = signal<DiceSymbol | null>(null);

  get diceSymbol(): DiceSymbol | null {
    return this._diceSymbol();
  }
  set diceSymbol(value: DiceSymbol | null) {
    this._diceSymbol.set(value);
  }

  readonly hasDiceDefault = computed(() => {
    const dice = this._diceSymbol();
    if (!dice) return false;
    return getDiceImagePrefix(dice.faces) !== null;
  });

  readonly faceImages = computed(() => {
    this.objectChange.fileVersion();
    const dice = this._diceSymbol();
    if (!dice) return [];
    this.objectChange.versionOf(dice.identifier)();
    return dice.faces.map((faceName) => {
      const el = dice.imageDataElement?.getFirstElementByName(faceName) as DataElement | null;
      const imageId = el ? (el.value as string) : '';
      const imgFile = imageId ? ImageStorage.instance.get(imageId) : null;
      return {
        faceName,
        imageUrl: this.imageService.getEmptyOr(imgFile).url,
        isCurrent: dice.face === faceName,
      };
    });
  });

  readonly isSaving = signal(false);
  readonly progressPercent = signal(0);

  constructor() {
    this.objectChange.objectDeleted$.subscribe((e) => {
      const dice = this._diceSymbol();
      if (dice && dice.identifier === e.identifier) {
        this.panelService.close();
      }
    }, this.destroyRef);
  }

  get name(): string {
    return this._diceSymbol()?.name ?? '';
  }
  set name(value: string) {
    const dice = this._diceSymbol();
    if (!dice) return;
    const el = dice.commonDataElement?.getFirstElementByName('name');
    if (el) el.value = value;
  }

  get size(): number {
    return this._diceSymbol()?.size ?? 1;
  }
  set size(value: number) {
    const dice = this._diceSymbol();
    if (dice) dice.size = value;
  }

  get specifyKomaImageFlag(): boolean {
    return this._diceSymbol()?.specifyKomaImageFlag ?? false;
  }
  set specifyKomaImageFlag(value: boolean) {
    const dice = this._diceSymbol();
    if (dice) dice.specifyKomaImageFlag = value;
  }

  get komaImageHeight(): number {
    return this._diceSymbol()?.komaImageHeight ?? 100;
  }
  set komaImageHeight(value: number) {
    const dice = this._diceSymbol();
    if (!dice) return;
    const num = Number(value);
    if (!Number.isFinite(num)) return;
    dice.komaImageHeight = Math.min(750, Math.max(50, num));
  }

  selectFace(faceName: string) {
    const dice = this._diceSymbol();
    if (dice) dice.face = faceName;
  }

  openFaceImageModal(faceName: string) {
    const dice = this._diceSymbol();
    if (!dice) return;
    this.modalService.open<string>(FileSelecterComponent).then((value) => {
      // null/undefined = モーダルを X で閉じた・キャンセル → 何もしない
      // string 値 = 画像選択 → セット
      if (value == null) return;
      const el = dice.imageDataElement?.getFirstElementByName(faceName) as DataElement | null;
      if (!el) return;
      el.value = value;
    });
  }

  clearFaceImage(faceName: string) {
    const dice = this._diceSymbol();
    if (!dice) return;
    const el = dice.imageDataElement?.getFirstElementByName(faceName) as DataElement | null;
    if (!el) return;
    const prefix = getDiceImagePrefix(dice.faces);
    if (prefix) {
      const url = `./assets/images/dice/${prefix}/${prefix}[${faceName}].png`;
      const image = this.imageStorage.get(url) ?? this.imageStorage.add(url);
      el.value = image.identifier;
    } else {
      el.value = '';
    }
  }

  clone() {
    const dice = this._diceSymbol();
    if (!dice) return;
    const cloneObject = dice.clone();
    cloneObject.location.x += 50;
    cloneObject.location.y += 50;
    if (dice.parent) dice.parent.appendChild(cloneObject);
    cloneObject.update();
    SoundEffect.play(PresetSound.dicePut);
  }

  async saveToXML() {
    const dice = this._diceSymbol();
    if (!dice || this.isSaving()) return;
    this.isSaving.set(true);
    this.progressPercent.set(0);
    await this.saveDataService.saveGameObjectAsync(dice, 'xml_' + dice.name, (percent) => {
      this.progressPercent.set(percent);
    });
    setTimeout(() => {
      this.isSaving.set(false);
      this.progressPercent.set(0);
    }, 500);
  }
}
