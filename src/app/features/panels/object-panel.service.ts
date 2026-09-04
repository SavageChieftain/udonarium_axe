import { inject, Injectable } from '@angular/core';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { PointerDeviceService } from '@axe/application/input/pointer-device.service';
import { PanelOption, PanelService } from '@axe/application/ui/panel.service';
import { SelectionSignalService } from '@axe/application/ui/selection-signal.service';
import { GameCharacter } from '@axe/domain/character/game-character';
import { CharacterSheetTarget } from '@axe/domain/tabletop/character-sheet-target';

export interface ObjectPanelSize {
  width: number;
  height: number;
}

export interface ObjectPanelPlace {
  at?: { x: number; y: number };
  offset?: { x: number; y: number };
  single?: string;
}

const CHARACTER_SHEET_SIZE: ObjectPanelSize = { width: 800, height: 600 };
const CHARACTER_SHEET_OFFSET = { x: 800, y: 300 };
const CHAT_PALETTE_SIZE: ObjectPanelSize = { width: 760, height: 500 };
const REMOTE_CONTROLLER_SIZE: ObjectPanelSize = { width: 700, height: 600 };
const REMOTE_CONTROLLER_OFFSET = { x: 250, y: 175 };

@Injectable({ providedIn: 'root' })
export class ObjectPanelService {
  private readonly panelService = inject(PanelService);
  private readonly selectionSignalService = inject(SelectionSignalService);
  private readonly pointerDeviceService = inject(PointerDeviceService);
  private readonly t = inject(TRANSLATE_FN);

  openSheet(object: CharacterSheetTarget, title: string, size: ObjectPanelSize, place: ObjectPanelPlace = {}): void {
    this.selectionSignalService.selectObject(object.identifier, object.aliasName);
    this.panelService.openLazy(
      () =>
        import('@axe/features/character/game-character-sheet/game-character-sheet.component').then(
          (m) => m.GameCharacterSheetComponent
        ),
      this.option(title, size, place),
      (component) => (component.tabletopObject = object)
    );
  }

  openCharacterSheet(character: GameCharacter, place: ObjectPanelPlace = {}): void {
    const title = character.name.length
      ? this.t('feature.character.panel.sheetWithName', { name: character.name })
      : this.t('feature.character.panel.sheet');
    this.openSheet(character, title, CHARACTER_SHEET_SIZE, { offset: CHARACTER_SHEET_OFFSET, ...place });
  }

  openChatPalette(character: GameCharacter, place: ObjectPanelPlace = {}): void {
    this.panelService.openLazy(
      () => import('@axe/features/chat/chat-palette/chat-palette.component').then((m) => m.ChatPaletteComponent),
      this.option(
        this.t('feature.character.panel.chatPaletteWithName', { name: character.name }),
        CHAT_PALETTE_SIZE,
        place
      ),
      (component) => component.character.set(character)
    );
  }

  openRemoteController(character: GameCharacter, place: ObjectPanelPlace = {}): void {
    this.panelService.openLazy(
      () =>
        import('@axe/features/controller/remote-controller/remote-controller.component').then(
          (m) => m.RemoteControllerComponent
        ),
      this.option(
        this.t('feature.character.panel.remoteControllerWithName', { name: character.name }),
        REMOTE_CONTROLLER_SIZE,
        { offset: REMOTE_CONTROLLER_OFFSET, ...place }
      ),
      (component) => component.character.set(character)
    );
  }

  private option(title: string, size: ObjectPanelSize, place: ObjectPanelPlace): PanelOption {
    const at = place.at ?? this.pointerDeviceService.pointers[0];
    const offset = place.offset ?? { x: size.width / 2, y: size.height / 2 };
    const option: PanelOption = {
      title,
      width: size.width,
      height: size.height,
      left: at.x - offset.x,
      top: at.y - offset.y,
    };
    if (place.single) option.single = place.single;
    return option;
  }
}
