import { Component, ElementRef, Input, OnInit, ViewChild, ViewContainerRef, inject } from '@angular/core';
import { PanelService } from 'service/panel.service';
import { PointerDeviceService } from 'service/pointer-device.service';

import { ObjectStore } from '@axe/core/synchronize-object/object-store';
import { CutIn } from '@axe/cut-in';
import { DraggableDirective } from 'directive/draggable.directive';
import { ResizableDirective } from 'directive/resizable.directive';
import { NgClass, NgStyle } from '@angular/common';
import { ChatTachieImageComponent as ChatTachieImageComponent_1 } from 'component/chat-tachie-img/chat-tachie-img.component';
import { CardStackListImageComponent as CardStackListImageComponent_1 } from 'component/card-stack-list-img/card-stack-list-img.component';

@Component({
  selector: 'ui-panel',
  templateUrl: './ui-panel.component.html',
  styleUrls: ['./ui-panel.component.css'],
  providers: [PanelService],
  imports: [
    DraggableDirective,
    ResizableDirective,
    NgClass,
    ChatTachieImageComponent_1,
    CardStackListImageComponent_1,
    NgStyle,
  ],
})
export class UIPanelComponent implements OnInit {
  panelService = inject(PanelService);
  private pointerDeviceService = inject(PointerDeviceService);

  @ViewChild('draggablePanel', { static: true })
  draggablePanel!: ElementRef<HTMLElement>;
  @ViewChild('scrollablePanel', { static: true })
  scrollablePanel!: ElementRef<HTMLDivElement>;
  @ViewChild('titleBar', { static: true }) titleBar: ElementRef<HTMLDivElement>;
  @ViewChild('content', { read: ViewContainerRef, static: true })
  content!: ViewContainerRef;

  @Input() set title(title: string) {
    this.panelService.title = title;
  }
  @Input() set left(left: number) {
    this.panelService.left = left;
  }
  @Input() set top(top: number) {
    this.panelService.top = top;
  }
  @Input() set width(width: number) {
    this.panelService.width = width;
  }
  @Input() set height(height: number) {
    this.panelService.height = height;
  }

  @Input() showTitleButtons: boolean = true;

  get title(): string {
    return this.panelService.title;
  }
  get left() {
    return this.panelService.left;
  }
  get top() {
    return this.panelService.top;
  }
  get width() {
    return this.panelService.width;
  }
  get height() {
    return this.panelService.height;
  }

  private preLeft: number = 0;
  private preTop: number = 0;
  private preWidth: number = 100;
  private preHeight: number = 100;

  isFullScreen: boolean = false;
  isMinimized: boolean = false;

  protected tachieDispByMouse: boolean = true;
  private timerCheckWindowSize: ReturnType<typeof setInterval> | null = null;

  get isPointerDragging(): boolean {
    return this.pointerDeviceService.isDragging;
  }

  showTachie(flag: boolean) {
    this.tachieDispByMouse = flag;
  }

  ngOnInit() {
    this.panelService.scrollablePanel = this.scrollablePanel.nativeElement;
    this.timerCheckWindowSize = setInterval(() => {
      this.chkeWindowMinSize();
    }, 500);
  }

  // youtube動画が既定値未満にしないための処理 マニュアルで200*200位上津衣装となっていたのでCutIn側でそれに習う
  chkeWindowMinSize() {
    const id = this.panelService.cutInIdentifier;
    if (!id) return;
    const cutIn = ObjectStore.instance.get<CutIn>(id);
    if (!cutIn) return;
    if (!cutIn.videoId) return;

    const panel = this.draggablePanel.nativeElement;
    console.log('chkeWindowMinSize:' + panel.style.width + ' H:' + panel.style.height);

    const nowW = parseInt(panel.style.width);
    const nowH = parseInt(panel.style.height);
    if (nowW < cutIn.minSizeWidth(true)) {
      panel.style.width = cutIn.minSizeWidth(true) + 'px';
      console.log('サイズ補正W');
    }
    if (nowH < cutIn.minSizeHeight(true)) {
      panel.style.height = cutIn.minSizeHeight(true) + 'px';
      console.log('サイズ補正H');
    }
    // はみ出し防止処理
    const winW = window.innerWidth;
    const winH = window.innerHeight;

    const offsetL: number = panel.offsetLeft;
    const offsetT: number = panel.offsetTop;

    const overR = offsetL + cutIn.minSizeWidth(true) - winW;
    if (overR >= 0) {
      const newOffL = offsetL - overR <= 0 ? 0 : offsetL - overR;
      panel.style.left = newOffL + 'px';
      console.log('はみ出し防止処理横');
    }

    const overB = offsetT + cutIn.minSizeHeight(true) - winH;
    if (overB >= 0) {
      const newOffT = offsetT - overB <= 0 ? 0 : offsetT - overB;
      panel.style.top = newOffT + 'px';
      console.log('はみ出し防止処理縦');
    }
  }

  toggleMinimize() {
    if (this.isFullScreen) return;
    const id = this.panelService.cutInIdentifier;
    if (id) {
      const cutIn = ObjectStore.instance.get<CutIn>(id);
      if (cutIn.videoId) {
        return;
      }
    }

    const body = this.scrollablePanel.nativeElement;
    const panel = this.draggablePanel.nativeElement;
    if (this.isMinimized) {
      this.isMinimized = false;
      body.style.display = null!;
      this.height = this.preHeight;
    } else {
      this.preHeight = panel.offsetHeight;

      this.isMinimized = true;
      body.style.display = 'none';
      this.height = this.titleBar.nativeElement.offsetHeight;
    }
  }

  toggleFullScreen() {
    if (this.isMinimized) return;

    const panel = this.draggablePanel.nativeElement;
    if (
      panel.offsetLeft <= 0 &&
      panel.offsetTop <= 0 &&
      panel.offsetWidth >= window.innerWidth &&
      panel.offsetHeight >= window.innerHeight
    ) {
      this.isFullScreen = false;
    } else {
      this.isFullScreen = true;
    }

    if (this.isFullScreen) {
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
      clearTimeout(this.timerCheckWindowSize);
      this.timerCheckWindowSize = null!;
    }
    this.timerCheckWindowSize = null!;
    if (this.panelService) this.panelService.close();
  }

  backGroundSetting(isWhiteLog: boolean): string {
    if (isWhiteLog) return 'background: linear-gradient(-30deg, rgba(255,255,255, 1.0), rgba(255, 255, 255, 1.0)); ';
    else return 'background: linear-gradient(-30deg, rgba(240,218,189, 0.9), rgba(255, 244, 232, 0.9));';
  }
}
