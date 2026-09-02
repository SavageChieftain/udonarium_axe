import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { SaveDataService } from '@axe/application/file/save-data.service';
import { LanguageService } from '@axe/application/i18n/language.service';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { RolePermissionService } from '@axe/application/permission/role-permission.service';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { TabletopService } from '@axe/application/tabletop/tabletop.service';
import { TurnOrderService } from '@axe/application/turn/turn-order.service';
import { KeyboardInsetService } from '@axe/application/ui/keyboard-inset.service';
import { MobileLayoutService } from '@axe/application/ui/mobile-layout.service';
import { MotionService } from '@axe/application/ui/motion.service';
import { PanelOption, PanelService } from '@axe/application/ui/panel.service';
import { SelectionSignalService } from '@axe/application/ui/selection-signal.service';
import { ThemeService } from '@axe/application/ui/theme.service';
import { Network } from '@axe/core/network/network';
import { FileArchiver } from '@axe/core/storage/file-archiver';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { ReloadCheck } from '@axe/domain/peer/reload-check';
import { HandRailService } from '@axe/features/card/hand-rail/hand-rail.service';
import { GameCharacterGeneratorComponent } from '@axe/features/character/game-character-generator/game-character-generator.component';
import { ImportCharacterComponent } from '@axe/features/character/import-character/import-character.component';
import { EffectLibraryPanelComponent } from '@axe/features/effect/effect-library-panel/effect-library-panel.component';
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
  gameMasterMobileMenuItems,
  type MobileMenuAction,
  type MobileMenuItem,
  sharedMobileMenuItems,
} from '@axe/features/mobile/mobile-shell/mobile-menu-items';
import { ActiveCharacterService } from '@axe/features/pl-tools/active-character.service';
import { CharacterPanelService } from '@axe/features/pl-tools/character-panel.service';
import { OwnedCharacterListPanelComponent } from '@axe/features/pl-tools/owned-character-list/owned-character-list-panel.component';
import { isOwnedByUser } from '@axe/features/pl-tools/owned-character-list/owned-characters';
import { ReplayWorkspaceComponent } from '@axe/features/replay/replay-workspace/replay-workspace.component';
import { RoomSnapshotPanelComponent } from '@axe/features/room-archive/room-snapshot-panel/room-snapshot-panel.component';
import { DungeonGeneratorComponent } from '@axe/features/tabletop/dungeon-generator/dungeon-generator.component';
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
  private readonly turnOrder = inject(TurnOrderService);
  private readonly tabletopService = inject(TabletopService);
  private readonly activeCharacter = inject(ActiveCharacterService);
  private readonly characterPanel = inject(CharacterPanelService);
  private readonly objectStore = inject(ObjectStore);
  private readonly fileArchiver = inject(FileArchiver);
  private readonly rolePermission = inject(RolePermissionService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly theme = inject(ThemeService);
  protected readonly motion = inject(MotionService);
  protected readonly language = inject(LanguageService);
  protected readonly layout = inject(MobileLayoutService);
  protected readonly keyboardInset = inject(KeyboardInsetService).inset;
  private readonly selectionSignal = inject(SelectionSignalService);
  protected readonly selectionCount = this.selectionSignal.selectionSize;
  protected readonly t = inject(TRANSLATE_FN);

  protected readonly isMenuOpen = signal(false);

  protected readonly isGameMaster = computed(() => {
    this.objectChange.trackMyCursor();
    return PeerCursor.isMyselfGameMaster;
  });

  protected readonly paneTop = computed(() => {
    const ratio = this.layout.tableRatio() * 100;
    const inset = this.keyboardInset();
    return inset > 0 ? `max(0px, calc(${ratio}% - ${inset}px))` : `${ratio}%`;
  });

  protected readonly themeLabel = computed(() => {
    this.language.currentLang();
    const theme = this.theme.theme();
    if (theme === 'dark') return this.t('common.theme.dark');
    if (theme === 'light') return this.t('common.theme.light');
    return this.t('common.theme.auto');
  });

  protected readonly motionLabel = computed(() => {
    this.language.currentLang();
    const setting = this.motion.setting();
    if (setting === 'on') return this.t('common.motion.on');
    if (setting === 'off') return this.t('common.motion.off');
    return this.t('common.motion.auto');
  });

  protected readonly sharedItems: MobileMenuItem[] = sharedMobileMenuItems();
  protected readonly gameMasterItems: MobileMenuItem[] = gameMasterMobileMenuItems();
  protected readonly showGameMasterItems = computed(() => this.isGameMaster());

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
    if (action === 'darkness') {
      this.toggleDarkness();
      return;
    }
    if (action === 'turnPrev') {
      this.turnOrder.prev();
      return;
    }
    if (action === 'turnNext') {
      this.turnOrder.next();
      return;
    }
    if (action === 'activePalette') {
      this.openActivePalette();
      return;
    }
    const opened = this.resolvePanel(action);
    if (opened) this.panelService.open(opened.component, opened.option);
  }

  protected loadRoomFiles(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.isMenuOpen.set(false);
    if (!this.rolePermission.canEditTabletop) {
      input.value = '';
      return;
    }
    const files = input.files;
    const reloadCheck = this.objectStore.get<ReloadCheck>('ReloadCheck');
    reloadCheck?.reloadCheckStart(Network.peerContext.roomName !== '');
    if (files && files.length) this.fileArchiver.load(files);
    input.value = '';
  }

  protected clearSelection(): void {
    this.selectionSignal.clearSelection();
  }

  protected cycleTheme(): void {
    this.theme.cycle();
  }

  protected toggleLanguage(): void {
    this.language.toggle();
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

  private toggleDarkness(): void {
    const table = this.tabletopService.currentTable;
    table.darknessEnabled = !table.darknessEnabled;
    table.update();
    this.objectChange.notifyChanged(table.identifier);
  }

  private openActivePalette(): void {
    const identifier = this.activeCharacter.identifier();
    const character = identifier ? this.objectStore.get(identifier) : null;
    if (character instanceof GameCharacter && isOwnedByUser(character, PeerCursor.myCursor?.userId ?? '')) {
      this.characterPanel.openChatPalette(character);
      return;
    }
    this.openCharacterList();
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
      case 'effect':
        return { component: EffectLibraryPanelComponent, option: { title: this.t('feature.effect.panelTitle') } };
      case 'inventory':
        return { component: GameObjectInventoryComponent, option: { title: this.t('common.panel.inventory') } };
      case 'objectList':
        return { component: GameObjectListPanelComponent, option: { title: this.t('common.panel.objectList') } };
      case 'party':
        return { component: PartyListPanelComponent, option: { title: this.t('feature.gmTools.party.title') } };
      case 'mapEditor':
        return { component: MapEditorPanelComponent, option: { title: this.t('feature.mapEditor.title') } };
      case 'dungeonGenerator':
        return {
          component: DungeonGeneratorComponent,
          option: { title: this.t('feature.tabletop.dungeonGenerator.title') },
        };
      case 'createObject':
        return {
          component: GameCharacterGeneratorComponent,
          option: { title: this.t('common.panel.characterGenerator') },
        };
      case 'importCharacter':
        return { component: ImportCharacterComponent, option: { title: this.t('common.panel.characterImport') } };
      case 'roomSnapshot':
        return { component: RoomSnapshotPanelComponent, option: { title: this.t('common.panel.roomSnapshot') } };
      case 'replay':
        return { component: ReplayWorkspaceComponent, option: { title: this.t('common.panel.replay') } };
      default:
        return null;
    }
  }
}
