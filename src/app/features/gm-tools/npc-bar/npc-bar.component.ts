import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { PanelService } from '@axe/application/ui/panel.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { ChatPaletteRegistryService } from '@axe/features/chat/chat-palette/chat-palette-registry.service';
import { NpcBarService } from '@axe/features/gm-tools/npc-bar/npc-bar.service';
import { NpcDragService } from '@axe/features/gm-tools/npc-bar/npc-drag.service';
import { SafePipe } from '@axe/ui/pipes/safe.pipe';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-npc-bar',
  templateUrl: './npc-bar.component.html',
  host: { class: 'contents' },
  imports: [SafePipe, TranslocoModule],
})
export class NpcBarComponent {
  protected readonly barService = inject(NpcBarService);
  protected readonly drag = inject(NpcDragService);
  private readonly objectStore = inject(ObjectStore);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly panelService = inject(PanelService);
  private readonly registry = inject(ChatPaletteRegistryService);
  private readonly t = inject(TRANSLATE_FN);

  readonly npcs = computed<GameCharacter[]>(() => {
    this.objectChange.collectionOf(GameCharacter.aliasName)();
    const all = this.objectStore.getObjects<GameCharacter>(GameCharacter);
    for (const c of all) this.objectChange.versionOf(c.identifier)();
    return all.filter((c) => c.isNpc && c.location.name !== 'graveyard');
  });

  protected select(npc: GameCharacter): void {
    const active = this.registry.active();
    if (active) {
      active.setCharacterById(npc.identifier);
      return;
    }
    this.panelService.openLazy(
      () => import('@axe/features/chat/chat-palette/chat-palette.component').then((m) => m.ChatPaletteComponent),
      {
        title: this.t('feature.character.panel.chatPaletteWithName', { name: npc.name }),
        width: 760,
        height: 500,
        left: 120,
        top: 120,
      },
      (component) => component.character.set(npc)
    );
  }

  protected imageUrl(npc: GameCharacter): string {
    return npc.imageFile?.url ?? '';
  }

  protected unregister(npc: GameCharacter): void {
    npc.isNpc = false;
    npc.update();
  }
}
