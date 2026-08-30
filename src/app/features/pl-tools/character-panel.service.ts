import { inject, Injectable } from '@angular/core';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { PanelOption, PanelService } from '@axe/application/ui/panel.service';
import { SelectionSignalService } from '@axe/application/ui/selection-signal.service';
import { PointerDeviceService } from '@axe/core/input/pointer-device.service';
import { GameCharacter } from '@axe/domain/character/game-character';

@Injectable({ providedIn: 'root' })
export class CharacterPanelService {
  private readonly panelService = inject(PanelService);
  private readonly selectionSignalService = inject(SelectionSignalService);
  private readonly pointerDeviceService = inject(PointerDeviceService);
  private readonly t = inject(TRANSLATE_FN);

  openChatPalette(character: GameCharacter, single?: string): void {
    this.panelService.openLazy(
      () => import('@axe/features/chat/chat-palette/chat-palette.component').then((m) => m.ChatPaletteComponent),
      this.option(
        this.t('feature.character.panel.chatPaletteWithName', { name: character.name }),
        760,
        500,
        320,
        250,
        single
      ),
      (component) => component.character.set(character)
    );
  }

  openSheet(character: GameCharacter, single?: string): void {
    this.selectionSignalService.selectObject(character.identifier, character.aliasName);
    const title = character.name.length
      ? this.t('feature.character.panel.sheetWithName', { name: character.name })
      : this.t('feature.character.panel.sheet');
    this.panelService.openLazy(
      () =>
        import('@axe/features/character/game-character-sheet/game-character-sheet.component').then(
          (m) => m.GameCharacterSheetComponent
        ),
      this.option(title, 800, 600, 800, 300, single),
      (component) => (component.tabletopObject = character)
    );
  }

  openRemoteController(character: GameCharacter, single?: string): void {
    this.panelService.openLazy(
      () =>
        import('@axe/features/controller/remote-controller/remote-controller.component').then(
          (m) => m.RemoteControllerComponent
        ),
      this.option(
        this.t('feature.character.panel.remoteControllerWithName', { name: character.name }),
        700,
        600,
        250,
        175,
        single
      ),
      (component) => component.character.set(character)
    );
  }

  private option(
    title: string,
    width: number,
    height: number,
    offsetX: number,
    offsetY: number,
    single?: string
  ): PanelOption {
    const coordinate = this.pointerDeviceService.pointers[0];
    return { title, width, height, left: coordinate.x - offsetX, top: coordinate.y - offsetY, single };
  }
}
