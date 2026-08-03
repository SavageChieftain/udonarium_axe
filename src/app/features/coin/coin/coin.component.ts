import { NgStyle } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { CoinFlipService } from '@axe/application/coin/coin-flip.service';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { RolePermissionService } from '@axe/application/permission/role-permission.service';
import { ImageService } from '@axe/application/storage/image.service';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { TabletopService } from '@axe/application/tabletop/tabletop.service';
import { ContextMenuSeparator, ContextMenuService } from '@axe/application/ui/context-menu.service';
import { tryBuildMultiSelectionContextMenu } from '@axe/application/ui/multi-selection-context-menu';
import { PanelOption, PanelService } from '@axe/application/ui/panel.service';
import { SelectionSignalService } from '@axe/application/ui/selection-signal.service';
import { buildSurfaceSwitchContextMenu } from '@axe/application/ui/surface-switch-context-menu';
import { PointerDeviceService } from '@axe/core/input/pointer-device.service';
import { imageFileEqual } from '@axe/core/storage/image-file';
import { ObjectStore } from '@axe/core/sync/object-store';
import { Coin } from '@axe/domain/coin/coin';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { buildCoinContextMenu } from '@axe/features/coin/coin/coin-context-menu';
import { MovableDirective, MovableOption } from '@axe/ui/directives/movable.directive';
import { RotableDirective, RotableOption } from '@axe/ui/directives/rotable.directive';
import { SelectableDirective } from '@axe/ui/directives/selectable.directive';
import { SafePipe } from '@axe/ui/pipes/safe.pipe';
import { setupInputHandler, setupMovableRotableForPiece } from '@axe/ui/tabletop/setup-tabletop-piece';
import { translateZCss, Z_OFFSET_TABLETOP_OBJECT_PX } from '@axe/ui/tabletop/z-offset';

@Component({
  selector: 'coin',
  templateUrl: './coin.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MovableDirective, RotableDirective, SelectableDirective, NgStyle, SafePipe],
  host: {
    class: 'block',
    '(dragstart)': 'onDragstart($event)',
    '(contextmenu)': 'onContextMenu($event)',
  },
})
export class CoinComponent {
  private readonly contextMenuService = inject(ContextMenuService);
  private readonly rolePermission = inject(RolePermissionService);
  private readonly panelService = inject(PanelService);
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly tabletopService = inject(TabletopService);
  private readonly imageService = inject(ImageService);
  private readonly pointerDeviceService = inject(PointerDeviceService);
  private readonly objectStore = inject(ObjectStore);
  private readonly selectionSignalService = inject(SelectionSignalService);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly translateFn = inject(TRANSLATE_FN);
  private readonly coinFlip = inject(CoinFlipService);

  readonly coin = input.required<Coin>();

  readonly isSpinning = signal(false);

  get isLock(): boolean {
    return this.coin().isLock;
  }
  get gridSize(): number {
    return this.tabletopService.gridSize();
  }

  readonly size = computed(() => {
    this.objectChange.versionOf(this.coin().identifier)();
    const size = this.coin().size;
    return size > 0 ? size : 1;
  });

  readonly isFront = computed(() => {
    this.objectChange.versionOf(this.coin().identifier)();
    return this.coin().isFront;
  });

  readonly frontLabel = computed(() => this.translateFn('feature.coin.face.front'));
  readonly backLabel = computed(() => this.translateFn('feature.coin.face.back'));

  readonly frontImage = computed(
    () => {
      this.objectChange.fileVersion();
      this.objectChange.versionOf(this.coin().identifier)();
      return this.imageService.getEmptyOr(this.coin().frontImage);
    },
    { equal: imageFileEqual() }
  );

  readonly backImage = computed(
    () => {
      this.objectChange.fileVersion();
      this.objectChange.versionOf(this.coin().identifier)();
      return this.imageService.getEmptyOr(this.coin().backImage);
    },
    { equal: imageFileEqual() }
  );

  readonly faceTransform = computed(() => (this.isFront() ? 'rotateY(0deg)' : 'rotateY(180deg)'));

  readonly movableOption = signal<MovableOption>({});
  readonly rotableOption = signal<RotableOption>({});

  private doubleClickTimer: NodeJS.Timeout | null = null;
  private doubleClickPoint = { x: 0, y: 0 };

