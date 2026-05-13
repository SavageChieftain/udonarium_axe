import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TabletopActionService } from '@axe/application/tabletop/tabletop-action.service';
import { ModalService } from '@axe/application/ui/modal.service';
import { PanelService } from '@axe/application/ui/panel.service';
import { Network } from '@axe/core/index';
import { ObjectStore } from '@axe/core/sync/object-store';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { TableSelecter } from '@axe/domain/tabletop/table-selecter';
import { LobbyComponent } from '@axe/features/lobby/lobby/lobby.component';
import { ReConnectComponent } from '@axe/features/lobby/re-connect/re-connect.component';
import { FileSelecterComponent } from '@axe/ui/components/file-selecter/file-selecter.component';
import { SafePipe } from '@axe/ui/pipes/safe.pipe';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'peer-menu',
  templateUrl: './peer-menu.component.html',
  imports: [FormsModule, DatePipe, SafePipe],
})
export class PeerMenuComponent {
  private readonly tabletopActionService = inject(TabletopActionService);
  private readonly modalService = inject(ModalService);
  private readonly panelService = inject(PanelService);
  private readonly objectStore = inject(ObjectStore);
  private readonly tableSelecter = inject(TableSelecter);
  private readonly destroyRef = inject(DestroyRef);
  networkService = Network;
  gameRoomService = this.objectStore;
  readonly help = signal('');
  readonly isPasswordVisible = signal(false);
  readonly dispDetailFlag = signal(false);

  get myPeer(): PeerCursor {
    return PeerCursor.myCursor;
  }

  constructor() {
    queueMicrotask(() => (this.panelService.title = '接続情報'));
    const timer = setInterval(() => this.dispInfo(), 1000);
    this.destroyRef.onDestroy(() => clearInterval(timer));
  }

  changeIcon() {
    this.modalService.open<string>(FileSelecterComponent).then((value) => {
      if (!this.myPeer || !value) return;
      this.myPeer.imageIdentifier = value;
    });
  }

  showLobby() {
    this.modalService.open(LobbyComponent, {
      title: 'ロビー',
      width: 700,
      height: 400,
      left: 0,
      top: 400,
    });
  }

  showReConnect() {
    this.modalService.open(ReConnectComponent, {
      width: 700,
      height: 400,
      left: 0,
      top: 400,
    });
  }

  get shouldShowReconnectButton(): boolean {
    return this.networkService.peerIds.length > 1;
  }

  togglePasswordVisibility() {
    this.isPasswordVisible.update((v) => !v);
  }

  findUserId(peerId: string) {
    const peerCursor = PeerCursor.findByPeerId(peerId);
    return peerCursor ? peerCursor.userId : '';
  }

  findPeerName(peerId: string) {
    const peerCursor = PeerCursor.findByPeerId(peerId);
    return peerCursor ? peerCursor.name : '';
  }

  findPeerTimeSend(peerId: string) {
    const peerCursor = PeerCursor.findByPeerId(peerId);
    return peerCursor ? peerCursor.timestampSend : 0;
  }

  findPeerTimeReceive(peerId: string) {
    const peerCursor = PeerCursor.findByPeerId(peerId);
    return peerCursor ? peerCursor.timestampReceive : 0;
  }

  findPeerTimeDiffUp(peerId: string) {
    const peerCursor = PeerCursor.findByPeerId(peerId);
    return peerCursor ? peerCursor.timeDiffUp : 0;
  }

  findPeerTimeDiffDown(peerId: string) {
    const peerCursor = PeerCursor.findByPeerId(peerId);
    return peerCursor ? peerCursor.timeDiffDown : 0;
  }

  findPeerTimeLatency(peerId: string) {
    const peerCursor = PeerCursor.findByPeerId(peerId);
    if (!peerCursor) return '--';

    return peerCursor ? peerCursor.timeLatency / 1000 : 99999;
  }

  findPeerDegreeOfSuccess(peerId: string) {
    const peerCursor = PeerCursor.findByPeerId(peerId);
    if (!peerCursor) return '0/0';
    if (peerCursor.firstTimeSignNo < 0) return '0/0';
    const degree = peerCursor.totalTimeSignNum + '/' + (peerCursor.lastTimeSignNo - peerCursor.firstTimeSignNo + 1);
    return degree;
  }

  myTime = signal(0);
  dispInfo() {
    this.myTime.set(Date.now());
  }
}
