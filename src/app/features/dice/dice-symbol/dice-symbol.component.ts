import { NgStyle } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { ImageService } from '@axe/application/storage/image.service';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { TabletopService } from '@axe/application/tabletop/tabletop.service';
import { ContextMenuService } from '@axe/application/ui/context-menu.service';
import { PanelOption, PanelService } from '@axe/application/ui/panel.service';
import { SelectionSignalService } from '@axe/application/ui/selection-signal.service';
import { UiSignalService } from '@axe/application/ui/ui-signal.service';
import { callRollDiceSymbol } from '@axe/core/event/domain-events';
import { PointerDeviceService } from '@axe/core/input/pointer-device.service';
import { imageFileEqual } from '@axe/core/storage/image-file';
import { ObjectStore } from '@axe/core/sync/object-store';
import { DiceSymbol } from '@axe/domain/dice/dice-symbol';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { buildDiceSymbolContextMenu } from '@axe/features/dice/dice-symbol/dice-symbol-context-menu';
import { InputHandler } from '@axe/ui/directives/input-handler';
import { MovableOption } from '@axe/ui/directives/movable.directive';
import { MovableDirective } from '@axe/ui/directives/movable.directive';
import { RotableOption } from '@axe/ui/directives/rotable.directive';
import { RotableDirective } from '@axe/ui/directives/rotable.directive';
import { SafePipe } from '@axe/ui/pipes/safe.pipe';
import { translateZCss, Z_OFFSET_TALL_OBJECT_PX } from '@axe/ui/tabletop/z-offset';

