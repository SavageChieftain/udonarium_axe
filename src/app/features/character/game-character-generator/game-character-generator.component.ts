import { ChangeDetectionStrategy, Component, inject, OnInit, ViewContainerRef } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ImageFile } from '@axe/core/storage/image-file';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { ObjectSerializer } from '@axe/core/sync/object-serializer';
import { GameCharacter } from '@axe/domain/character/game-character';
import { GameTableMask } from '@axe/domain/tabletop/game-table-mask';
import { TableSelecter } from '@axe/domain/tabletop/table-selecter';
import { FileSelecterComponent } from '@axe/shared/components/file-selecter/file-selecter.component';
import { SafePipe } from '@axe/shared/pipes/safe.pipe';
import { ObjectChangeService } from '@axe/shared/sync/object-change.service';
import { ModalService } from '@axe/shared/ui/modal.service';
import { PanelService } from '@axe/shared/ui/panel.service';
import { filter, map } from 'rxjs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'game-character-generator',
  templateUrl: './game-character-generator.component.html',
  styleUrls: ['./game-character-generator.component.css'],
  imports: [FormsModule, SafePipe],
})
export class GameCharacterGeneratorComponent implements OnInit {
  private viewContainerRef = inject(ViewContainerRef);
  private modalService = inject(ModalService);
  private panelService = inject(PanelService);
  private imageStorage = inject(ImageStorage);
  private objectSerializer = inject(ObjectSerializer);
  private tableSelecter = inject(TableSelecter);
  private objectChange = inject(ObjectChangeService);

  name: string = 'ゲームキャラクター';
  size: number = 1;
  xml: string = '';

  minSize: number = 1;
  maxSize: number = 20;

  readonly tableBackgroundImage = toSignal(
    this.objectChange.selectFile$.pipe(
      map((event) => this.imageStorage.get(event.fileIdentifier)),
      filter((file): file is ImageFile => !!file)
    ),
    { initialValue: ImageFile.createEmpty('null') }
  );

  ngOnInit() {
    queueMicrotask(() => (this.panelService.title = 'キャラクタージェネレーター'));
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
