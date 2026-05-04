import { NgStyle } from '@angular/common';
import {
  afterEveryRender,
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { PointerDeviceService } from '@axe/core/input/pointer-device.service';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { ObjectStore } from '@axe/core/sync/object-store';
import { ChatTab } from '@axe/domain/chat/chat-tab';
import { ChatTabList } from '@axe/domain/chat/chat-tab-list';
import { ChatMessageService } from '@axe/shared/chat/chat-message.service';
import { SafePipe } from '@axe/shared/pipes/safe.pipe';
import { ObjectChangeService } from '@axe/shared/sync/object-change.service';
import { PanelService } from '@axe/shared/ui/panel.service';

const PORTRAIT_COUNT = 12;
const PORTRAIT_OPACITY_BACKGROUND = 0.66;
const PORTRAIT_ZINDEX_FRONT = 11;
const PORTRAIT_ZINDEX_OFFSET = 10;

/** 1ポジション分の立ち絵描画情報 */
export interface PortraitSlot {
  readonly pos: number;
  readonly imageFileUrl: string;
  readonly zIndex: number;
  readonly opacity: number;
  readonly height: number;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'chat-portrait-img',
  templateUrl: './chat-portrait-img.component.html',
  imports: [NgStyle, SafePipe],
})
export class ChatPortraitImageComponent {
  chatMessageService = inject(ChatMessageService);
  private readonly panelService = inject(PanelService);
  private readonly pointerDeviceService = inject(PointerDeviceService);
  private readonly objectStore = inject(ObjectStore);
  private readonly imageStorage = inject(ImageStorage);
  private readonly objectChange = inject(ObjectChangeService);

  readonly chatTabidentifier = input('');
  readonly isTilteTop = input(false);
  readonly dispByMouse = input(false);

  private readonly portraitAreaEl = viewChild.required<ElementRef>('portraitArea');

  // ------- DOM幅: signal + afterRender で自動追従 -------
  readonly portraitAreaWidth = signal(0);

  constructor() {
    afterNextRender(() => {
      this.portraitAreaWidth.set(this.portraitAreaEl().nativeElement.offsetWidth);
    });
    afterEveryRender(() => {
      const w: number = this.portraitAreaEl().nativeElement.offsetWidth;
      if (w !== this.portraitAreaWidth()) this.portraitAreaWidth.set(w);
    });
  }

  // ------- ドメインオブジェクト -------

  private readonly version = computed(() => this.objectChange.versionOf(this.chatTabidentifier())());

  private readonly chatTabListVersion = computed(() => this.objectChange.versionOf('ChatTabList')());

  private readonly fileVer = computed(() => this.objectChange.fileVersion());

  get chatTab(): ChatTab {
    this.version();
    return this.objectStore.get<ChatTab>(this.chatTabidentifier())!;
  }

  get chatTabList(): ChatTabList {
    return this.objectStore.get<ChatTabList>('ChatTabList')!;
  }

  // ------- 表示フラグ -------

  readonly portraitYPos = computed<number>(() => {
    this.chatTabListVersion();
    const h = this.chatTabList?.portraitHeight ?? 0;
    if (!this.chatTabList?.isPortraitInWindow) {
      // タブレットトップ（isTilteTop=true）のウィンドウ外表示: 既存の補正値を維持
      return -h - 26;
    } else {
      // ウィンドウ内表示: 高さゼロのコンテナから上方にはみ出す
      return -h;
    }
  });

  readonly isPortraitDispMode = computed<boolean>(() => {
    this.chatTabListVersion();
    const chatTabList = this.chatTabList;
    if (!chatTabList) return false;
    const isTilteTop = this.isTilteTop();
    const dispFlag = (isTilteTop && !chatTabList.isPortraitInWindow) || (!isTilteTop && chatTabList.isPortraitInWindow);
    if (chatTabList.isKeepPortraitOutWindow) return dispFlag;
    return dispFlag && this.dispByMouse();
  });

  // ------- 全ポジション分の描画情報を computed 配列で一括計算 -------

  readonly portraitSlots = computed<PortraitSlot[]>(() => {
    this.version();
    this.chatTabListVersion();
    this.fileVer();
    const chatTab = this.chatTab;
    const chatTabList = this.chatTabList;
    const slots: PortraitSlot[] = [];

    for (let pos = 0; pos < PORTRAIT_COUNT; pos++) {
      const imageIdentifier = chatTab?.imageIdentifier?.[pos] ?? '';
      const imageFile = imageIdentifier ? this.imageStorage.get(imageIdentifier) : null;
      const imageFileUrl = imageFile ? imageFile.url : '';

      const rawZIndex = chatTab?.portraitZIndex(pos) ?? 0;
      const zIndex = rawZIndex + PORTRAIT_ZINDEX_OFFSET;
      const opacity = rawZIndex === PORTRAIT_ZINDEX_FRONT ? 1 : PORTRAIT_OPACITY_BACKGROUND;

      let height = 0;
      if (chatTab?.portraitDisplayFlag && chatTab.isPortraitPosVisible(pos)) {
        height = chatTabList?.portraitHeight ?? 0;
      }

      slots.push({ pos, imageFileUrl, zIndex, opacity, height });
    }
    return slots;
  });

  // ------- イベントハンドラ -------

  portraitClick(pos: number): void {
    this.chatTab.hidePortraitPos(pos);
  }
}
