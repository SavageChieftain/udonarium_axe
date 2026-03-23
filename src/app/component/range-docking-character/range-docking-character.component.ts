import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  Input,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ImageFile } from '@axe/class/core/file-storage/image-file';
import { ImageStorage } from '@axe/class/core/file-storage/image-storage';
import { ObjectStore } from '@axe/class/core/synchronize-object/object-store';
import { GameCharacter } from '@axe/class/game-character';
import { RangeArea } from '@axe/class/range';
import { PresetSound, SoundEffect } from '@axe/class/sound-effect';
import { NgOptionComponent, NgSelectComponent } from '@ng-select/ng-select';
import { SafePipe } from '@axe/pipe/safe.pipe';
import { ModalService } from '@axe/service/modal.service';
import { PanelService } from '@axe/service/panel.service';

@Component({
  selector: 'range-docking-character',
  templateUrl: './range-docking-character.component.html',
  styleUrls: ['./range-docking-character.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgSelectComponent, FormsModule, NgOptionComponent, SafePipe],
})
export class RangeDockingCharacterComponent implements OnInit, OnDestroy, AfterViewInit {
  private changeDetector = inject(ChangeDetectorRef);
  private panelService = inject(PanelService);
  private modalService = inject(ModalService);
  private objectStore = inject(ObjectStore);
  private imageStorage = inject(ImageStorage);

  @Input() tabletopObject: RangeArea = null!;

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
      this._gameCharacters = this.objectStore
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
    const object = this.objectStore.get(this._sendFrom);
    if (object instanceof GameCharacter) {
      const image: ImageFile = this.imageStorage.get(<string>object.imageDataElement.children[0].value);
      return image ? image : ImageFile.Empty;
    }
    return ImageFile.Empty;
  }

  get selectCharacterTachieNum() {
    const object = this.objectStore.get(this._sendFrom);
    if (object instanceof GameCharacter) {
      return object.imageDataElement.children.length;
    }
    return 0;
  }

  followring() {
    const object = this.objectStore.get(this._sendFrom);
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

  ngOnInit() {
    this._sendFrom = this.gameCharacters.length >= 1 ? this.gameCharacters[0].identifier : '';
  }

  ngAfterViewInit() {}

  ngOnDestroy() {}
}
