import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ImageFile } from '@axe/core/storage/image-file';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { RangeArea } from '@axe/domain/tabletop/range';
import { SafePipe } from '@axe/shared/pipes/safe.pipe';
import { ObjectChangeService } from '@axe/shared/sync/object-change.service';
import { ModalService } from '@axe/shared/ui/modal.service';
import { PanelService } from '@axe/shared/ui/panel.service';
import { NgOptionComponent, NgSelectComponent } from '@ng-select/ng-select';

@Component({
  selector: 'range-docking-character',
  templateUrl: './range-docking-character.component.html',
  styleUrls: ['./range-docking-character.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgSelectComponent, FormsModule, NgOptionComponent, SafePipe],
})
export class RangeDockingCharacterComponent {
  private readonly panelService = inject(PanelService);
  private readonly modalService = inject(ModalService);
  private readonly objectStore = inject(ObjectStore);
  private readonly imageStorage = inject(ImageStorage);
  private readonly objectChange = inject(ObjectChangeService);

  tabletopObject: RangeArea | null = null;

  readonly sendFrom = signal('');

  readonly gameCharacters = computed(() => {
    this.objectChange.collectionOf(GameCharacter.aliasName)();
    return this.objectStore.getObjects<GameCharacter>(GameCharacter).filter((character) => this.allowsChat(character));
  });

  constructor() {
    this.sendFrom.set(this.gameCharacters().length >= 1 ? this.gameCharacters()[0].identifier : '');
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

  readonly imageFile = computed((): ImageFile => {
    this.objectChange.fileVersion();
    this.objectChange.versionOf(this.sendFrom())();
    const object = this.objectStore.get(this.sendFrom());
    if (object instanceof GameCharacter) {
      const image = this.imageStorage.get(object.imageDataElement?.children[0]?.value as string);
      return image ? image : ImageFile.Empty;
    }
    return ImageFile.Empty;
  });

  readonly portraitCount = computed((): number => {
    this.objectChange.versionOf(this.sendFrom())();
    const object = this.objectStore.get(this.sendFrom());
    if (object instanceof GameCharacter) {
      return object.imageDataElement?.children.length ?? 0;
    }
    return 0;
  });

  followring() {
    if (!this.tabletopObject) return;
    const object = this.objectStore.get(this.sendFrom());
    if (object instanceof GameCharacter) {
      if (GameCharacter) {
        SoundEffect.play(PresetSound.lock);
        this.tabletopObject.followingCharctorIdentifier = object.identifier;
        this.tabletopObject.following();
      }
    }
    this.panelService.close();
  }

  cancel() {
    this.panelService.close();
  }
}
