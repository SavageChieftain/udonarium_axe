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
import { Title } from '@angular/platform-browser';
import { SaveDataService } from '@axe/application/file/save-data.service';
import { LanguageService } from '@axe/application/i18n/language.service';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { CutInService } from '@axe/application/media/cut-in.service';
import { RolePermissionService } from '@axe/application/permission/role-permission.service';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { GravityService } from '@axe/application/tabletop/gravity.service';
import { TurnOrderService } from '@axe/application/turn/turn-order.service';
import { ContextMenuService } from '@axe/application/ui/context-menu.service';
import { ModalService } from '@axe/application/ui/modal.service';
import { PanelOption, PanelService } from '@axe/application/ui/panel.service';
import { ThemeService } from '@axe/application/ui/theme.service';
import { Network } from '@axe/core/network/network';
import { FileArchiver } from '@axe/core/storage/file-archiver';
import { ObjectStore } from '@axe/core/sync/object-store';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { ReloadCheck } from '@axe/domain/peer/reload-check';
import { AlarmEventHandlerService } from '@axe/features/alarm/alarm-event-handler.service';
import { CardStackListImageComponent } from '@axe/features/card/card-stack-list-img/card-stack-list-img.component';
import { GameCharacterGeneratorComponent } from '@axe/features/character/game-character-generator/game-character-generator.component';
import { GameCharacterSheetComponent } from '@axe/features/character/game-character-sheet/game-character-sheet.component';
import { ChatPortraitImageComponent } from '@axe/features/chat/chat-portrait-img/chat-portrait-img.component';
import { ChatWindowComponent } from '@axe/features/chat/chat-window/chat-window.component';
import { FileStorageComponent } from '@axe/features/file/file-storage/file-storage.component';
import { GameObjectListPanelComponent } from '@axe/features/gm-object-list/game-object-list-panel.component';
import { GmToolbarComponent } from '@axe/features/gm-tools/gm-toolbar/gm-toolbar.component';
import { NpcDragGhostComponent } from '@axe/features/gm-tools/npc-bar/npc-drag-ghost.component';
import { GameObjectInventoryComponent } from '@axe/features/inventory/game-object-inventory/game-object-inventory.component';
import { OverviewPanelComponent } from '@axe/features/inventory/overview-panel/overview-panel.component';
import { LanguageSelectorComponent } from '@axe/features/language-selector/language-selector.component';
import { NetworkEventHandlerService } from '@axe/features/lobby/network-event-handler.service';
import { NetworkIndicatorComponent } from '@axe/features/lobby/network-indicator/network-indicator.component';
import { PeerMenuComponent } from '@axe/features/lobby/peer-menu/peer-menu.component';
import { CutInEventHandlerService } from '@axe/features/media/cut-in-event-handler.service';
import { CutInListComponent } from '@axe/features/media/cut-in-list/cut-in-list.component';
import { JukeboxComponent } from '@axe/features/media/jukebox/jukebox.component';
import { MiniJukeboxComponent } from '@axe/features/media/mini-jukebox/mini-jukebox.component';
import { GameTableComponent } from '@axe/features/tabletop/game-table/game-table.component';
import { GameTableSettingComponent } from '@axe/features/tabletop/game-table-setting/game-table-setting.component';
import { VisualNovelModeService } from '@axe/features/visual-novel/visual-novel-mode.service';
import { VisualNovelOverlayComponent } from '@axe/features/visual-novel/visual-novel-overlay/visual-novel-overlay.component';
import { VoteEventHandlerService } from '@axe/features/vote/vote-event-handler.service';
import { ContextMenuComponent } from '@axe/ui/components/context-menu/context-menu.component';
import { ModalComponent } from '@axe/ui/components/modal/modal.component';
import { UIPanelComponent } from '@axe/ui/components/ui-panel/ui-panel.component';
import { TooltipDirective } from '@axe/ui/directives/tooltip.directive';
import { TranslocoModule } from '@jsverse/transloco';
import { version as APP_VERSION } from '@pkg';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  templateUrl: './app.component.html',
  imports: [
    GameTableComponent,
    NetworkIndicatorComponent,
    MiniJukeboxComponent,
    GmToolbarComponent,
    NpcDragGhostComponent,
    LanguageSelectorComponent,
    VisualNovelOverlayComponent,
    TranslocoModule,
  ],
})
export class AppComponent {
  readonly theme = inject(ThemeService);
  readonly language = inject(LanguageService);
  readonly visualNovel = inject(VisualNovelModeService);
  private readonly t = inject(TRANSLATE_FN);
  private readonly panelService = inject(PanelService);
  private readonly saveDataService = inject(SaveDataService);
  private readonly fileArchiver = inject(FileArchiver);
  private readonly rolePermission = inject(RolePermissionService);
  private readonly objectStore = inject(ObjectStore);
  private readonly objectChange = inject(ObjectChangeService);

