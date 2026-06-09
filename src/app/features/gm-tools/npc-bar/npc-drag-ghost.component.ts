import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NpcDragService } from '@axe/features/gm-tools/npc-bar/npc-drag.service';
import { SafePipe } from '@axe/ui/pipes/safe.pipe';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-npc-drag-ghost',
  templateUrl: './npc-drag-ghost.component.html',
  imports: [SafePipe],
})
export class NpcDragGhostComponent {
  protected readonly drag = inject(NpcDragService);

  protected imageUrl(): string {
    return this.drag.character()?.imageFile?.url ?? '';
  }
}
