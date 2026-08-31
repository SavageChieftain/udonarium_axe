import { inject, Injectable } from '@angular/core';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { PanelOption, PanelService } from '@axe/application/ui/panel.service';
import { panelLabelKey, RoomPanelName } from '@axe/domain/ui/room-panel';
import { BuffManagerPanelComponent } from '@axe/features/buff/buff-manager-panel/buff-manager-panel.component';
import { GameCharacterGeneratorComponent } from '@axe/features/character/game-character-generator/game-character-generator.component';
import { ImportCharacterComponent } from '@axe/features/character/import-character/import-character.component';
import { ChatWindowComponent } from '@axe/features/chat/chat-window/chat-window.component';
import { EffectLibraryPanelComponent } from '@axe/features/effect/effect-library-panel/effect-library-panel.component';
import { FileStorageComponent } from '@axe/features/file/file-storage/file-storage.component';
import { GameObjectListPanelComponent } from '@axe/features/gm-object-list/game-object-list-panel.component';
import { PartyListPanelComponent } from '@axe/features/gm-tools/party-list/party-list-panel.component';
import { GameObjectInventoryComponent } from '@axe/features/inventory/game-object-inventory/game-object-inventory.component';
import { PeerMenuComponent } from '@axe/features/lobby/peer-menu/peer-menu.component';
import { MapEditorPanelComponent } from '@axe/features/map-editor/editor/map-editor-panel.component';
import { CutInListComponent } from '@axe/features/media/cut-in-list/cut-in-list.component';
import { JukeboxComponent } from '@axe/features/media/jukebox/jukebox.component';
import { OwnedCharacterListPanelComponent } from '@axe/features/pl-tools/owned-character-list/owned-character-list-panel.component';
import { ReplayWorkspaceComponent } from '@axe/features/replay/replay-workspace/replay-workspace.component';
import { RoomSnapshotPanelComponent } from '@axe/features/room-archive/room-snapshot-panel/room-snapshot-panel.component';
import {
  STATUS_AILMENT_PANEL,
  StatusAilmentPanelComponent,
} from '@axe/features/status-ailment/status-ailment-panel/status-ailment-panel.component';
import { DungeonGeneratorComponent } from '@axe/features/tabletop/dungeon-generator/dungeon-generator.component';
import { GameTableSettingComponent } from '@axe/features/tabletop/game-table-setting/game-table-setting.component';

type PanelComponent = { new (...args: unknown[]): unknown };

interface RoomPanel {
  component: PanelComponent;
  option: PanelOption;
}

/**
 * The panels that belong to the room, and the size each one wants to open at.
 *
 * The menu, the toolbars and the hotbar all ask for panels by name, so what each one is
 * called and how big it opens is kept here rather than written out beside every button.
 */
@Injectable({ providedIn: 'root' })
export class RoomPanelService {
  private readonly panelService = inject(PanelService);
  private readonly t = inject(TRANSLATE_FN);
  private opened = 0;

  /** Opens one, stepped a little from the last so a new panel never lands squarely on it. */
  open(name: RoomPanelName, extra: PanelOption = {}): void {
    const panel = this.panelOf(name);
    const option: PanelOption = {
      title: this.t(panelLabelKey(name)),
      ...panel.option,
      top: ((this.opened % 10) + 1) * 20,
      left: 100 + ((this.opened % 20) + 1) * 5,
      ...extra,
    };
    this.opened += 1;
    this.panelService.open(panel.component, option);
  }

  private panelOf(name: RoomPanelName): RoomPanel {
    switch (name) {
      case 'chatWindow':
        return { component: ChatWindowComponent, option: { width: 700, height: 500, minWidth: 300, minHeight: 460 } };
      case 'peerMenu':
        return { component: PeerMenuComponent, option: { width: 420, height: 300 } };
      case 'tableSetting':
        return { component: GameTableSettingComponent, option: { width: 630, height: 500 } };
      case 'inventory':
        return {
          component: GameObjectInventoryComponent,
          option: { width: 450, height: 600, minimizeToContent: true },
        };
      case 'objectList':
        return { component: GameObjectListPanelComponent, option: { width: 460, height: 620 } };
      case 'fileStorage':
        return { component: FileStorageComponent, option: { width: 450, height: 600 } };
      case 'jukebox':
        return { component: JukeboxComponent, option: { width: 450, height: 600 } };
      case 'cutInList':
        // The scene tab wants room for a stage, a layer list and a properties column.
        return { component: CutInListComponent, option: { width: 980, height: 760 } };
      case 'characterGenerator':
        return { component: GameCharacterGeneratorComponent, option: { width: 500, height: 300 } };
      case 'characterImport':
        return { component: ImportCharacterComponent, option: { width: 480, height: 460 } };
      case 'ownedCharacters':
        return { component: OwnedCharacterListPanelComponent, option: { width: 420, height: 560 } };
      case 'partyList':
        return { component: PartyListPanelComponent, option: { width: 460, height: 620 } };
      case 'buffManager':
        return { component: BuffManagerPanelComponent, option: { width: 560, height: 420 } };
      case 'statusAilment':
        return {
          component: StatusAilmentPanelComponent,
          option: { width: 380, height: 460, single: STATUS_AILMENT_PANEL },
        };
      case 'effectLibrary':
        return { component: EffectLibraryPanelComponent, option: { width: 360, height: 480 } };
      case 'mapEditor':
        return { component: MapEditorPanelComponent, option: { width: 1100, height: 740 } };
      case 'dungeonGenerator':
        return {
          component: DungeonGeneratorComponent,
          option: { width: 460, height: 660, minWidth: 400, minHeight: 520 },
        };
      case 'roomSnapshot':
        return { component: RoomSnapshotPanelComponent, option: { width: 460, height: 460 } };
      case 'replay':
        return {
          component: ReplayWorkspaceComponent,
          option: { width: 900, height: 640, minWidth: 600, minHeight: 420 },
        };
    }
  }
}
