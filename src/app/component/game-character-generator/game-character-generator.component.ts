import { AfterViewInit, Component, OnDestroy, OnInit, ViewContainerRef, inject } from '@angular/core';

import { ImageFile } from '@axe/core/file-storage/image-file';
import { ImageStorage } from '@axe/core/file-storage/image-storage';
import { ObjectSerializer } from '@axe/core/synchronize-object/object-serializer';
import { EventSystem } from '@axe/core/system';
import { GameCharacter } from '@axe/game-character';
import { GameTableMask } from '@axe/game-table-mask';
import { TableSelecter } from '@axe/table-selecter';

import { FileSelecterComponent } from 'component/file-selecter/file-selecter.component';
import { ModalService } from 'service/modal.service';
import { PanelService } from 'service/panel.service';
import { FormsModule } from '@angular/forms';
import { SafePipe } from 'pipe/safe.pipe';

@Component({
  selector: 'game-character-generator',
  templateUrl: './game-character-generator.component.html',
  styleUrls: ['./game-character-generator.component.css'],
  imports: [FormsModule, SafePipe],
})
export class GameCharacterGeneratorComponent implements OnInit, OnDestroy, AfterViewInit {
  private viewContainerRef = inject(ViewContainerRef);
  private modalService = inject(ModalService);
  private panelService = inject(PanelService);

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

      const file: ImageFile = ImageStorage.instance.get(fileIdentifier);
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
    const viewTable = TableSelecter.instance.viewTable;
    if (!viewTable) return;
    const tableMask = GameTableMask.create('マップマスク', 5, 5, 100);
    viewTable.appendChild(tableMask);
  }

  createGameCharacterForXML(xml: string) {
    ObjectSerializer.instance.parseXml(xml);
  }

  openModal() {
    this.modalService.open(FileSelecterComponent);
  }
}
