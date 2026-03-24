import { AfterViewInit, ChangeDetectionStrategy, Component, inject, Input, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EventSystem, Network } from '@axe/core/index';
import { PointerDeviceService } from '@axe/core/pointer-device.service';
import { SaveDataService } from '@axe/core/save-data.service';
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
import { FileSelecterComponent } from '@axe/features/file/file-selecter/file-selecter.component';
import { ModalService } from '@axe/shared/modal.service';
import { PanelOption, PanelService } from '@axe/shared/panel.service';
import { SafePipe } from '@axe/shared/pipes/safe.pipe';
import { UiSignalService } from '@axe/shared/ui-signal.service';

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

  @Input() tabletopObject:
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
    EventSystem.register(this).on('DELETE_GAME_OBJECT', (event) => {
      if (this.tabletopObject && this.tabletopObject!.identifier === event.data.identifier) {
        this.panelService.close();
      }
    });
  }

  ngAfterViewInit() {}

  ngOnDestroy() {
    EventSystem.unregister(this);
  }

  toggleEditMode() {
    this.isEdit = this.isEdit ? false : true;
  }

  addDataElement() {
    if (this.tabletopObject!.detailDataElement) {
      const title = DataElement.create('見出し', '', {});
      const tag = DataElement.create('タグ', '', {});
      title.appendChild(tag);
      this.tabletopObject!.detailDataElement.appendChild(title);
    }
  }

  clone() {
    const cloneObject = this.tabletopObject!.clone();
    cloneObject.location.x += 50;
    cloneObject.location.y += 50;
    if (this.tabletopObject!.parent) this.tabletopObject!.parent.appendChild(cloneObject);
    cloneObject.update();
    switch (this.tabletopObject!.aliasName) {
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
    const coordinate = this.pointerDeviceService.pointers[0];
    const option: PanelOption = {
      left: coordinate.x - 250,
      top: coordinate.y - 175,
      width: 350,
      height: 250,
    };
    option.title = (<GameCharacter>this.tabletopObject!).name + 'への画像複製';
    const component = this.panelService.open<ImportCharacterImgComponent>(ImportCharacterImgComponent, option);
    component.tabletopObject = <GameCharacter>this.tabletopObject;
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
    setTimeout(() => {
      this.uiSignalService.requestNoteResize(this.tabletopObject!.identifier);
    }, 100);
  }

  chkKomaSize(height: number) {
    const character = <GameCharacter>this.tabletopObject;
    if (height < 50) height = 50;
    if (height > 750) height = 750;
    character.komaImageHeight = height;
  }

  chkDiceKomaSize(height: number) {
    const character = <DiceSymbol>this.tabletopObject;
    if (height < 50) height = 50;
    if (height > 750) height = 750;
    character.komaImageHeight = height;
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
    if (!this.tabletopObject || this.isSaveing) return;
    this.isSaveing = true;
    this.progresPercent = 0;
    const element = this.tabletopObject!.commonDataElement.getFirstElementByName('name');
    const objectName: string = element ? <string>element.value : '';

    await this.saveDataService.saveGameObjectAsync(this.tabletopObject!, 'xml_' + objectName, (percent) => {
      this.progresPercent = percent;
    });

    setTimeout(() => {
      this.isSaveing = false;
      this.progresPercent = 0;
    }, 500);
  }

  setLocation(locationName: string) {
    this.tabletopObject!.setLocation(locationName);
  }

  openModal(name: string = '', isAllowedEmpty: boolean = false) {
    this.modalService.open<string>(FileSelecterComponent, { isAllowedEmpty: isAllowedEmpty }).then((value) => {
      if (!this.tabletopObject || !this.tabletopObject!.imageDataElement || !value) return;
      const element = this.tabletopObject!.imageDataElement.getFirstElementByName(name);
      if (!element) return;
      element.value = value;
    });
  }

  changeMaskFillColor(event: string) {
    if (this.tabletopObject!) {
      const mask: GameTableScratchMask = <GameTableScratchMask>this.tabletopObject;
      mask.color = event;
    }
  }

  changeMaskChangeColor(event: string) {
    if (this.tabletopObject!) {
      const mask: GameTableScratchMask = <GameTableScratchMask>this.tabletopObject;
      mask.changeColor = event;
    }
  }

  changeGridColor(event: string) {
    if (this.tabletopObject!) {
      const range: RangeArea = <RangeArea>this.tabletopObject;
      range.gridColor = event;
    }
  }

  changeRangeColor(event: string) {
    if (this.tabletopObject!) {
      const range: RangeArea = <RangeArea>this.tabletopObject;
      range.rangeColor = event;
    }
  }
}
