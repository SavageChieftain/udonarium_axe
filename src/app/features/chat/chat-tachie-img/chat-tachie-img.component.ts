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

const TACHIE_COUNT = 12;
const TACHIE_OPACITY_BACKGROUND = 0.66;
const TACHIE_ZINDEX_FRONT = 11;
const TACHIE_ZINDEX_OFFSET = 10;

/** 1ポジション分の立ち絵描画情報 */
export interface TachieSlot {
  readonly pos: number;
  readonly imageFileUrl: string;
  readonly zIndex: number;
  readonly opacity: number;
  readonly height: number;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'chat-tachie-img',
  templateUrl: './chat-tachie-img.component.html',
  styleUrls: ['./chat-tachie-img.component.css'],
  imports: [NgStyle, SafePipe],
})
export class ChatTachieImageComponent {
  chatMessageService = inject(ChatMessageService);
  private readonly panelService = inject(PanelService);
  private readonly pointerDeviceService = inject(PointerDeviceService);
  private readonly objectStore = inject(ObjectStore);
  private readonly imageStorage = inject(ImageStorage);
  private readonly objectChange = inject(ObjectChangeService);

  readonly chatTabidentifier = input('');
  readonly isTilteTop = input(false);
  readonly dispByMouse = input(false);

  private readonly tachieAreaEl = viewChild.required<ElementRef>('tachieArea');

  // ------- DOM幅: signal + afterRender で自動追従 -------
  readonly tachieAreaWidth = signal(0);

  constructor() {
    afterNextRender(() => {
      this.tachieAreaWidth.set(this.tachieAreaEl().nativeElement.offsetWidth);
    });
    afterEveryRender(() => {
      const w: number = this.tachieAreaEl().nativeElement.offsetWidth;
      if (w !== this.tachieAreaWidth()) this.tachieAreaWidth.set(w);
    });
  }

  // ------- ドメインオブジェクト -------

  private readonly version = computed(() => this.objectChange.versionOf(this.chatTabidentifier())());

  private readonly fileVer = computed(() => this.objectChange.fileVersion());

  get chatTab(): ChatTab {
    this.version();
    return this.objectStore.get<ChatTab>(this.chatTabidentifier())!;
  }

  get chatTabList(): ChatTabList {
    return this.objectStore.get<ChatTabList>('ChatTabList')!;
  }

  // ------- 表示フラグ -------

  get tachieY_Pos(): number {
    if (!this.chatTabList?.isTachieInWindow) {
      return -(this.chatTabList?.tachieHeightValue ?? 0) - 26;
    } else {
      return 0;
    }
  }

  get dispFlag(): boolean {
    if (!this.chatTabList) return false;
    if (this.isTilteTop() && !this.chatTabList.isTachieInWindow) return true;
    if (!this.isTilteTop() && this.chatTabList.isTachieInWindow) return true;
    return false;
  }

  get isTachieDispMode(): boolean {
    if (!this.chatTabList) return false;
    if (this.chatTabList.isKeepTachieOutWindow) {
      return this.dispFlag;
    } else {
      return this.dispFlag && this.dispByMouse();
    }
  }

  // ------- 全ポジション分の描画情報を computed 配列で一括計算 -------

  readonly tachieSlots = computed<TachieSlot[]>(() => {
    this.version();
    this.fileVer();
    const chatTab = this.chatTab;
    const chatTabList = this.chatTabList;
    const slots: TachieSlot[] = [];

    for (let pos = 0; pos < TACHIE_COUNT; pos++) {
      const imageIdentifier = chatTab?.imageIdentifier?.[pos] ?? '';
      const imageFile = imageIdentifier ? this.imageStorage.get(imageIdentifier) : null;
      const imageFileUrl = imageFile ? imageFile.url : '';

      const rawZIndex = chatTab?.tachieZindex(pos) ?? 0;
      const zIndex = rawZIndex + TACHIE_ZINDEX_OFFSET;
      const opacity = rawZIndex === TACHIE_ZINDEX_FRONT ? 1 : TACHIE_OPACITY_BACKGROUND;

      let height = 0;
      if (chatTab?.tachieDispFlag && chatTab.tachiePosIsDisp(pos)) {
        height = chatTabList?.tachieHeightValue ?? 0;
      }

      slots.push({ pos, imageFileUrl, zIndex, opacity, height });
    }
    return slots;
  });

  // ------- イベントハンドラ -------

  tachieClick(pos: number): void {
    this.chatTab.tachiePosHide(pos);
  }
}
