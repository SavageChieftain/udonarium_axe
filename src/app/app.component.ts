import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
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
import { CutInListComponent } from '@axe/features/media/cut-in-list/cut-in-list.component';
import { JukeboxComponent } from '@axe/features/media/jukebox/jukebox.component';
import { MiniJukeboxComponent } from '@axe/features/media/mini-jukebox/mini-jukebox.component';
import { GameTableComponent } from '@axe/features/tabletop/game-table/game-table.component';
import { GameTableSettingComponent } from '@axe/features/tabletop/game-table-setting/game-table-setting.component';
import { ContextMenuComponent } from '@axe/shared/components/context-menu/context-menu.component';
import { ModalComponent } from '@axe/shared/components/modal/modal.component';
import { UIPanelComponent } from '@axe/shared/components/ui-panel/ui-panel.component';
import { ContextMenuService } from '@axe/shared/ui/context-menu.service';
import { ModalService } from '@axe/shared/ui/modal.service';
import { PanelOption, PanelService } from '@axe/shared/ui/panel.service';
import { ThemeService } from '@axe/shared/ui/theme.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  imports: [GameTableComponent, NetworkIndicatorComponent, MiniJukeboxComponent],
})
export class AppComponent {
  readonly theme = inject(ThemeService);
  private readonly panelService = inject(PanelService);
  private readonly saveDataService = inject(SaveDataService);
  private readonly fileArchiver = inject(FileArchiver);
  private readonly objectStore = inject(ObjectStore);
  private readonly eventHandler = inject(AppEventHandlerService);

  readonly modalLayerViewContainerRef = viewChild.required('modalLayer', { read: ViewContainerRef });

  fabOpen = signal(false);
  isSaving = signal(false);
  progressPercent = signal(0);
  readonly themeLabel = computed(() => {
    const t = this.theme.theme();
    if (t === 'dark') return 'ダーク';
    if (t === 'light') return 'ライト';
    return '自動';
  });
  private openPanelCount = 0;

  constructor() {
    this.eventHandler.initialize();
    afterNextRender(() => {
      PanelService.defaultParentViewContainerRef =
        ModalService.defaultParentViewContainerRef =
        ContextMenuService.defaultParentViewContainerRef =
          this.modalLayerViewContainerRef();
      this.panelService.open(PeerMenuComponent, { title: '接続情報', width: 460, height: 360, left: 80, top: 10 });
      this.panelService.open(ChatWindowComponent, {
        title: 'チャットウィンドウ',
        width: 660,
        height: 370,
        left: 80,
        top: 390,
      });
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
      | 'CutInListComponent'
      | 'GameCharacterGeneratorComponent'
      | 'GameObjectInventoryComponent'
  ) {
    let component: { new (...args: unknown[]): unknown } | null = null;
    let option: PanelOption = { width: 450, height: 600, left: 100 };
    switch (componentName) {
      case 'PeerMenuComponent':
        component = PeerMenuComponent;
        option.title = '接続情報';
        break;
      case 'ChatWindowComponent':
        component = ChatWindowComponent;
        option.width = 700;
        option.title = 'チャットウィンドウ';
        break;
      case 'GameTableSettingComponent':
        component = GameTableSettingComponent;
        option = { width: 630, height: 500, left: 100, title: 'テーブル設定' };
        break;
      case 'FileStorageComponent':
        component = FileStorageComponent;
        option.title = 'ファイル一覧';
        break;
      case 'GameCharacterSheetComponent':
        component = GameCharacterSheetComponent;
        break;
      case 'JukeboxComponent':
        component = JukeboxComponent;
        option.title = 'ジュークボックス';
        break;
      case 'CutInListComponent':
        component = CutInListComponent;
        option = { width: 650, height: 740, left: 100, title: 'カットインリスト' };
        break;
      case 'GameCharacterGeneratorComponent':
        component = GameCharacterGeneratorComponent;
        option = { width: 500, height: 300, left: 100, title: 'キャラクタージェネレーター' };
        break;
      case 'GameObjectInventoryComponent':
        component = GameObjectInventoryComponent;
        option.title = 'インベントリ';
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
