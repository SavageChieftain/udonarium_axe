import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  viewChild,
  ViewContainerRef,
} from '@angular/core';
import { AppEventHandlerService } from '@axe/core/app/app-event-handler.service';
import { Network } from '@axe/core/network/network';
import { FileArchiver } from '@axe/core/storage/file-archiver';
import { SaveDataService } from '@axe/core/storage/save-data.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { ReloadCheck } from '@axe/domain/peer/reload-check';
import { GameCharacterGeneratorComponent } from '@axe/features/character/game-character-generator/game-character-generator.component';
import { GameCharacterSheetComponent } from '@axe/features/character/game-character-sheet/game-character-sheet.component';
import { ChatWindowComponent } from '@axe/features/chat/chat-window/chat-window.component';
import { FileStorageComponent } from '@axe/features/file/file-storage/file-storage.component';
import { GameObjectInventoryComponent } from '@axe/features/inventory/game-object-inventory/game-object-inventory.component';
import { NetworkIndicatorComponent } from '@axe/features/lobby/network-indicator/network-indicator.component';
import { PeerMenuComponent } from '@axe/features/lobby/peer-menu/peer-menu.component';
import { JukeboxComponent } from '@axe/features/media/jukebox/jukebox.component';
import { GameTableComponent } from '@axe/features/tabletop/game-table/game-table.component';
import { GameTableSettingComponent } from '@axe/features/tabletop/game-table-setting/game-table-setting.component';
import { ContextMenuComponent } from '@axe/shared/components/context-menu/context-menu.component';
import { ModalComponent } from '@axe/shared/components/modal/modal.component';
import { UIPanelComponent } from '@axe/shared/components/ui-panel/ui-panel.component';
import { ContextMenuService } from '@axe/shared/ui/context-menu.service';
import { ModalService } from '@axe/shared/ui/modal.service';
import { PanelOption, PanelService } from '@axe/shared/ui/panel.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  templateUrl: './app.component.html',
  styles: [
    `
      img {
        height: 5px;
        width: 5px;
      }
      .dummydisp {
        position: absolute;
        color: rgba(30, 30, 30, 0);
        font-size: 10px;
        max-height: 5px;
      }

      nav ul {
        list-style: none;
        padding: 0px;
        margin: 0px;
      }

      nav ul > li {
        text-align: center;
        padding: 5px;
        color: #ccc;
        color: #444;

        cursor: -moz-pointer;
        cursor: -webkit-pointer;
        cursor: pointer;
      }

      nav ul > li:hover {
        color: #ccc;
        background-color: rgba(30, 30, 30, 0.8);
      }
      nav ul > li > a {
        height: 128px;
        width: 128px;
        font-size: 8px;
        user-select: none;
      }
      nav ul > li > a > label {
        cursor: -moz-pointer;
        cursor: -webkit-pointer;
        cursor: pointer;
      }
      nav ul i {
        font-size: 24px;
      }
      nav ul a,
      nav ul a:hover,
      nav ul a:active,
      nav ul a:visited {
        text-decoration: none;
      }

      .icon-size {
        font-size: 40px;
      }

      .side-menu {
        top: 0px;
        left: 0px;
        box-sizing: border-box;
        overflow: auto;
        position: absolute;
        color: #ccc;
        background-color: rgba(30, 30, 30, 0.8);
        border: solid 1px #999;
        padding: 0px;
        height: 100%;
        width: 300px;
      }

      .networkIndicator {
        display: none;
        z-index: 9999;
        pointer-events: none;
        position: absolute;
        top: 3px;
        right: 3px;
        height: 30px;
        width: 30px;
      }
    `,
  ],
  imports: [GameTableComponent, UIPanelComponent, NetworkIndicatorComponent],
})
export class AppComponent {
  private readonly panelService = inject(PanelService);
  private readonly saveDataService = inject(SaveDataService);
  private readonly fileArchiver = inject(FileArchiver);
  private readonly objectStore = inject(ObjectStore);
  private readonly eventHandler = inject(AppEventHandlerService);

  readonly modalLayerViewContainerRef = viewChild.required('modalLayer', { read: ViewContainerRef });

  isSaving = signal(false);
  progressPercent = signal(0);
  private openPanelCount = 0;

  constructor() {
    this.eventHandler.initialize();
    afterNextRender(() => {
      PanelService.defaultParentViewContainerRef =
        ModalService.defaultParentViewContainerRef =
        ContextMenuService.defaultParentViewContainerRef =
          this.modalLayerViewContainerRef();
      this.panelService.open(PeerMenuComponent, { width: 500, height: 450, left: 100 });
      this.panelService.open(ChatWindowComponent, { width: 700, height: 400, left: 100, top: 450 });
    });
  }

  open(
    componentName:
      | 'PeerMenuComponent'
      | 'ChatWindowComponent'
      | 'GameTableSettingComponent'
      | 'FileStorageComponent'
      | 'GameCharacterSheetComponent'
      | 'JukeboxComponent'
      | 'GameCharacterGeneratorComponent'
      | 'GameObjectInventoryComponent'
  ) {
    let component: { new (...args: unknown[]): unknown } | null = null;
    let option: PanelOption = { width: 450, height: 600, left: 100 };
    switch (componentName) {
      case 'PeerMenuComponent':
        component = PeerMenuComponent;
        break;
      case 'ChatWindowComponent':
        component = ChatWindowComponent;
        option.width = 700;
        break;
      case 'GameTableSettingComponent':
        component = GameTableSettingComponent;
        option = { width: 630, height: 500, left: 100 };
        break;
      case 'FileStorageComponent':
        component = FileStorageComponent;
        break;
      case 'GameCharacterSheetComponent':
        component = GameCharacterSheetComponent;
        break;
      case 'JukeboxComponent':
        component = JukeboxComponent;
        break;
      case 'GameCharacterGeneratorComponent':
        component = GameCharacterGeneratorComponent;
        option = { width: 500, height: 300, left: 100 };
        break;
      case 'GameObjectInventoryComponent':
        component = GameObjectInventoryComponent;
        break;
    }
    if (component) {
      option.top = ((this.openPanelCount % 10) + 1) * 20;
      option.left = 100 + ((this.openPanelCount % 20) + 1) * 5;
      this.openPanelCount = this.openPanelCount + 1;
      this.panelService.open(component, option);
    }
  }

  async save() {
    if (this.isSaving()) return;
    this.isSaving.set(true);
    this.progressPercent.set(0);

    const roomName =
      Network.peerContext && Network.peerContext.roomName.length > 0 ? Network.peerContext.roomName : 'ルームデータ';
    await this.saveDataService.saveRoomAsync(roomName, (percent) => {
      this.progressPercent.set(percent);
    });

    setTimeout(() => {
      this.isSaving.set(false);
      this.progressPercent.set(0);
    }, 500);
  }

  handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    const reloadCheck = this.objectStore.get<ReloadCheck>('ReloadCheck');
    reloadCheck?.reloadCheckStart(Network.peerContext.roomName != '');
    if (files && files.length) this.fileArchiver.load(files);
    input.value = '';
  }
}

PanelService.UIPanelComponentClass = UIPanelComponent;
ContextMenuService.ContextMenuComponentClass = ContextMenuComponent;
ModalService.ModalComponentClass = ModalComponent;
