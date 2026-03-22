import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { ModalService } from 'service/modal.service';
import { PanelService } from 'service/panel.service';
import { GameCharacter } from '@axe/game-character';
import { DataElement } from '@axe/data-element';

import { ObjectStore } from '@axe/core/synchronize-object/object-store';

import { ImageFile } from '@axe/core/file-storage/image-file';
import { ImageStorage } from '@axe/core/file-storage/image-storage';
import { NgSelectComponent, NgOptionComponent } from '@ng-select/ng-select';
import { FormsModule } from '@angular/forms';
import { SafePipe } from 'pipe/safe.pipe';

@Component({
  selector: 'import-character-img',
  templateUrl: './import-character-img.component.html',
  styleUrls: ['./import-character-img.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgSelectComponent, FormsModule, NgOptionComponent, SafePipe],
})
export class ImportCharacterImgComponent implements OnInit, OnDestroy, AfterViewInit {
  private changeDetector = inject(ChangeDetectorRef);
  private panelService = inject(PanelService);
  private modalService = inject(ModalService);

  @Input() tabletopObject: GameCharacter = null!;

  private _sendFrom!: string;
  get sendFrom(): string {
    return this._sendFrom;
  }
  set sendFrom(sendFrom: string) {
    this._sendFrom = sendFrom;
  }

  private shouldUpdateCharacterList: boolean = true;
  private _gameCharacters: GameCharacter[] = [];
  get gameCharacters(): GameCharacter[] {
    if (this.shouldUpdateCharacterList) {
      this.shouldUpdateCharacterList = false;
      this._gameCharacters = ObjectStore.instance
        .getObjects<GameCharacter>(GameCharacter)
        .filter((character) => this.allowsChat(character));
    }
    return this._gameCharacters;
  }

  private allowsChat(gameCharacter: GameCharacter): boolean {
    switch (gameCharacter.location.name) {
      case 'table':
        return !gameCharacter.nonTalkFlag;
      case 'graveyard':
        return false;
      default:
        return false;
    }
  }

  get imageFile(): ImageFile {
    const object = ObjectStore.instance.get(this._sendFrom);
    if (object instanceof GameCharacter) {
      const image: ImageFile = ImageStorage.instance.get(<string>object.imageDataElement.children[0].value);
      return image ? image : ImageFile.Empty;
    }
    return ImageFile.Empty;
  }

  get selectCharacterTachieNum() {
    const object = ObjectStore.instance.get(this._sendFrom);
    if (object instanceof GameCharacter) {
      return object.imageDataElement.children.length;
    }
    return 0;
  }

  importImages() {
    const object = ObjectStore.instance.get(this._sendFrom);
    if (object instanceof GameCharacter) {
      if (GameCharacter) {
        const distImageDataElement = this.tabletopObject.imageDataElement;
        const srcImageDataElement = object.imageDataElement;

        while (distImageDataElement.children.length < srcImageDataElement.children.length) {
          distImageDataElement.appendChild(DataElement.create('imageIdentifier', '', { type: 'image' }, ''));
        }

        while (
          distImageDataElement.children.length > srcImageDataElement.children.length &&
          distImageDataElement.children.length >= 2
        ) {
          distImageDataElement.children[distImageDataElement.children.length - 1].destroy();
        }

        let count;
        for (count = 0; count < srcImageDataElement.children.length; count++) {
          const dist = <DataElement>distImageDataElement.children[count];
          const src = <DataElement>srcImageDataElement.children[count];

          dist.currentValue = src.currentValue;
          dist.name = src.name;
          dist.value = src.value;
        }

        const root = <DataElement>distImageDataElement.parent;
        const icon = root.getElementsByName('ICON');
        if (icon) {
          icon[0].value = distImageDataElement.children.length - 1;
          if (+icon[0].currentValue > +icon[0].value) icon[0].currentValue = icon[0].value;
        }
      }
    }
  }

  cancel() {
    this.panelService.close();
  }

  ngOnInit() {
    this._sendFrom = this.gameCharacters.length >= 1 ? this.gameCharacters[0].identifier : '';
  }

  ngAfterViewInit() {}

  ngOnDestroy() {}
}