  private readonly inputRef = setupInputHandler({
    elementRef: this.elementRef,
    destroyRef: this.destroyRef,
    onStart: (e) => this.onInputStart(e),
  });

  private get input() {
    return this.inputRef.current;
  }

  constructor() {
    this.objectChange.flipCoin$.subscribe((event) => {
      if (event.identifier === this.coin().identifier) this.startSpin();
    }, this.destroyRef);
    setupMovableRotableForPiece(this, {
      target: this.coin,
      collideLayers: ['terrain'],
      transformCssOffset: translateZCss(Z_OFFSET_TABLETOP_OBJECT_PX),
    });
    this.destroyRef.onDestroy(() => clearTimeout(this.doubleClickTimer ?? undefined));
  }

  onSpinEnd() {
    this.isSpinning.set(false);
  }

  onDragstart(e: DragEvent) {
    e.stopPropagation();
    e.preventDefault();
  }

  onInputStart(e: MouseEvent | TouchEvent) {
    this.startDoubleClickTimer(e);
    this.coin().toTopmost();
  }

  startDoubleClickTimer(e: MouseEvent | TouchEvent) {
    if (!this.doubleClickTimer) {
      this.stopDoubleClickTimer();
      this.doubleClickTimer = setTimeout(() => this.stopDoubleClickTimer(), (e as TouchEvent).touches ? 500 : 300);
      this.doubleClickPoint = this.input!.pointer;
      return;
    }

    if ((e as TouchEvent).touches) {
      this.input!.onEnd = () => this.onDoubleClick();
    } else {
      this.onDoubleClick();
    }
  }

  stopDoubleClickTimer() {
    clearTimeout(this.doubleClickTimer ?? undefined);
    this.doubleClickTimer = null;
    if (this.input) this.input.onEnd = null;
  }

  onDoubleClick() {
    this.stopDoubleClickTimer();
    if (!this.rolePermission.canEditTabletop) return;
    const distance =
      (this.doubleClickPoint.x - this.input!.pointer.x) ** 2 + (this.doubleClickPoint.y - this.input!.pointer.y) ** 2;
    if (distance < 10 ** 2) this.flip();
  }

  flip() {
    this.coinFlip.flip(this.coin());
  }

  onContextMenu(e: Event) {
    e.stopPropagation();
    e.preventDefault();
    if (!this.pointerDeviceService.isAllowedToOpenContextMenu) return;

    const position = this.pointerDeviceService.pointers[0];
    const multi = tryBuildMultiSelectionContextMenu({
      self: this.coin(),
      selectionSignalService: this.selectionSignalService,
      objectStore: this.objectStore,
      t: this.translateFn,
      gridSize: this.gridSize,
    });
    if (multi) {
      this.contextMenuService.open(position, multi, this.translateFn('feature.tabletop.selection.title'));
      return;
    }

    const baseMenu = buildCoinContextMenu(
      this.coin(),
      this.gridSize,
      {
        onFlip: () => this.flip(),
        onShowDetail: () => this.showDetail(),
      },
      this.translateFn
    );
    const surfaceEntries = buildSurfaceSwitchContextMenu(
      this.coin(),
      this.tabletopService.currentTable,
      this.translateFn
    );
    this.contextMenuService.open(
      position,
      surfaceEntries.length > 0 ? [...baseMenu, ContextMenuSeparator, ...surfaceEntries] : baseMenu,
      this.coin().name
    );
  }

  onMove() {
    SoundEffect.play(PresetSound.piecePick);
  }

  onMoved() {
    SoundEffect.play(PresetSound.piecePut);
  }

  private startSpin() {
    this.isSpinning.set(false);
    setTimeout(() => this.isSpinning.set(true));
  }

  private showDetail() {
    const coin = this.coin();
    this.selectionSignalService.selectObject(coin.identifier, coin.aliasName);
    const coordinate = this.pointerDeviceService.pointers[0];
    let title = this.translateFn('feature.coin.sheet.title');
    if (coin.name.length) title += ' - ' + coin.name;
    const option: PanelOption = {
      title,
      left: coordinate.x - 200,
      top: coordinate.y - 150,
      width: 400,
      height: 380,
    };
    this.panelService.openLazy(
      () => import('@axe/features/coin/coin-sheet/coin-sheet.component').then((m) => m.CoinSheetComponent),
      option,
      (component) => (component.coin = coin)
    );
  }
}
