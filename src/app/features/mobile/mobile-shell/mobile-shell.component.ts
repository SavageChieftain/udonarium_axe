import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { SaveDataService } from '@axe/application/file/save-data.service';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { MobileLayoutService } from '@axe/application/ui/mobile-layout.service';
import { PanelOption, PanelService } from '@axe/application/ui/panel.service';
import { Network } from '@axe/core/network/network';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { HandRailService } from '@axe/features/card/hand-rail/hand-rail.service';
import { ImportCharacterComponent } from '@axe/features/character/import-character/import-character.component';
import { FileStorageComponent } from '@axe/features/file/file-storage/file-storage.component';
import { GameObjectListPanelComponent } from '@axe/features/gm-object-list/game-object-list-panel.component';
import { PartyListPanelComponent } from '@axe/features/gm-tools/party-list/party-list-panel.component';
import { GameObjectInventoryComponent } from '@axe/features/inventory/game-object-inventory/game-object-inventory.component';
import { PeerMenuComponent } from '@axe/features/lobby/peer-menu/peer-menu.component';
import { MapEditorPanelComponent } from '@axe/features/map-editor/editor/map-editor-panel.component';
import { CutInListComponent } from '@axe/features/media/cut-in-list/cut-in-list.component';
import { JukeboxComponent } from '@axe/features/media/jukebox/jukebox.component';
import { MobileChatPaneComponent } from '@axe/features/mobile/mobile-chat-pane/mobile-chat-pane.component';
import {
  type MobileMenuAction,
  type MobileMenuItem,
  visibleMobileMenuItems,
} from '@axe/features/mobile/mobile-shell/mobile-menu-items';
import { OwnedCharacterListPanelComponent } from '@axe/features/pl-tools/owned-character-list/owned-character-list-panel.component';
import { RoomSnapshotPanelComponent } from '@axe/features/room-archive/room-snapshot-panel/room-snapshot-panel.component';
import { GameTableSettingComponent } from '@axe/features/tabletop/game-table-setting/game-table-setting.component';
import { VisualNovelModeService } from '@axe/features/visual-novel/visual-novel-mode.service';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-mobile-shell',
  templateUrl: './mobile-shell.component.html',
  imports: [MobileChatPaneComponent, TranslocoModule],
})
export class MobileShellComponent {
  private readonly panelService = inject(PanelService);
  private readonly saveDataService = inject(SaveDataService);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly visualNovel = inject(VisualNovelModeService);
  private readonly handRail = inject(HandRailService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly layout = inject(MobileLayoutService);
  protected readonly t = inject(TRANSLATE_FN);

  protected readonly isMenuOpen = signal(false);

  protected readonly isGameMaster = computed(() => {
    if (PeerCursor.myCursor) this.objectChange.versionOf(PeerCursor.myCursor.identifier)();
    return PeerCursor.isMyselfGameMaster;
  });

  protected readonly menuItems = computed<MobileMenuItem[]>(() => visibleMobileMenuItems(this.isGameMaster()));

  private isResizing = false;

  protected toggleMenu(): void {
    this.isMenuOpen.update((open) => !open);
  }

  protected openCharacterList(): void {
    this.isMenuOpen.set(false);
    this.panelService.open(OwnedCharacterListPanelComponent, {
      title: this.t('app.fab.ownedCharacters'),
      width: 420,
      height: 560,
    });
  }

  protected runMenuAction(action: MobileMenuAction): void {
    this.isMenuOpen.set(false);
    if (action === 'save') {
      void this.saveRoom();
      return;
    }
    if (action === 'visualNovel') {
      this.visualNovel.toggle();
      return;
    }
    if (action === 'hand') {
      this.handRail.toggle();
      return;
    }
    const opened = this.resolvePanel(action);
    if (opened) this.panelService.open(opened.component, opened.option);
  }

  protected useDesktopLayout(): void {
    this.isMenuOpen.set(false);
    this.layout.useDesktopLayout();
  }

  protected startResize(event: PointerEvent): void {
    if (this.isResizing) return;
    this.isResizing = true;
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
    event.preventDefault();

    const onMove = (moveEvent: PointerEvent) => {
      if (!this.isResizing) return;
      this.layout.setTableRatio(moveEvent.clientY / window.innerHeight);
    };
    const onUp = () => {
      this.isResizing = false;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    this.destroyRef.onDestroy(onUp);
  }

  private async saveRoom(): Promise<void> {
    const roomName =
      Network.peerContext && Network.peerContext.roomName.length > 0
        ? Network.peerContext.roomName
        : this.t('app.roomDataDefault');
    await this.saveDataService.saveRoomAsync(roomName);
  }

  private resolvePanel(
    action: MobileMenuAction
  ): { component: { new (...args: unknown[]): unknown }; option: PanelOption } | null {
    switch (action) {
      case 'peerMenu':
        return { component: PeerMenuComponent, option: { title: this.t('common.panel.peerMenu') } };
      case 'tableSetting':
        return { component: GameTableSettingComponent, option: { title: this.t('common.panel.gameTableSetting') } };
      case 'images':
        return { component: FileStorageComponent, option: { title: this.t('common.panel.fileStorage') } };
      case 'jukebox':
        return { component: JukeboxComponent, option: { title: this.t('common.panel.jukebox') } };
      case 'cutIn':
        return { component: CutInListComponent, option: { title: this.t('common.panel.cutInList') } };
      case 'inventory':
        return { component: GameObjectInventoryComponent, option: { title: this.t('common.panel.inventory') } };
      case 'objectList':
        return { component: GameObjectListPanelComponent, option: { title: this.t('common.panel.objectList') } };
      case 'party':
        return { component: PartyListPanelComponent, option: { title: this.t('feature.gmTools.party.title') } };
      case 'mapEditor':
        return { component: MapEditorPanelComponent, option: { title: this.t('feature.mapEditor.title') } };
      case 'importCharacter':
        return { component: ImportCharacterComponent, option: { title: this.t('common.panel.characterImport') } };
      case 'roomSnapshot':
        return { component: RoomSnapshotPanelComponent, option: { title: this.t('common.panel.roomSnapshot') } };
      default:
        return null;
    }
  }
}
