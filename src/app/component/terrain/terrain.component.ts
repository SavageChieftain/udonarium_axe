import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';

import { ImageFile } from '@axe/core/file-storage/image-file';
import { ObjectNode } from '@axe/core/synchronize-object/object-node';
import { ObjectStore } from '@axe/core/synchronize-object/object-store';
import { EventSystem } from '@axe/core/system';
import { PresetSound, SoundEffect } from '@axe/sound-effect';
import { SlopeDirection, Terrain, TerrainViewState } from '@axe/terrain';
import { GameCharacterSheetComponent } from 'component/game-character-sheet/game-character-sheet.component';
import { InputHandler } from 'directive/input-handler';
import { MovableOption } from 'directive/movable.directive';
import { RotableOption } from 'directive/rotable.directive';
import { ContextMenuSeparator, ContextMenuService } from 'service/context-menu.service';
import { CoordinateService } from 'service/coordinate.service';
import { ImageService } from 'service/image.service';
import { PanelOption, PanelService } from 'service/panel.service';
import { PointerDeviceService } from 'service/pointer-device.service';
import { TabletopActionService } from 'service/tabletop-action.service';

import { TabletopService } from 'service/tabletop.service';
import { GridLineRender } from 'component/game-table/grid-line-render'; // 注意別のコンポーネントフォルダにアクセスしてグリッドの描画を行っている
import { TableSelecter } from '@axe/table-selecter';
import { GameTable, GridType } from '@axe/game-table';

import { Config } from '@axe/config';
import { MovableDirective } from 'directive/movable.directive';
import { RotableDirective } from 'directive/rotable.directive';
import { NgClass, NgStyle } from '@angular/common';
import { SafePipe } from 'pipe/safe.pipe';

