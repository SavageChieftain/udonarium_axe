import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  OnInit,
  ViewContainerRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ImageFile } from '@axe/core/storage/image-file';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { ObjectSerializer } from '@axe/core/sync/object-serializer';
import { GameCharacter } from '@axe/domain/character/game-character';
import { GameTableMask } from '@axe/domain/tabletop/game-table-mask';
import { TableSelecter } from '@axe/domain/tabletop/table-selecter';
import { FileSelecterComponent } from '@axe/features/file/file-selecter/file-selecter.component';
import { ModalService } from '@axe/shared/modal.service';
import { ObjectChangeService } from '@axe/shared/object-change.service';
import { PanelService } from '@axe/shared/panel.service';
import { SafePipe } from '@axe/shared/pipes/safe.pipe';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'game-character-generator',
  templateUrl: './game-character-generator.component.html',
  styleUrls: ['./game-character-generator.component.css'],
  imports: [FormsModule, SafePipe],
})
export class GameCharacterGeneratorComponent implements OnInit, AfterViewInit {
  private viewContainerRef = inject(ViewContainerRef);
  private modalService = inject(ModalService);
  private panelService = inject(PanelService);
  private imageStorage = inject(ImageStorage);
  private objectSerializer = inject(ObjectSerializer);
  private tableSelecter = inject(TableSelecter);
  private changeDetector = inject(ChangeDetectorRef);
  private objectChange = inject(ObjectChangeService);
  private destroyRef = inject(DestroyRef);

  name: string = 'ゲームキャラクター';
  size: number = 1;
  xml: string = '';

  minSize: number = 1;
  maxSize: number = 20;

  tableBackgroundImage: ImageFile = ImageFile.createEmpty('null');

  ngOnInit() {
    queueMicrotask(() => (this.panelService.title = 'キャラクタージェネレーター'));
    this.objectChange.selectFile$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      const file: ImageFile = this.imageStorage.get(event.fileIdentifier);
      if (file) {
        this.tableBackgroundImage = file;
        this.changeDetector.markForCheck();
      }
    });
  }

  ngAfterViewInit() {}

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
