import {
  AfterViewChecked,
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { PointerDeviceService } from '@axe/core/pointer-device.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { ChatMessageService } from '@axe/features/chat/chat-message.service';
import { PanelService } from '@axe/shared/panel.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'card-stack-list-img',
  templateUrl: './card-stack-list-img.component.html',
  styleUrls: ['./card-stack-list-img.component.css'],
})
export class CardStackListImageComponent implements AfterViewInit, AfterViewChecked {
  chatMessageService = inject(ChatMessageService);
  private changeDetectionRef = inject(ChangeDetectorRef);
  private panelService = inject(PanelService);
  private pointerDeviceService = inject(PointerDeviceService);
  private objectStore = inject(ObjectStore);

  readonly isTilteTop = input(true);
  readonly dispByMouse = input(false);
  readonly cardStackidentifier = input('');

  readonly cardArea = viewChild<ElementRef>('cardArea');
  private _cardAreaWidth = 0;
  //  get chatTab(): ChatTab { return this.objectStore.get<ChatTab>(this.chatTabidentifier); }

  get tachieY_Pos(): number {
    return 0 - 26;
  }

  get cardAreaWidth(): number {
    return this._cardAreaWidth;
  }

  //  get chatTabList(): ChatTabList { return this.objectStore.get<ChatTabList>('ChatTabList'); }
  /*
  get dispFlag():boolean{
    return true;
  }

  get isTachieDispMode(){
    if( this.chatTabList.isKeepTachieOutWindow ){
      return this.dispFlag ;
    }else{
      return this.dispFlag && this.dispByMouse ;
    }
  }

  tachieAreaHeight( pos: number) : number {
    if( this.chatTab ){
      if( this.chatTab.tachieDispFlag ){
        if( this.chatTab.tachiePosIsDisp( pos ) ){
          return this.chatTabList.tachieHeightValue;
        }
      }
    }
    return 0;
  }
*/
  /*
  get tachieAreaHeight00() : number { return this.tachieAreaHeight(0); }
  get tachieAreaHeight01() : number { return this.tachieAreaHeight(1); }
  get tachieAreaHeight02() : number { return this.tachieAreaHeight(2); }
  get tachieAreaHeight03() : number { return this.tachieAreaHeight(3); }
  get tachieAreaHeight04() : number { return this.tachieAreaHeight(4); }
  get tachieAreaHeight05() : number { return this.tachieAreaHeight(5); }
  get tachieAreaHeight06() : number { return this.tachieAreaHeight(6); }
  get tachieAreaHeight07() : number { return this.tachieAreaHeight(7); }
  get tachieAreaHeight08() : number { return this.tachieAreaHeight(8); }
  get tachieAreaHeight09() : number { return this.tachieAreaHeight(9); }
  get tachieAreaHeight10() : number { return this.tachieAreaHeight(10); }
  get tachieAreaHeight11() : number { return this.tachieAreaHeight(11); }
*/
  private timerId: ReturnType<typeof setTimeout> | null = null;

  //立ち絵表示幅取得
  ngAfterViewInit() {
    this._cardAreaWidth = this.cardArea()!.nativeElement.offsetWidth;
    this.changeDetectionRef.detectChanges();
  }

  ngAfterViewChecked() {
    this._cardAreaWidth = this.cardArea()!.nativeElement.offsetWidth;
    this.changeDetectionRef.detectChanges();
  }

  //z-index取得
  private _zindexOffset = 10;

  /*
  trackByChatTab(index: number, chatTab: ChatTab) {
    return chatTab.identifier;
  }
*/
}