@Component({
  selector: 'terrain',
  templateUrl: './terrain.component.html',
  styleUrls: ['./terrain.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MovableDirective, RotableDirective, NgClass, NgStyle, SafePipe],
})
export class TerrainComponent implements OnInit, OnDestroy, AfterViewInit {
  private ngZone = inject(NgZone);
  private imageService = inject(ImageService);
  private tabletopActionService = inject(TabletopActionService);
  private contextMenuService = inject(ContextMenuService);
  private elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private panelService = inject(PanelService);
  private changeDetector = inject(ChangeDetectorRef);
  private pointerDeviceService = inject(PointerDeviceService);
  private coordinateService = inject(CoordinateService);
  private tabletopService = inject(TabletopService);

  @Input() terrain: Terrain = null!;
  @Input() is3D: boolean = false;
  @ViewChild('gridCanvas', { static: true }) gridCanvas: ElementRef<HTMLCanvasElement>;

  get tableSelecter(): TableSelecter {
    return this.tabletopService.tableSelecter;
  }
  get currentTable(): GameTable {
    return this.tabletopService.currentTable;
  }

  get name(): string {
    return this.terrain.name;
  }
  get mode(): TerrainViewState {
    return this.terrain.mode;
  }
  set mode(mode: TerrainViewState) {
    this.terrain.mode = mode;
  }

  get isLocked(): boolean {
    return this.terrain.isLocked;
  }
  set isLocked(isLocked: boolean) {
    this.terrain.isLocked = isLocked;
  }
  get hasWall(): boolean {
    return this.terrain.hasWall;
  }
  get hasFloor(): boolean {
    return this.terrain.hasFloor;
  }

  get wallImage(): ImageFile {
    return this.imageService.getSkeletonOr(this.terrain.wallImage);
  }
  get floorImage(): ImageFile {
    return this.imageService.getSkeletonOr(this.terrain.floorImage);
  }

  get height(): number {
    return this.adjustMinBounds(this.terrain.height);
  }
  get width(): number {
    return this.adjustMinBounds(this.terrain.width);
  }
  get depth(): number {
    return this.adjustMinBounds(this.terrain.depth);
  }
  get altitude(): number {
    return this.terrain.altitude;
  }
  set altitude(altitude: number) {
    this.terrain.altitude = altitude;
  }

  get isDropShadow(): boolean {
    return this.terrain.isDropShadow;
  }
  set isDropShadow(isDropShadow: boolean) {
    this.terrain.isDropShadow = isDropShadow;
  }

  get isSurfaceShading(): boolean {
    return this.terrain.isSurfaceShading;
  }
  set isSurfaceShading(isSurfaceShading: boolean) {
    this.terrain.isSurfaceShading = isSurfaceShading;
  }

  get isSlope(): boolean {
    return this.terrain.isSlope;
  }
  set isSlope(isSlope: boolean) {
    this.terrain.isSlope = isSlope;
    if (!isSlope) this.terrain.slopeDirection = SlopeDirection.NONE;
  }

  get slopeDirection(): number {
    if (!this.terrain.isSlope) return SlopeDirection.NONE;
    if (this.terrain.isSlope && this.terrain.slopeDirection === SlopeDirection.NONE) return SlopeDirection.BOTTOM;
    return this.terrain.slopeDirection;
  }
  set slopeDirection(slopeDirection: number) {
    this.terrain.isSlope = slopeDirection != SlopeDirection.NONE;
    this.terrain.slopeDirection = slopeDirection;
  }

  get isAltitudeIndicate(): boolean {
    return this.terrain.isAltitudeIndicate;
  }
  set isAltitudeIndicate(isAltitudeIndicate: boolean) {
    this.terrain.isAltitudeIndicate = isAltitudeIndicate;
  }

  get isVisibleFloor(): boolean {
    return 0 < this.width * this.depth;
  }
  get isVisibleWallTopBottom(): boolean {
    return 0 < this.width * this.height;
  }
  get isVisibleWallLeftRight(): boolean {
    return 0 < this.depth * this.height;
  }

  get roomGridDispAlways(): boolean {
    const conf = ObjectStore.instance.get<Config>('Config');
    return conf ? conf.roomGridDispAlways : false;
  }

  set roomGridDispAlways(disp: boolean) {
    const conf = ObjectStore.instance.get<Config>('Config');
    if (conf) conf.roomGridDispAlways = disp;
  }

  gridSize: number = 50;

  get isWallExist(): boolean {
    return !!(this.hasWall && this.wallImage && this.wallImage.url && this.wallImage.url.length > 0);
  }

  get terreinAltitude(): number {
    let ret = this.altitude;
    if (this.altitude < 0 || (!this.isSlope && !this.isWallExist)) ret += this.height;
    return ret;
  }

  movableOption: MovableOption = {};
  rotableOption: RotableOption = {};

  math = Math;
  slopeDirectionState = SlopeDirection;

  private input: InputHandler = null!;
  viewRotateZ = 10;

  ngOnInit() {
    EventSystem.register(this)
      .on('UPDATE_GAME_OBJECT', (event) => {
        const object = ObjectStore.instance.get(event.data.identifier);
        if (!this.terrain || !object) return;
        if (this.terrain === object || (object instanceof ObjectNode && this.terrain.contains(object))) {
          this.changeDetector.markForCheck();
        }
        if (
          event.data.identifier !== this.currentTable.identifier &&
          event.data.identifier !== this.tableSelecter.identifier &&
          event.data.identifier !== this.terrain.identifier
        )
          return;
        this.setGameTableGrid(
          this.width,
          this.depth,
          this.gridSize,
          this.currentTable.gridType,
          this.currentTable.gridColor
        );
      })
      .on('DISP_TERRAIN_GRID', (_event) => {
        let opacity: number = 0.0;
        if (this.terrain.isGrid) {
          opacity = 1.0;
        }
        this.gridCanvas.nativeElement.style.opacity = opacity + '';
      })
      .on('DISP_TERRAIN_GRID_END', (_event) => {
        let opacity: number = 0.0;
        if (this.terrain.isGrid) {
          if (this.roomGridDispAlways) {
            opacity = 1.0;
          }
          if (this.tableSelecter.gridShow) {
            opacity = 1.0;
          }
        }
        this.gridCanvas.nativeElement.style.opacity = opacity + '';
      })
      .on('SYNCHRONIZE_FILE_LIST', (_event) => {
        this.changeDetector.markForCheck();
      })
      .on('UPDATE_FILE_RESOURE', (_event) => {
        this.changeDetector.markForCheck();
      })
      .on<object>('TABLE_VIEW_ROTATE', -1000, (event) => {
        this.ngZone.run(() => {
          this.viewRotateZ = (event.data as Record<string, number>)['z'];
          this.changeDetector.markForCheck();
        });
      });
    this.movableOption = {
      tabletopObject: this.terrain,
      colideLayers: ['terrain'],
    };
    this.rotableOption = {
      tabletopObject: this.terrain,
    };
  }

  ngAfterViewInit() {
    this.ngZone.runOutsideAngular(() => {
      this.input = new InputHandler(this.elementRef.nativeElement);
    });
    this.input.onStart = (e) => this.onInputStart(e);
    this.setGameTableGrid(
      this.width,
      this.depth,
      this.gridSize,
      this.currentTable.gridType,
      this.currentTable.gridColor
    );
  }

  ngOnDestroy() {
    if (this.input) this.input.destroy();
    EventSystem.unregister(this);
  }

  @HostListener('dragstart', ['$event'])
  onDragstart(e: DragEvent) {
    e.stopPropagation();
    e.preventDefault();
  }

  onInputStart(_e: MouseEvent | TouchEvent) {
    this.input.cancel();

    // TODO:もっと良い方法考える
    if (this.isLocked) {
      EventSystem.trigger('DRAG_LOCKED_OBJECT', {});
    }
  }

  @HostListener('contextmenu', ['$event'])
  onContextMenu(e: Event) {
    e.stopPropagation();
    e.preventDefault();

    if (!this.pointerDeviceService.isAllowedToOpenContextMenu) return;

    const menuPosition = this.pointerDeviceService.pointers[0];
    const objectPosition = this.coordinateService.calcTabletopLocalCoordinate();
    this.contextMenuService.open(
      menuPosition,
      [
        {
          name: '高度設定',
          action: undefined,
          subActions: [
            {
              name: '高度を0にする',
              action: () => {
                if (this.altitude != 0) {
                  this.altitude = 0;
                  SoundEffect.play(PresetSound.sweep);
                }
              },
              altitudeHande: this.terrain,
            },
            this.isAltitudeIndicate
              ? {
                  name: '☑ 高度の表示',
                  action: () => {
                    this.isAltitudeIndicate = false;
                    SoundEffect.play(PresetSound.sweep);
                    EventSystem.trigger('UPDATE_INVENTORY', null!);
                  },
                }
              : {
                  name: '☐ 高度の表示',
                  action: () => {
                    this.isAltitudeIndicate = true;
                    SoundEffect.play(PresetSound.sweep);
                    EventSystem.trigger('UPDATE_INVENTORY', null!);
                  },
                },
            this.isDropShadow
              ? {
                  name: '☑ 影の表示',
                  action: () => {
                    this.isDropShadow = false;
                    SoundEffect.play(PresetSound.sweep);
                    EventSystem.trigger('UPDATE_INVENTORY', null!);
                  },
                }
              : {
                  name: '☐ 影の表示',
                  action: () => {
                    this.isDropShadow = true;
                    SoundEffect.play(PresetSound.sweep);
                    EventSystem.trigger('UPDATE_INVENTORY', null!);
                  },
                },
          ],
        },
        ContextMenuSeparator,
        this.isLocked
          ? {
              name: '固定解除',
              action: () => {
                this.isLocked = false;
                SoundEffect.play(PresetSound.unlock);
              },
            }
          : {
              name: '固定する',
              action: () => {
                this.isLocked = true;
                SoundEffect.play(PresetSound.lock);
              },
            },
        ContextMenuSeparator,
        {
          name: '傾斜',
          action: undefined,
          subActions: [
            {
              name: `${this.slopeDirection == SlopeDirection.NONE ? '◉' : '○'} なし`,
              action: () => {
                this.slopeDirection = SlopeDirection.NONE;
              },
            },
            ContextMenuSeparator,
            {
              name: `${this.slopeDirection == SlopeDirection.TOP ? '◉' : '○'} 上（北）`,
              action: () => {
                this.slopeDirection = SlopeDirection.TOP;
              },
            },
            {
              name: `${this.slopeDirection == SlopeDirection.BOTTOM ? '◉' : '○'} 下（南）`,
              action: () => {
                this.slopeDirection = SlopeDirection.BOTTOM;
              },
            },
            {
              name: `${this.slopeDirection == SlopeDirection.LEFT ? '◉' : '○'} 左（西）`,
              action: () => {
                this.slopeDirection = SlopeDirection.LEFT;
              },
            },
            {
              name: `${this.slopeDirection == SlopeDirection.RIGHT ? '◉' : '○'} 右（東）`,
              action: () => {
                this.slopeDirection = SlopeDirection.RIGHT;
              },
            },
          ],
        },
        this.hasWall
          ? {
              name: '壁を非表示',
              action: () => {
                this.mode = TerrainViewState.FLOOR;
                if (this.depth * this.width === 0) {
                  this.terrain.width = this.width <= 0 ? 1 : this.width;
                  this.terrain.depth = this.depth <= 0 ? 1 : this.depth;
                }
              },
            }
          : {
              name: '壁を表示',
              action: () => {
                this.mode = TerrainViewState.ALL;
              },
            },
        this.isSurfaceShading
          ? {
              name: '壁に陰影を付けない',
              action: () => {
                this.isSurfaceShading = false;
                SoundEffect.play(PresetSound.sweep);
              },
            }
          : {
              name: '壁に陰影を付ける',
              action: () => {
                this.isSurfaceShading = true;
                SoundEffect.play(PresetSound.sweep);
              },
            },
        this.isDropShadow
          ? {
              name: '影を非表示',
              action: () => {
                this.isDropShadow = false;
                SoundEffect.play(PresetSound.sweep);
              },
            }
          : {
              name: '影を表示',
              action: () => {
                this.isDropShadow = true;
                SoundEffect.play(PresetSound.sweep);
              },
            },
        ContextMenuSeparator,
        {
          name: '地形設定を編集',
          action: () => {
            this.showDetail(this.terrain);
          },
        },
        {
          name: 'コピーを作る',
          action: () => {
            const cloneObject = this.terrain.clone();
            cloneObject.location.x += this.gridSize;
            cloneObject.location.y += this.gridSize;
            cloneObject.isLocked = false;
            if (this.terrain.parent) this.terrain.parent.appendChild(cloneObject);
            SoundEffect.play(PresetSound.blockPut);
          },
        },
        {
          name: '削除する',
          action: () => {
            this.terrain.destroy();
            SoundEffect.play(PresetSound.sweep);
          },
        },
        ContextMenuSeparator,
        {
          name: 'オブジェクト作成',
          action: undefined,
          subActions: this.tabletopActionService.makeDefaultContextMenuActions(objectPosition),
        },
      ],
      this.name
    );
  }

  onMove() {
    SoundEffect.play(PresetSound.blockPick);
  }

  onMoved() {
    SoundEffect.play(PresetSound.blockPut);
  }

  get floorModCss() {
    let ret = '';
    let tmp: number;
    switch (this.slopeDirection) {
      case SlopeDirection.TOP:
        tmp = Math.atan(this.height / this.depth);
        ret = ' rotateX(' + tmp + 'rad) scaleY(' + 1 / Math.cos(tmp) + ')';
        break;
      case SlopeDirection.BOTTOM:
        tmp = Math.atan(this.height / this.depth);
        ret = ' rotateX(' + -tmp + 'rad) scaleY(' + 1 / Math.cos(tmp) + ')';
        break;
      case SlopeDirection.LEFT:
        tmp = Math.atan(this.height / this.width);
        ret = ' rotateY(' + -tmp + 'rad) scaleX(' + 1 / Math.cos(tmp) + ')';
        break;
      case SlopeDirection.RIGHT:
        tmp = Math.atan(this.height / this.width);
        ret = ' rotateY(' + tmp + 'rad) scaleX(' + 1 / Math.cos(tmp) + ')';
        break;
    }
    return ret;
  }

  get floorBrightness() {
    let ret = 1.0;
    if (!this.isSurfaceShading) return ret;
    switch (this.slopeDirection) {
      case SlopeDirection.TOP:
        ret = 0.4;
        break;
      case SlopeDirection.BOTTOM:
        ret = 1.0;
        break;
      case SlopeDirection.LEFT:
        ret = 0.6;
        break;
      case SlopeDirection.RIGHT:
        ret = 0.9;
        break;
    }
    return ret;
  }

  private adjustMinBounds(value: number, min: number = 0): number {
    return value < min ? min : value;
  }

  private showDetail(gameObject: Terrain) {
    EventSystem.trigger('SELECT_TABLETOP_OBJECT', {
      identifier: gameObject.identifier,
      className: gameObject.aliasName,
    });
    const coordinate = this.pointerDeviceService.pointers[0];
    let title = '地形設定';
    if (gameObject.name.length) title += ' - ' + gameObject.name;
    const option: PanelOption = {
      title: title,
      left: coordinate.x - 250,
      top: coordinate.y - 150,
      width: 600,
      height: 300,
    };
    const component = this.panelService.open<GameCharacterSheetComponent>(GameCharacterSheetComponent, option);
    component.tabletopObject = gameObject;
  }

  private setGameTableGrid(
    width: number,
    height: number,
    gridSize: number = 50,
    gridType: GridType = GridType.SQUARE,
    gridColor: string = '#000000e6'
  ) {
    const render = new GridLineRender(this.gridCanvas.nativeElement);

    const leftPx = this.terrain.location.x - width / 2;
    const topPx = this.terrain.location.y - height / 2;

    render.render(width, height, gridSize, gridType, gridColor, true, topPx, leftPx);
    let opacity: number = 0.0;
    setTimeout(() => {
      // 他PL操作で表示条件変更時、情報更新されてからUpdate処理をするため
      if (this.terrain.isGrid) {
        if (this.roomGridDispAlways) {
          opacity = 1.0;
        }
        if (this.tableSelecter.gridShow) {
          opacity = 1.0;
        }
      }
      this.gridCanvas.nativeElement.style.opacity = opacity + '';
    }, 0);
  }
}
