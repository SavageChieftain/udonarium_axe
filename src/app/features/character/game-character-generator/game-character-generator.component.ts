import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal, ViewContainerRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { RolePermissionService } from '@axe/application/permission/role-permission.service';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { ModalService } from '@axe/application/ui/modal.service';
import { PanelService } from '@axe/application/ui/panel.service';
import { ImageFile } from '@axe/core/storage/image-file';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { ObjectSerializer } from '@axe/core/sync/object-serializer';
import { GameCharacter } from '@axe/domain/character/game-character';
import { DisclosureMode } from '@axe/domain/disclosure/disclosure';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { GameTableMask } from '@axe/domain/tabletop/game-table-mask';
import { TableSelecter } from '@axe/domain/tabletop/table-selecter';
import { RoomPanelService } from '@axe/features/panels/room-panel.service';
import { FileSelecterComponent } from '@axe/ui/components/file-selecter/file-selecter.component';
import { SafePipe } from '@axe/ui/pipes/safe.pipe';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'game-character-generator',
  templateUrl: './game-character-generator.component.html',
  imports: [FormsModule, SafePipe, TranslocoModule],
})
export class GameCharacterGeneratorComponent {
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly modalService = inject(ModalService);
  private readonly panelService = inject(PanelService);
  private readonly roomPanels = inject(RoomPanelService);
  private readonly imageStorage = inject(ImageStorage);
  private readonly objectSerializer = inject(ObjectSerializer);
  private readonly tableSelecter = inject(TableSelecter);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly rolePermission = inject(RolePermissionService);
  private readonly t = inject(TRANSLATE_FN);

  name: string = this.t('feature.character.generator.defaultName');
  size: number = 1;
  xml: string = '';

  minSize: number = 1;
  maxSize: number = 20;

  readonly tableBackgroundImage = signal<ImageFile>(ImageFile.createEmpty('null'));

  constructor() {
    queueMicrotask(() => (this.panelService.title = this.t('feature.character.panel.generator')));
    this.objectChange.selectFile$.subscribe((event) => {
      const file = this.imageStorage.get(event.fileIdentifier);
      if (file) this.tableBackgroundImage.set(file);
    }, this.destroyRef);
  }

  get canEdit(): boolean {
    return this.rolePermission.canEditTabletop;
  }

  createGameCharacter() {
    if (!this.canEdit) return;
    const character = GameCharacter.create(this.name, this.size, this.tableBackgroundImage().identifier);
    character.owner = PeerCursor.myCursor?.userId ?? '';
    if (PeerCursor.isMyselfGameMaster) character.disclosureMode = DisclosureMode.GameMaster;
    character.update();
  }
  createGameTableMask() {
    if (!this.canEdit) return;
    const viewTable = this.tableSelecter.viewTable;
    if (!viewTable) return;
    const tableMask = GameTableMask.create(this.t('feature.character.generator.defaultMaskName'), 5, 5, 100);
    viewTable.appendChild(tableMask);
  }

  createGameCharacterForXML(xml: string) {
    if (!this.canEdit) return;
    this.objectSerializer.parseXml(xml);
  }

  openModal() {
    this.modalService.open(FileSelecterComponent);
  }

  openImportCharacter() {
    this.roomPanels.open('characterImport', { left: 100, top: 100 });
  }
}
