import {
  afterNextRender,
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  viewChild,
  ViewContainerRef,
} from '@angular/core';
import { AppEventHandlerService } from '@axe/core/app-event-handler.service';
import { Network } from '@axe/core/network/network';
import { SaveDataService } from '@axe/core/save-data.service';
import { FileArchiver } from '@axe/core/storage/file-archiver';
import { ObjectStore } from '@axe/core/sync/object-store';
import { ReloadCheck } from '@axe/domain/shared/reload-check';
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
import { ContextMenuService } from '@axe/shared/context-menu.service';
import { ModalService } from '@axe/shared/modal.service';
import { PanelOption, PanelService } from '@axe/shared/panel.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  imports: [GameTableComponent, UIPanelComponent, NetworkIndicatorComponent],
})
export class AppComponent implements AfterViewInit {
  private readonly panelService = inject(PanelService);
  private readonly saveDataService = inject(SaveDataService);
  private readonly fileArchiver = inject(FileArchiver);
  private readonly objectStore = inject(ObjectStore);
  private readonly eventHandler = inject(AppEventHandlerService);

  readonly modalLayerViewContainerRef = viewChild.required('modalLayer', { read: ViewContainerRef });

  isSaveing = signal(false);
  progresPercent = signal(0);
  private openPanelCount = 0;

  constructor() {
    this.eventHandler.initialize();
    afterNextRender(() => {
      this.panelService.open(PeerMenuComponent, { width: 500, height: 450, left: 100 });
      this.panelService.open(ChatWindowComponent, { width: 700, height: 400, left: 100, top: 450 });
    });
  }

  ngAfterViewInit() {
    PanelService.defaultParentViewContainerRef =
      ModalService.defaultParentViewContainerRef =
      ContextMenuService.defaultParentViewContainerRef =
        this.modalLayerViewContainerRef();
  }

  open(componentName: string) {
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
    if (this.isSaveing()) return;
    this.isSaveing.set(true);
    this.progresPercent.set(0);

    const roomName =
      Network.peerContext && 0 < Network.peerContext.roomName.length ? Network.peerContext.roomName : 'ルームデータ';
    await this.saveDataService.saveRoomAsync(roomName, (percent) => {
      this.progresPercent.set(percent);
    });

    setTimeout(() => {
      this.isSaveing.set(false);
      this.progresPercent.set(0);
    }, 500);
  }

  handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    const reloadCheck = this.objectStore.get<ReloadCheck>('ReloadCheck');
    reloadCheck.reloadCheckStart(Network.peerContext.roomName != '');
    if (files && files.length) this.fileArchiver.load(files);
    input.value = '';
  }
}

PanelService.UIPanelComponentClass = UIPanelComponent;
ContextMenuService.ContextMenuComponentClass = ContextMenuComponent;
ModalService.ModalComponentClass = ModalComponent;
