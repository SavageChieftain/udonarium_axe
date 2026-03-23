import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EventSystem, Network } from '@axe/class/core/system';
import { PeerContext } from '@axe/class/core/system/network/peer-context';
import { PeerCursor } from '@axe/class/peer-cursor';
import { ModalService } from '@axe/service/modal.service';
import { PanelService } from '@axe/service/panel.service';

@Component({
  selector: 'room-setting',
  templateUrl: './room-setting.component.html',
  styleUrls: ['./room-setting.component.css'],
  imports: [FormsModule],
})
export class RoomSettingComponent implements OnInit, OnDestroy {
  private panelService = inject(PanelService);
  private modalService = inject(ModalService);

  peers: PeerContext[] = [];
  isReloading: boolean = false;

  roomName: string = 'ふつうの部屋';
  password: string = '';
  isPrivate: boolean = false;

  get peerId(): string {
    return Network.peerId;
  }
  get isConnected(): boolean {
    return Network.peerIds.length <= 1 ? false : true;
  }
  validateLength: boolean = true;

  get myPeer(): PeerCursor {
    return PeerCursor.myCursor;
  }

  ngOnInit() {
    queueMicrotask(() => (this.modalService.title = this.panelService.title = 'ルーム作成'));
    EventSystem.register(this);
    this.calcPeerId(this.roomName, this.password);
  }

  ngOnDestroy() {
    EventSystem.unregister(this);
  }

  async calcPeerId(roomName: string, password: string) {
    const userId = Network.peerContext ? Network.peerContext.userId : PeerContext.generateId();
    const context = await PeerContext.create(userId, PeerContext.generateId('***'), roomName, password);
    this.validateLength = context.peerId.length < 64 ? true : false;
    this.myPeer.reConnectPass = password;
  }

  createRoom() {
    const userId = Network.peerContext ? Network.peerContext.userId : PeerContext.generateId();
    Network.open(userId, PeerContext.generateId('***'), this.roomName, this.password);
    PeerCursor.myCursor.peerId = Network.peerId;
    this.myPeer.reConnectPass = this.password;
    this.modalService.resolve(true);
  }
}
