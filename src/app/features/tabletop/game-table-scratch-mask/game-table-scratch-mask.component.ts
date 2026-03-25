import { ChangeDetectionStrategy, Component, inject, Input, OnChanges, OnDestroy, OnInit } from '@angular/core';
import { CoordinateService } from '@axe/core/coordinate.service';
import { PointerDeviceService } from '@axe/core/pointer-device.service';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { GameTableScratchMask } from '@axe/domain/tabletop/game-table-scratch-mask';
import { GameCharacterSheetComponent } from '@axe/features/character/game-character-sheet/game-character-sheet.component';
import { TabletopActionService } from '@axe/features/tabletop/tabletop-action.service';
import { ContextMenuAction, ContextMenuSeparator, ContextMenuService } from '@axe/shared/context-menu.service';
import { MovableOption } from '@axe/shared/directives/movable.directive';
import { MovableDirective } from '@axe/shared/directives/movable.directive';
import { ObjectChangeService } from '@axe/shared/object-change.service';
import { PanelOption, PanelService } from '@axe/shared/panel.service';

@Component({
  selector: 'game-table-scratch-mask',
  templateUrl: './game-table-scratch-mask.component.html',
  styleUrls: ['./game-table-scratch-mask.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MovableDirective],
})
export class GameTableScratchMaskComponent implements OnInit, OnChanges, OnDestroy {
  private contextMenuService = inject(ContextMenuService);
  private panelService = inject(PanelService);
  private pointerDeviceService = inject(PointerDeviceService);
  private coordinateService = inject(CoordinateService);
  private tabletopActionService = inject(TabletopActionService);
  private objectChange = inject(ObjectChangeService);

  @Input() gameTableScratchMask: GameTableScratchMask | null = null!;

  gridSize = 50;
  movableOption: MovableOption = {};

  get name(): string {
    this.objectChange.versionOf(this.gameTableScratchMask!.identifier)();
    return this.gameTableScratchMask!.name;
  }
  get width(): number {
    return Math.max(1, this.gameTableScratchMask!.width);
  }
  get height(): number {
    return Math.max(1, this.gameTableScratchMask!.height);
  }
  get isLock(): boolean {
    return this.gameTableScratchMask!.isLock;
  }
  get color(): string {
    return this.gameTableScratchMask!.color;
  }
  get isMine(): boolean {
    return this.gameTableScratchMask!.isMine;
  }

  get posX(): number {
    return this.gameTableScratchMask!.location.x;
  }
  get posY(): number {
    return this.gameTableScratchMask!.location.y;
  }
  get posZ(): number {
    return this.gameTableScratchMask!.posZ;
  }

  ngOnInit() {
    this.movableOption = {
      tabletopObject: this.gameTableScratchMask!,
      colideLayers: ['terrain'],
    };
  }

  ngOnChanges() {
    this.movableOption = {
      tabletopObject: this.gameTableScratchMask!,
      colideLayers: ['terrain'],
    };
  }

  ngOnDestroy() {}

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
        this.gameTableScratchMask!.destroy();
        SoundEffect.play(PresetSound.sweep);
      },
    });

    this.contextMenuService.open(coordinate, actions, this.name);
  }

  lock() {
    this.gameTableScratchMask!.isLock = true;
    SoundEffect.play(PresetSound.lock);
  }

  unlock() {
    this.gameTableScratchMask!.isLock = false;
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
    component.tabletopObject = this.gameTableScratchMask;
  }
}
