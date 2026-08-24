import { NgClass, NgComponentOutlet, NgStyle } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
  ViewContainerRef,
} from '@angular/core';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { KeyboardInsetService } from '@axe/application/ui/keyboard-inset.service';
import { PanelService } from '@axe/application/ui/panel.service';
import { ViewportService } from '@axe/application/ui/viewport.service';
import { PointerDeviceService } from '@axe/core/input/pointer-device.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { CutIn } from '@axe/domain/media/cut-in';
import { DraggableDirective } from '@axe/ui/directives/draggable.directive';
import { ResizableDirective } from '@axe/ui/directives/resizable.directive';
import { TextTooltipDirective } from '@axe/ui/directives/text-tooltip.directive';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'ui-panel',
  templateUrl: './ui-panel.component.html',
  host: { class: 'block' },
  providers: [PanelService],
  imports: [DraggableDirective, ResizableDirective, NgClass, NgComponentOutlet, NgStyle, TextTooltipDirective],
})
export class UIPanelComponent {
  panelService = inject(PanelService);
  private readonly pointerDeviceService = inject(PointerDeviceService);
  private readonly objectStore = inject(ObjectStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly viewport = inject(ViewportService);
  private readonly t = inject(TRANSLATE_FN);

  readonly isCompact = this.viewport.isCompact;
  readonly keyboardInset = inject(KeyboardInsetService).inset;

  get menuTitle(): string {
    return this.t('ui.panel.menuTitle');
  }

  readonly draggablePanel = viewChild.required<ElementRef<HTMLElement>>('draggablePanel');
  readonly scrollablePanel = viewChild.required<ElementRef<HTMLDivElement>>('scrollablePanel');
  readonly titleBar = viewChild.required<ElementRef<HTMLDivElement>>('titleBar');
  readonly content = viewChild.required('content', { read: ViewContainerRef });

  readonly titleInput = input('', { alias: 'title' });
  readonly leftInput = input(0, { alias: 'left' });
  readonly topInput = input(0, { alias: 'top' });
  readonly widthInput = input(100, { alias: 'width' });
  readonly heightInput = input(100, { alias: 'height' });
  readonly minWidthInput = input(100, { alias: 'minWidth' });
  readonly minHeightInput = input(100, { alias: 'minHeight' });
  readonly showTitle = input(true);
  readonly overflowVisible = input(false);

  constructor() {
    effect(() => {
      this.panelService.title = this.titleInput();
      this.panelService.left = this.leftInput();
      this.panelService.top = this.topInput();
      this.panelService.width = this.widthInput();
      this.panelService.height = this.heightInput();
      this.panelService.minWidth = this.minWidthInput();
      this.panelService.minHeight = this.minHeightInput();
    });
    afterNextRender({
      write: () => {
        this.panelService.setDefaultScrollablePanel(this.scrollablePanel().nativeElement);
        this.timerCheckWindowSize = setInterval(() => {
          this.chkeWindowMinSize();
        }, 500);
      },
    });
    this.destroyRef.onDestroy(() => {
      if (this.timerCheckWindowSize) {
        clearInterval(this.timerCheckWindowSize);
        this.timerCheckWindowSize = null;
      }
    });
  }

  get title(): string {
    return this.panelService.title;
  }
  set title(title: string) {
    this.panelService.title = title;
  }
  get left() {
    return this.panelService.left;
  }
  set left(left: number) {
    this.panelService.left = left;
  }
  get top() {
    return this.panelService.top;
  }
  set top(top: number) {
    this.panelService.top = top;
  }
  get width() {
    return this.panelService.width;
  }
  set width(width: number) {
    this.panelService.width = width;
  }
  get height() {
    return this.panelService.height;
  }
  set height(height: number) {
    this.panelService.height = height;
  }
  get minWidth() {
    return this.panelService.minWidth;
  }
  set minWidth(minWidth: number) {
    this.panelService.minWidth = minWidth;
  }
  get minHeight() {
    return this.panelService.minHeight;
  }
  set minHeight(minHeight: number) {
    this.panelService.minHeight = minHeight;
  }

  private preLeft: number = 0;
  private preTop: number = 0;
  private preWidth: number = 100;
  private preHeight: number = 100;

  readonly isFullScreen = signal(false);
  readonly isMinimized = signal(false);

  get contentMinimized(): boolean {
    return this.panelService.minimizeToContent && this.isMinimized();
  }

  get frameless(): boolean {
    return this.panelService.frameless;
  }

  /** Wearing no box of its own: either shrunk to its content, or asked to play without a frame. */
  get unboxed(): boolean {
    return this.contentMinimized || this.frameless;
  }

  get showsTitleBar(): boolean {
    return this.showTitle() && !this.frameless;
  }

  protected readonly portraitDispByMouse = signal(true);
  private timerCheckWindowSize: ReturnType<typeof setInterval> | null = null;

  protected get chatPortraitComponent() {
    return PanelService.chatPortraitComponentClass;
  }
  protected get cardStackListComponent() {
    return PanelService.cardStackListComponentClass;
  }

  get isPointerDragging(): boolean {
    return this.pointerDeviceService.isDragging;
  }

  showPortrait(flag: boolean) {
    this.portraitDispByMouse.set(flag);
  }

  chkeWindowMinSize() {
    const id = this.panelService.cutInIdentifier;
    if (!id) return;
    const cutIn = this.objectStore.get<CutIn>(id);
    if (!cutIn) return;
    if (!cutIn.videoId) return;

    const panel = this.draggablePanel().nativeElement;

    const nowW = parseInt(panel.style.width);
    const nowH = parseInt(panel.style.height);
    if (nowW < cutIn.minSizeWidth(true)) {
      panel.style.width = cutIn.minSizeWidth(true) + 'px';
    }
    if (nowH < cutIn.minSizeHeight(true)) {
      panel.style.height = cutIn.minSizeHeight(true) + 'px';
    }
    const winW = window.innerWidth;
    const winH = window.innerHeight;

    const offsetL: number = panel.offsetLeft;
    const offsetT: number = panel.offsetTop;

    const overR = offsetL + cutIn.minSizeWidth(true) - winW;
    if (overR >= 0) {
      const newOffL = offsetL - overR <= 0 ? 0 : offsetL - overR;
      panel.style.left = newOffL + 'px';
    }

    const overB = offsetT + cutIn.minSizeHeight(true) - winH;
    if (overB >= 0) {
      const newOffT = offsetT - overB <= 0 ? 0 : offsetT - overB;
      panel.style.top = newOffT + 'px';
    }
  }

  toggleMinimize() {
    if (this.isFullScreen()) return;
    const id = this.panelService.cutInIdentifier;
    if (id) {
      const cutIn = this.objectStore.get<CutIn>(id);
      if (cutIn?.videoId) {
        return;
      }
    }

    const body = this.scrollablePanel().nativeElement;
    const panel = this.draggablePanel().nativeElement;
    if (this.isMinimized()) {
      this.isMinimized.set(false);
      this.panelService.isMinimized.set(false);
      body.style.display = '';
      if (this.panelService.minimizeToContent) this.width = this.preWidth;
      this.height = this.preHeight;
    } else {
      this.preHeight = panel.offsetHeight;
      this.isMinimized.set(true);
      this.panelService.isMinimized.set(true);
      if (this.panelService.minimizeToContent) {
        this.preWidth = panel.offsetWidth;
        body.style.display = '';
        this.width = 128;
      } else {
        body.style.display = 'none';
        this.height = this.titleBar().nativeElement.offsetHeight;
      }
    }
  }

  toggleFullScreen() {
    if (this.isMinimized()) return;

    const panel = this.draggablePanel().nativeElement;
    if (
      panel.offsetLeft <= 0 &&
      panel.offsetTop <= 0 &&
      panel.offsetWidth >= window.innerWidth &&
      panel.offsetHeight >= window.innerHeight
    ) {
      this.isFullScreen.set(false);
    } else {
      this.isFullScreen.set(true);
    }

    if (this.isFullScreen()) {
      this.preLeft = panel.offsetLeft;
      this.preTop = panel.offsetTop;
      this.preWidth = panel.offsetWidth;
      this.preHeight = panel.offsetHeight;

      this.left = 0;
      this.top = 0;
      this.width = window.innerWidth;
      this.height = window.innerHeight;

      panel.style.left = this.left + 'px';
      panel.style.top = this.top + 'px';
      panel.style.width = this.width + 'px';
      panel.style.height = this.height + 'px';
    } else {
      this.left = this.preLeft;
      this.top = this.preTop;
      this.width = this.preWidth;
      this.height = this.preHeight;
    }
  }

  get padding_(): string {
    if (this.panelService.isCutIn) return '0px';
    else return '8px';
  }

  get isCutIn(): boolean {
    return this.panelService.isCutIn;
  }

  close() {
    if (this.timerCheckWindowSize) {
      clearInterval(this.timerCheckWindowSize);
      this.timerCheckWindowSize = null;
    }
    if (this.panelService) this.panelService.close();
  }

  backGroundSetting(isWhiteLog: boolean): string {
    if (isWhiteLog) return 'background: linear-gradient(-30deg, rgba(255,255,255, 1.0), rgba(255, 255, 255, 1.0)); ';
    else return 'background: linear-gradient(-30deg, rgba(240,218,189, 0.9), rgba(255, 244, 232, 0.9));';
  }
}
