import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';

import { EventSystem } from '@axe/core/system';
import { GameTableScratchMask } from '@axe/game-table-scratch-mask';
import { ContextMenuAction, ContextMenuSeparator, ContextMenuService } from 'service/context-menu.service';
import { PanelOption, PanelService } from 'service/panel.service';
import { PointerDeviceService } from 'service/pointer-device.service';
import { CoordinateService } from 'service/coordinate.service';
import { MovableOption } from 'directive/movable.directive';
import { GameCharacterSheetComponent } from 'component/game-character-sheet/game-character-sheet.component';
import { TabletopActionService } from 'service/tabletop-action.service';
import { PresetSound, SoundEffect } from '@axe/sound-effect';
import { MovableDirective } from 'directive/movable.directive';

@Component({
  selector: 'game-table-scratch-mask',
  templateUrl: './game-table-scratch-mask.component.html',
  styleUrls: ['./game-table-scratch-mask.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MovableDirective],
})
export class GameTableScratchMaskComponent implements OnInit, OnChanges, OnDestroy {
  private ngZone = inject(NgZone);
  private contextMenuService = inject(ContextMenuService);
  private panelService = inject(PanelService);
  private changeDetector = inject(ChangeDetectorRef);
  private pointerDeviceService = inject(PointerDeviceService);
  private coordinateService = inject(CoordinateService);
  private tabletopActionService = inject(TabletopActionService);

  @Input() gameTableScratchMask: GameTableScratchMask | null = null!;

  gridSize = 50;
  movableOption: MovableOption = {};

  get name(): string {
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
    EventSystem.register(this)
      .on('UPDATE_GAME_OBJECT', (event) => {
        if (event.data.identifier === this.gameTableScratchMask?.identifier) {
          this.changeDetector.markForCheck();
        }
      })
      .on('SYNCHRONIZE_FILE_LIST', () => this.changeDetector.markForCheck())
      .on('UPDATE_FILE_RESOURE', () => this.changeDetector.markForCheck());

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

  ngOnDestroy() {
    EventSystem.unregister(this);
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
