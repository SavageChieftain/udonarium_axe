import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  inject,
  OnDestroy,
  OnInit,
  ViewContainerRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ImageFile } from '@axe/class/core/file-storage/image-file';
import { ImageStorage } from '@axe/class/core/file-storage/image-storage';
import { ObjectSerializer } from '@axe/class/core/synchronize-object/object-serializer';
import { EventSystem } from '@axe/class/core/system';
import { GameCharacter } from '@axe/class/game-character';
import { GameTableMask } from '@axe/class/game-table-mask';
import { TableSelecter } from '@axe/class/table-selecter';
import { FileSelecterComponent } from '@axe/component/file-selecter/file-selecter.component';
import { SafePipe } from '@axe/pipe/safe.pipe';
import { ModalService } from '@axe/service/modal.service';
import { PanelService } from '@axe/service/panel.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'game-character-generator',
  templateUrl: './game-character-generator.component.html',
  styleUrls: ['./game-character-generator.component.css'],
  imports: [FormsModule, SafePipe],
})
export class GameCharacterGeneratorComponent implements OnInit, OnDestroy, AfterViewInit {
  private viewContainerRef = inject(ViewContainerRef);
  private modalService = inject(ModalService);
  private panelService = inject(PanelService);
  private imageStorage = inject(ImageStorage);
  private objectSerializer = inject(ObjectSerializer);
  private tableSelecter = inject(TableSelecter);

  name: string = 'ゲームキャラクター';
  size: number = 1;
  xml: string = '';

  minSize: number = 1;
  maxSize: number = 20;

  tableBackgroundImage: ImageFile = ImageFile.createEmpty('null');

  ngOnInit() {
    queueMicrotask(() => (this.panelService.title = 'キャラクタージェネレーター'));
    EventSystem.register(this).on('SELECT_FILE', (event) => {
      const fileIdentifier: string = event.data.fileIdentifier;

      const file: ImageFile = this.imageStorage.get(fileIdentifier);
      if (file) this.tableBackgroundImage = file;
    });
  }

  ngAfterViewInit() {}

  ngOnDestroy() {
    EventSystem.unregister(this);
  }

  createGameCharacter() {
    GameCharacter.create(this.name, this.size, this.tableBackgroundImage.identifier);
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
