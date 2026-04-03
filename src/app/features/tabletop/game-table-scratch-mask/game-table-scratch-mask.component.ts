import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { CoordinateService } from '@axe/core/input/coordinate.service';
import { PointerDeviceService } from '@axe/core/input/pointer-device.service';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { GameTableScratchMask } from '@axe/domain/tabletop/game-table-scratch-mask';
import { GameCharacterSheetComponent } from '@axe/features/character/game-character-sheet/game-character-sheet.component';
import { TabletopActionService } from '@axe/features/tabletop/tabletop-action.service';
import { MovableOption } from '@axe/shared/directives/movable.directive';
import { MovableDirective } from '@axe/shared/directives/movable.directive';
import { ObjectChangeService } from '@axe/shared/sync/object-change.service';
import { ContextMenuAction, ContextMenuSeparator, ContextMenuService } from '@axe/shared/ui/context-menu.service';
import { PanelOption, PanelService } from '@axe/shared/ui/panel.service';

@Component({
  selector: 'game-table-scratch-mask',
  templateUrl: './game-table-scratch-mask.component.html',
  styleUrls: ['./game-table-scratch-mask.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MovableDirective],
})
export class GameTableScratchMaskComponent {
  private readonly contextMenuService = inject(ContextMenuService);
  private readonly panelService = inject(PanelService);
  private readonly pointerDeviceService = inject(PointerDeviceService);
  private readonly coordinateService = inject(CoordinateService);
  private readonly tabletopActionService = inject(TabletopActionService);
  private readonly objectChange = inject(ObjectChangeService);

  readonly gameTableScratchMask = input<GameTableScratchMask | null>(null);

  readonly gridSize = 50;
  readonly movableOption = signal<MovableOption>({});

  constructor() {
    effect(() => {
      const mask = this.gameTableScratchMask();
      if (!mask) return;
      this.movableOption.set({
        tabletopObject: mask,
        colideLayers: ['terrain'],
      });
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
    const coordinate = this.pointerDeviceService.pointers[0];
    const actions: ContextMenuAction[] = [];

    actions.push({
      name: this.isLock ? '固定解除' : '固定する',
      action: () => {
        if (this.isLock) this.unlock();
        else this.lock();
      },
    });

    actions.push(ContextMenuSeparator);
    actions.push({
      name: '削除する',
      action: () => {
        this.gameTableScratchMask()?.destroy();
        SoundEffect.play(PresetSound.sweep);
      },
    });

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
    const coordinate = this.pointerDeviceService.pointers[0];
    let title = 'スクラッチマスク設定';
    if (this.name.length) title += ' - ' + this.name;
    const option: PanelOption = {
      title: title,
      left: coordinate.x - 200,
      top: coordinate.y - 150,
      width: 400,
      height: 300,
    };
    const component = this.panelService.open<GameCharacterSheetComponent>(GameCharacterSheetComponent, option);
    component.tabletopObject = this.gameTableScratchMask();
  }
}