  readonly modalLayerViewContainerRef = viewChild.required('modalLayer', { read: ViewContainerRef });

  readonly isMyselfGameMaster = computed(() => {
    if (PeerCursor.myCursor) this.objectChange.versionOf(PeerCursor.myCursor.identifier)();
    return PeerCursor.isMyselfGameMaster;
  });

  fabOpen = signal(true);
  isSaving = signal(false);
  progressPercent = signal(0);
  readonly themeLabel = computed(() => {
    this.language.currentLang();
    const t = this.theme.theme();
    if (t === 'dark') return this.t('common.theme.dark');
    if (t === 'light') return this.t('common.theme.light');
    return this.t('common.theme.auto');
  });
  private openPanelCount = 0;

  constructor() {
    inject(Title).setTitle(`Udonarium Axe ${APP_VERSION}`);

    // 各 feature のイベントハンドラ / application 層 orchestration サービス群を eager 起動する。
    // 各サービスは @Injectable({ providedIn: 'root' }) で自身の constructor 内で購読を開始するため、
    // ここでは inject() の戻り値を保持する必要はない（副作用のみ目的）。
    inject(AlarmEventHandlerService);
    inject(VoteEventHandlerService);
    inject(CutInEventHandlerService);
    inject(NetworkEventHandlerService);
    inject(CutInService);
    inject(GravityService);
    inject(TurnOrderService);

    afterNextRender(() => {
      PanelService.defaultParentViewContainerRef =
        ModalService.defaultParentViewContainerRef =
        ContextMenuService.defaultParentViewContainerRef =
          this.modalLayerViewContainerRef();
      this.panelService.open(PeerMenuComponent, {
        title: this.t('common.panel.peerMenu'),
        width: 420,
        height: 300,
        left: 80,
        top: 10,
      });
      const chatHeight = 460;
      this.panelService.open(ChatWindowComponent, {
        title: this.t('common.panel.chatWindow'),
        width: 660,
        height: chatHeight,
        minWidth: 300,
        minHeight: 460,
        left: 80,
        top: Math.max(10, window.innerHeight - chatHeight - 20),
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
      | 'GameObjectListPanelComponent'
  ) {
    let component: { new (...args: unknown[]): unknown } | null = null;
    let option: PanelOption = { width: 450, height: 600, left: 100 };
    switch (componentName) {
      case 'PeerMenuComponent':
        component = PeerMenuComponent;
        option = { width: 420, height: 300, left: 100, title: this.t('common.panel.peerMenu') };
        break;
      case 'ChatWindowComponent':
        component = ChatWindowComponent;
        option.width = 700;
        option.height = 500;
        option.minWidth = 300;
        option.minHeight = 460;
        option.title = this.t('common.panel.chatWindow');
        break;
      case 'GameTableSettingComponent':
        component = GameTableSettingComponent;
        option = { width: 630, height: 500, left: 100, title: this.t('common.panel.gameTableSetting') };
        break;
      case 'FileStorageComponent':
        component = FileStorageComponent;
        option.title = this.t('common.panel.fileStorage');
        break;
      case 'GameCharacterSheetComponent':
        component = GameCharacterSheetComponent;
        break;
      case 'JukeboxComponent':
        component = JukeboxComponent;
        option.title = this.t('common.panel.jukebox');
        break;
      case 'CutInListComponent':
        component = CutInListComponent;
        option = { width: 650, height: 740, left: 100, title: this.t('common.panel.cutInList') };
        break;
      case 'GameCharacterGeneratorComponent':
        component = GameCharacterGeneratorComponent;
        option = { width: 500, height: 300, left: 100, title: this.t('common.panel.characterGenerator') };
        break;
      case 'GameObjectInventoryComponent':
        component = GameObjectInventoryComponent;
        option.title = this.t('common.panel.inventory');
        option.minimizeToContent = true;
        break;
      case 'GameObjectListPanelComponent':
        component = GameObjectListPanelComponent;
        option = { width: 460, height: 620, left: 100, title: this.t('common.panel.objectList') };
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
      Network.peerContext && Network.peerContext.roomName.length > 0
        ? Network.peerContext.roomName
        : this.t('app.roomDataDefault');
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
    if (!this.rolePermission.canEditTabletop) {
      input.value = '';
      return;
    }
    const files = input.files;
    const reloadCheck = this.objectStore.get<ReloadCheck>('ReloadCheck');
    reloadCheck?.reloadCheckStart(Network.peerContext.roomName != '');
    if (files && files.length) this.fileArchiver.load(files);
    input.value = '';
  }
}

PanelService.UIPanelComponentClass = UIPanelComponent;
PanelService.chatPortraitComponentClass = ChatPortraitImageComponent;
PanelService.cardStackListComponentClass = CardStackListImageComponent;
ContextMenuService.ContextMenuComponentClass = ContextMenuComponent;
ModalService.ModalComponentClass = ModalComponent;
TooltipDirective.TooltipPanelComponentClass = OverviewPanelComponent;
