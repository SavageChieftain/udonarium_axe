import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal, ViewContainerRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { ModalService } from '@axe/application/ui/modal.service';
import { PanelService } from '@axe/application/ui/panel.service';
import { ImageFile } from '@axe/core/storage/image-file';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { ObjectSerializer } from '@axe/core/sync/object-serializer';
import { GameCharacter } from '@axe/domain/character/game-character';
import { GameTableMask } from '@axe/domain/tabletop/game-table-mask';
import { TableSelecter } from '@axe/domain/tabletop/table-selecter';
import { FileSelecterComponent } from '@axe/ui/components/file-selecter/file-selecter.component';
import { SafePipe } from '@axe/ui/pipes/safe.pipe';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'game-character-generator',
  templateUrl: './game-character-generator.component.html',
  imports: [FormsModule, SafePipe],
})
export class GameCharacterGeneratorComponent {
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly modalService = inject(ModalService);
  private readonly panelService = inject(PanelService);
  private readonly imageStorage = inject(ImageStorage);
  private readonly objectSerializer = inject(ObjectSerializer);
  private readonly tableSelecter = inject(TableSelecter);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly destroyRef = inject(DestroyRef);

  name: string = 'ゲームキャラクター';
  size: number = 1;
  xml: string = '';

  minSize: number = 1;
  maxSize: number = 20;

  readonly tableBackgroundImage = signal<ImageFile>(ImageFile.createEmpty('null'));

  constructor() {
    queueMicrotask(() => (this.panelService.title = 'キャラクタージェネレーター'));
    this.objectChange.selectFile$.subscribe((event) => {
      const file = this.imageStorage.get(event.fileIdentifier);
      if (file) this.tableBackgroundImage.set(file);
    }, this.destroyRef);
  }

  createGameCharacter() {
    GameCharacter.create(this.name, this.size, this.tableBackgroundImage().identifier);
  }
  createGameTableMask() {
    const viewTable = this.tableSelecter.viewTable;
    if (!viewTable) return;
    const tableMask = GameTableMask.create('マップマスク', 5, 5, 100);
    viewTable.appendChild(tableMask);
  }

  createGameCharacterForXML(xml: string) {
    this.objectSerializer.parseXml(xml);
  }

  openModal() {
    this.modalService.open(FileSelecterComponent);
  }
}