@Component({
  selector: 'dice-symbol',
  templateUrl: './dice-symbol.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MovableDirective, RotableDirective, NgStyle, SafePipe],
  host: {
    '(dragstart)': 'onDragstart($event)',
    '(contextmenu)': 'onContextMenu($event)',
  },
})
export class DiceSymbolComponent {
  private readonly panelService = inject(PanelService);
  private readonly contextMenuService = inject(ContextMenuService);
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly imageService = inject(ImageService);
  private readonly pointerDeviceService = inject(PointerDeviceService);
  private readonly objectStore = inject(ObjectStore);
  private readonly selectionSignalService = inject(SelectionSignalService);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly uiSignalService = inject(UiSignalService);
  private readonly tabletopService = inject(TabletopService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly translateFn = inject(TRANSLATE_FN);

  readonly diceSymbol = input.required<DiceSymbol>();

  get face(): string {
    return this.diceSymbol().face;
  }
  set face(face: string) {
    this.diceSymbol().face = face;
  }
  get owner(): string {
    return this.diceSymbol().owner;
  }
  set owner(owner: string) {
    this.diceSymbol().owner = owner;
  }
  get rotate(): number {
    return this.diceSymbol().rotate;
  }
  set rotate(rotate: number) {
    this.diceSymbol().rotate = rotate;
  }

  readonly name = computed(() => {
    this.objectChange.versionOf(this.diceSymbol().identifier)();
    this.objectChange.networkVersion();
    if (this.diceSymbol().owner) {
      const cursor = PeerCursor.findByUserId(this.diceSymbol().owner);
      if (cursor) this.objectChange.versionOf(cursor.identifier)();
    }
    return this.diceSymbol().name;
  });
  readonly size = computed(() => {
    this.objectChange.versionOf(this.diceSymbol().identifier)();
    return this.adjustMinBounds(this.diceSymbol().size);
  });

  readonly imageHeignt = computed(() => {
    this.objectChange.versionOf(this.diceSymbol().identifier)();
    return this.diceSymbol().komaImageHeight;
  });
  readonly specifyImageFlag = computed(() => {
    this.objectChange.versionOf(this.diceSymbol().identifier)();
    return this.diceSymbol().specifyKomaImageFlag;
  });

  get faces(): string[] {
    return this.diceSymbol().faces;
  }
  readonly imageFile = computed(
    () => {
      this.objectChange.fileVersion();
      const diceSymbol = this.diceSymbol();
      this.objectChange.versionOf(diceSymbol.identifier)();
      return this.imageService.getEmptyOr(diceSymbol.imageFile);
    },
    { equal: imageFileEqual() }
  );

  get isMine(): boolean {
    return this.diceSymbol().isMine;
  }
  get hasOwner(): boolean {
    return this.diceSymbol().hasOwner;
  }
  get ownerName(): string {
    return this.diceSymbol().ownerName;
  }
  get isVisible(): boolean {
    return this.diceSymbol().isVisible;
  }

  get isLock(): boolean {
    return this.diceSymbol().isLock;
  }
  set isLock(isLock: boolean) {
    this.diceSymbol().isLock = isLock;
  }

  readonly animeState = signal<'inactive' | 'active'>('inactive');

  private iconHiddenTimer: NodeJS.Timeout | null = null;
  readonly isIconHidden = signal(false);

  readonly gridSize = 50;

  readonly rotateSignal = computed(() => {
    this.objectChange.versionOf(this.diceSymbol().identifier)();
    return this.diceSymbol().rotate;
  });

  readonly billboardTransform = computed(() => this.makeBillboardTransform(30));
  readonly billboardTransformOwner = computed(() => this.makeBillboardTransform(55));
  readonly billboardTransformImage = computed(() => this.makeBillboardTransform(0));

  readonly imageBillboardEnabled = computed(() => {
    const table = this.tabletopService.currentTable;
    this.objectChange.versionOf(table.identifier)();
    this.objectChange.versionOf(this.tabletopService.tableSelecter.identifier)();
    return table.imageBillboard || table.mode2d;
  });

  readonly mode2dEnabled = computed(() => {
    const table = this.tabletopService.currentTable;
    this.objectChange.versionOf(table.identifier)();
    this.objectChange.versionOf(this.tabletopService.tableSelecter.identifier)();
    return table.mode2d;
  });

  private labelOrbitTransform(distance3d: number, distance2d: number): string {
    if (!this.mode2dEnabled()) {
      return `translateY(${-distance3d}px)`;
    }
    const r = this.uiSignalService.tableViewRotation();
    const yawRad = ((r?.z ?? 10) * Math.PI) / 180;
    const sin = Math.sin(yawRad);
    const cos = Math.cos(yawRad);
    return `translateX(${(-distance2d * sin).toFixed(2)}px) translateZ(${(-distance2d * cos).toFixed(2)}px)`;
  }

  readonly nameLabelOrbit = computed(() => this.labelOrbitTransform(30, 60));
  readonly ownerLabelOrbit = computed(() => this.labelOrbitTransform(55, 90));

  private makeBillboardTransform(verticalOffset3D: number): string {
    const r = this.uiSignalService.tableViewRotation();
    const tableX = r?.x ?? 50;
    const tableY = r?.y ?? 0;
    const tableZ = r?.z ?? 10;
    const diceRotate = this.rotateSignal();
    const tx = (tableX * Math.PI) / 180;
    const sinRx = Math.sin(tx);
    const cosRx = Math.cos(tx);
    const denom = Math.max(0.05, cosRx);
    const compensateZ = this.mode2dEnabled() ? '0.00' : ((-verticalOffset3D * (1 - sinRx)) / denom).toFixed(2);
    return (
      `translateZ(${compensateZ}px) ` +
      `rotateX(90deg) ` +
      `rotateZ(${-diceRotate}deg) ` +
      `rotateZ(${-tableZ}deg) rotateX(${-tableX}deg) rotateY(${-tableY}deg)`
    );
  }

  readonly movableOption = signal<MovableOption>({});
  readonly rotableOption = signal<RotableOption>({});

  private doubleClickTimer: NodeJS.Timeout | null = null;
  private doubleClickPoint = { x: 0, y: 0 };

  private input: InputHandler | null = null;

  constructor() {
    this.objectChange.rollDiceSymbol$.subscribe((event) => {
      if (event.identifier === this.diceSymbol().identifier) {
        this.animeState.set('inactive');
        setTimeout(() => {
          this.animeState.set('active');
        });
      }
    }, this.destroyRef);
    effect(() => {
      const diceSymbol = this.diceSymbol();
      this.movableOption.set({
        tabletopObject: diceSymbol,
        transformCssOffset: translateZCss(Z_OFFSET_TALL_OBJECT_PX),
        colideLayers: ['terrain'],
      });
      this.rotableOption.set({
        tabletopObject: diceSymbol,
      });
    });
    afterNextRender(() => {
      this.input = new InputHandler(this.elementRef.nativeElement);
      this.input.onStart = (e) => this.onInputStart(e);
    });
    this.destroyRef.onDestroy(() => {
      clearTimeout(this.doubleClickTimer ?? undefined);
      clearTimeout(this.iconHiddenTimer ?? undefined);
      if (this.input) this.input.destroy();
    });
  }

  onDragstart(e: DragEvent) {
    e.stopPropagation();
    e.preventDefault();
  }

  onDiceRollEnd() {
    this.animeState.set('inactive');
  }

  onInputStart(e: MouseEvent | TouchEvent) {
    this.startDoubleClickTimer(e);
    this.startIconHiddenTimer();
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
    const distance =
      (this.doubleClickPoint.x - this.input!.pointer.x) ** 2 + (this.doubleClickPoint.y - this.input!.pointer.y) ** 2;
    if (distance < 10 ** 2) {
      if (this.isVisible) this.diceRoll();
    }
  }

  onContextMenu(e: Event) {
    e.stopPropagation();
    e.preventDefault();

    if (!this.pointerDeviceService.isAllowedToOpenContextMenu) return;
    const position = this.pointerDeviceService.pointers[0];
    this.contextMenuService.open(
      position,
      buildDiceSymbolContextMenu(
        this.diceSymbol(),
        this.gridSize,
        {
          onDiceRoll: () => this.diceRoll(),
          onShowDetail: () => this.showDetail(this.diceSymbol()),
        },
        this.translateFn
      ),
      this.name()
    );
  }

  onMove() {
    SoundEffect.play(PresetSound.dicePick);
  }

  onMoved() {
    SoundEffect.play(PresetSound.dicePut);
  }

  diceRoll(): string {
    callRollDiceSymbol(this.diceSymbol().identifier);
    SoundEffect.play(PresetSound.diceRoll1);
    return this.diceSymbol().diceRoll();
  }

  showDetail(gameObject: DiceSymbol) {
    this.selectionSignalService.selectObject(gameObject.identifier, gameObject.aliasName);
    const coordinate = this.pointerDeviceService.pointers[0];
    let title = this.translateFn('feature.dice.symbolSheet.title');
    if (gameObject.name.length) title += ' - ' + gameObject.name;
    const option: PanelOption = {
      title: title,
      left: coordinate.x - 250,
      top: coordinate.y - 300,
      width: 500,
      height: 600,
    };
    this.panelService.openLazy(
      () =>
        import('@axe/features/dice/dice-symbol-sheet/dice-symbol-sheet.component').then(
          (m) => m.DiceSymbolSheetComponent
        ),
      option,
      (component) => (component.diceSymbol = gameObject)
    );
  }

  private startIconHiddenTimer() {
    clearTimeout(this.iconHiddenTimer ?? undefined);
    this.iconHiddenTimer = setTimeout(() => {
      this.iconHiddenTimer = null;
      this.isIconHidden.set(false);
    }, 300);
    this.isIconHidden.set(true);
  }

  private adjustMinBounds(value: number, min: number = 0): number {
    return value < min ? min : value;
  }
}
