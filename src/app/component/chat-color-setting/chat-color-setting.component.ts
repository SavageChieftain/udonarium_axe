import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { ModalService } from 'service/modal.service';
import { PanelService } from 'service/panel.service';
import { GameCharacter } from '@axe/game-character';
import { PeerCursor } from '@axe/peer-cursor';

@Component({
  selector: 'chat-color-setting',
  templateUrl: './chat-color-setting.component.html',
  styleUrls: ['./chat-color-setting.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatColorSettingComponent implements OnInit, OnDestroy, AfterViewInit {
  private changeDetector = inject(ChangeDetectorRef);
  private panelService = inject(PanelService);
  private modalService = inject(ModalService);

  @Input() isAllowedEmpty: boolean = false;
  @Input() tabletopObject: GameCharacter = null!;

  get myPeer(): PeerCursor {
    return PeerCursor.myCursor;
  }

  changeColor(event: string, num: number) {
    if (this.tabletopObject) {
      this.tabletopObject.chatColorCode[num] = event;

      if (this.tabletopObject.syncDummyCounter < 2) {
        this.tabletopObject.syncDummyCounter = this.tabletopObject.syncDummyCounter + 1;
      } else {
        this.tabletopObject.syncDummyCounter = 0;
      }
      console.log('changeColor:count:' + this.tabletopObject.syncDummyCounter);
    } else {
      this.myPeer.chatColorCode[num] = event;
    }
  }

  constructor() {
    const option = this.modalService.option as Record<string, unknown>;
    this.isAllowedEmpty = option && option.isAllowedEmpty ? true : false;
  }

  ngOnInit() {}

  chatColorCode(num: number) {
    if (this.tabletopObject) {
      return this.tabletopObject.chatColorCode[num];
    } else {
      return this.myPeer.chatColorCode[num];
    }
  }

  ngAfterViewInit() {}

  ngOnDestroy() {
    //    EventSystem.unregister(this);
  }
}
