import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ImageFile } from '@axe/core/storage/image-file';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { DataElement } from '@axe/domain/data/data-element';
import { SafePipe } from '@axe/shared/pipes/safe.pipe';
import { ObjectChangeService } from '@axe/shared/sync/object-change.service';
import { ModalService } from '@axe/shared/ui/modal.service';
import { PanelService } from '@axe/shared/ui/panel.service';
import { NgOptionComponent, NgSelectComponent } from '@ng-select/ng-select';

@Component({
  selector: 'import-character-img',
  templateUrl: './import-character-img.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgSelectComponent, FormsModule, NgOptionComponent, SafePipe],
})
export class ImportCharacterImgComponent {
  private readonly panelService = inject(PanelService);
  private readonly modalService = inject(ModalService);
  private readonly objectStore = inject(ObjectStore);
  private readonly imageStorage = inject(ImageStorage);
  private readonly objectChange = inject(ObjectChangeService);

  tabletopObject: GameCharacter | null = null;

  sendFrom: string = '';

  readonly gameCharacters = computed(() => {
    this.objectChange.collectionOf(GameCharacter.aliasName)();
    return this.objectStore.getObjects<GameCharacter>(GameCharacter).filter((character) => this.allowsChat(character));
  });

  constructor() {
    this.sendFrom = this.gameCharacters().length >= 1 ? this.gameCharacters()[0].identifier : '';
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
    const object = this.objectStore.get(this.sendFrom);
    if (object instanceof GameCharacter) {
      const image = this.imageStorage.get(object.imageDataElement?.children[0]?.value as string);
      return image ? image : ImageFile.Empty;
    }
    return ImageFile.Empty;
  }

  get portraitCount() {
    const object = this.objectStore.get(this.sendFrom);
    if (object instanceof GameCharacter) {
      return object.imageDataElement?.children.length ?? 0;
    }
    return 0;
  }

  importImages() {
    if (!this.tabletopObject) return;
    const object = this.objectStore.get(this.sendFrom);
    if (object instanceof GameCharacter) {
      if (GameCharacter) {
        const distImageDataElement = this.tabletopObject.imageDataElement;
        const srcImageDataElement = object.imageDataElement;
        if (!distImageDataElement || !srcImageDataElement) return;

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
          const dist = distImageDataElement.children[count] as DataElement;
          const src = srcImageDataElement.children[count] as DataElement;

          dist.currentValue = src.currentValue;
          dist.name = src.name;
          dist.value = src.value;
        }

        const root = distImageDataElement.parent as DataElement;
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
}
