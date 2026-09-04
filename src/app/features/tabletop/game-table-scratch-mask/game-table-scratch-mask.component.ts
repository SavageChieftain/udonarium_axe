import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { CoordinateService } from '@axe/application/input/coordinate.service';
import { PointerDeviceService } from '@axe/application/input/pointer-device.service';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { TabletopService } from '@axe/application/tabletop/tabletop.service';
import { TabletopActionService } from '@axe/application/tabletop/tabletop-action.service';
import { ContextMenuService } from '@axe/application/ui/context-menu.service';
import { sheetPanelTitle } from '@axe/application/ui/sheet-panel';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { GameTableScratchMask } from '@axe/domain/tabletop/game-table-scratch-mask';
import { ObjectPanelService } from '@axe/features/panels/object-panel.service';
import { buildScratchMaskContextMenu } from '@axe/features/tabletop/game-table-scratch-mask/game-table-scratch-mask-context-menu';
import { MovableOption } from '@axe/ui/directives/movable.directive';
import { MovableDirective } from '@axe/ui/directives/movable.directive';
import { setupMovableForPiece } from '@axe/ui/tabletop/setup-tabletop-piece';

@Component({
  selector: 'game-table-scratch-mask',
  templateUrl: './game-table-scratch-mask.component.html',
  host: { class: 'block absolute' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MovableDirective],
})
export class GameTableScratchMaskComponent {
  private readonly contextMenuService = inject(ContextMenuService);
  private readonly objectPanels = inject(ObjectPanelService);
  private readonly pointerDeviceService = inject(PointerDeviceService);
  private readonly coordinateService = inject(CoordinateService);
  private readonly tabletopActionService = inject(TabletopActionService);
  private readonly tabletopService = inject(TabletopService);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly translateFn = inject(TRANSLATE_FN);

  readonly gameTableScratchMask = input<GameTableScratchMask | null>(null);

  get gridSize(): number {
    return this.tabletopService.gridSize();
  }
  readonly movableOption = signal<MovableOption>({});

  constructor() {
    setupMovableForPiece(this, {
      target: this.gameTableScratchMask,
      collideLayers: ['terrain'],
    });
  }

  readonly name = computed(() => {
    const mask = this.gameTableScratchMask();
    if (!mask) return '';
    this.objectChange.versionOf(mask.identifier)();
    return mask.name;
  });
  get width(): number {
    const mask = this.gameTableScratchMask();
    return mask ? Math.max(1, mask.width) : 1;
  }
  get height(): number {
    const mask = this.gameTableScratchMask();
    return mask ? Math.max(1, mask.height) : 1;
  }
  get isLock(): boolean {
    return this.gameTableScratchMask()?.isLock ?? false;
  }
  get color(): string {
    return this.gameTableScratchMask()?.color ?? '';
  }
  get isMine(): boolean {
    return this.gameTableScratchMask()?.isMine ?? false;
  }

  get posX(): number {
    return this.gameTableScratchMask()?.location.x ?? 0;
  }
  get posY(): number {
    return this.gameTableScratchMask()?.location.y ?? 0;
  }
  get posZ(): number {
    return this.gameTableScratchMask()?.posZ ?? 0;
  }

  onMove() {}
  onMoved() {}

  onContextMenu(event: Event) {
    event.stopPropagation();
    event.preventDefault();
    if (!this.pointerDeviceService.isAllowedToOpenContextMenu) return;
    const mask = this.gameTableScratchMask();
    if (!mask) return;
    const coordinate = this.pointerDeviceService.pointers[0];
    const actions = buildScratchMaskContextMenu(
      mask,
      this.isLock,
      {
        lock: () => this.lock(),
        unlock: () => this.unlock(),
      },
      this.translateFn
    );
    this.contextMenuService.open(coordinate, actions, this.name());
  }

  lock() {
    const mask = this.gameTableScratchMask();
    if (mask) mask.isLock = true;
    SoundEffect.play(PresetSound.lock);
  }

  unlock() {
    const mask = this.gameTableScratchMask();
    if (mask) mask.isLock = false;
    SoundEffect.play(PresetSound.unlock);
  }

  openSheet(e: Event) {
    e.stopPropagation();
    const mask = this.gameTableScratchMask();
    if (!mask) return;
    const title = sheetPanelTitle(this.translateFn('feature.tabletop.panel.scratchMask'), this.name());
    this.objectPanels.openSheet(mask, title, { width: 400, height: 300 });
  }
}
