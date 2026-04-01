import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Network } from '@axe/core/index';
import { PointerDeviceService } from '@axe/core/input/pointer-device.service';
import { SaveDataService } from '@axe/core/storage/save-data.service';
import { Card } from '@axe/domain/card/card';
import { CardStack } from '@axe/domain/card/card-stack';
import { GameCharacter } from '@axe/domain/character/game-character';
import { DataElement } from '@axe/domain/data/data-element';
import { DiceSymbol } from '@axe/domain/dice/dice-symbol';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { TextNote } from '@axe/domain/shared/text-note';
import { GameTableMask } from '@axe/domain/tabletop/game-table-mask';
import { GameTableScratchMask } from '@axe/domain/tabletop/game-table-scratch-mask';
import { RangeArea } from '@axe/domain/tabletop/range';
import { Terrain } from '@axe/domain/tabletop/terrain';
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
  styleUrls: ['./game-character-sheet.component.css'],
  imports: [FormsModule, GameDataElementComponent, SafePipe],
})
export class GameCharacterSheetComponent implements OnInit, OnDestroy, AfterViewInit {
  private saveDataService = inject(SaveDataService);
  private panelService = inject(PanelService);
  private modalService = inject(ModalService);
  private pointerDeviceService = inject(PointerDeviceService);
  private uiSignalService = inject(UiSignalService);
  private objectChange = inject(ObjectChangeService);
  private destroyRef = inject(DestroyRef);

  tabletopObject:
    | GameCharacter
    | DiceSymbol
    | Card
    | CardStack
    | Terrain
    | TextNote
    | RangeArea
    | GameTableMask
    | GameTableScratchMask
    | null = null;
  isEdit: boolean = false;

  networkService = Network;

  isSaveing: boolean = false;
  progresPercent: number = 0;

  ngOnInit() {
    this.objectChange.objectDeleted$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((e) => {
      if (this.tabletopObject && this.tabletopObject.identifier === e.identifier) {
        this.panelService.close();
      }
    });
  }

  ngAfterViewInit() {}

  ngOnDestroy() {}

  toggleEditMode() {
    this.isEdit = this.isEdit ? false : true;
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
    switch (obj.aliasName) {
      case 'terrain':
        SoundEffect.play(PresetSound.blockPut);
        (cloneObject as unknown as { isLocked: boolean }).isLocked = false;
        break;
      case 'card':
      case 'card-stack':
        (cloneObject as unknown as { owner: string }).owner = '';
        (cloneObject as unknown as { toTopmost: () => void }).toTopmost();
      // falls through
      case 'table-mask':
        (cloneObject as unknown as { isLock: boolean }).isLock = false;
        SoundEffect.play(PresetSound.cardPut);
        break;
      case 'text-note':
        (cloneObject as unknown as { toTopmost: () => void }).toTopmost();
        SoundEffect.play(PresetSound.cardPut);
        break;
      case 'dice-symbol':
        SoundEffect.play(PresetSound.dicePut);
      // falls through
      default:
        SoundEffect.play(PresetSound.piecePut);
        break;
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
    option.title = (<GameCharacter>obj).name + 'への画像複製';
    const component = this.panelService.open<ImportCharacterImgComponent>(ImportCharacterImgComponent, option);
    component.tabletopObject = <GameCharacter>obj;
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
    const character = <GameCharacter>this.tabletopObject;
    character.komaImageHeight = this.normalizeKomaImageHeight(height, character.komaImageHeight);
    this.pointerDeviceService.isDragging = false;
  }

  chkDiceKomaSize(height: number) {
    const character = <DiceSymbol>this.tabletopObject;
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
    const character = <GameCharacter>this.tabletopObject;
    if (width < 270) width = 270;
    if (width > 800) width = 800;
    character.overViewWidth = width;
  }

  chkPopMaxHeight(maxHeight: number) {
    const character = <GameCharacter>this.tabletopObject;
    if (maxHeight < 250) maxHeight = 250;
    if (maxHeight > 1000) maxHeight = 1000;
    character.overViewMaxHeight = maxHeight;
  }
  async saveToXML() {
    const obj = this.tabletopObject;
    if (!obj || this.isSaveing) return;
    this.isSaveing = true;
    this.progresPercent = 0;
    const element = obj.commonDataElement.getFirstElementByName('name');
    const objectName: string = element ? <string>element.value : '';

    await this.saveDataService.saveGameObjectAsync(obj, 'xml_' + objectName, (percent) => {
      this.progresPercent = percent;
    });

    setTimeout(() => {
      this.isSaveing = false;
      this.progresPercent = 0;
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
      const mask: GameTableScratchMask = <GameTableScratchMask>this.tabletopObject;
      mask.color = event;
    }
  }

  changeMaskChangeColor(event: string) {
    if (this.tabletopObject) {
      const mask: GameTableScratchMask = <GameTableScratchMask>this.tabletopObject;
      mask.changeColor = event;
    }
  }

  changeGridColor(event: string) {
    if (this.tabletopObject) {
      const range: RangeArea = <RangeArea>this.tabletopObject;
      range.gridColor = event;
    }
  }

  changeRangeColor(event: string) {
    if (this.tabletopObject) {
      const range: RangeArea = <RangeArea>this.tabletopObject;
      range.rangeColor = event;
    }
  }
}
