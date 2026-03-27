import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Network } from '@axe/core/index';
import { PeerContext } from '@axe/core/network/peer-context';
import { ObjectStore } from '@axe/core/sync/object-store';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { TableSelecter } from '@axe/domain/tabletop/table-selecter';
import { FileSelecterComponent } from '@axe/shared/components/file-selecter/file-selecter.component';
import { LobbyComponent } from '@axe/features/lobby/lobby/lobby.component';
import { ReConnectComponent } from '@axe/features/lobby/re-connect/re-connect.component';
import { TabletopActionService } from '@axe/shared/tabletop-action.service';
import { ModalService } from '@axe/shared/modal.service';
import { PanelService } from '@axe/shared/panel.service';
import { SafePipe } from '@axe/shared/pipes/safe.pipe';
import { interval } from 'rxjs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'peer-menu',
  templateUrl: './peer-menu.component.html',
  styleUrls: ['./peer-menu.component.css'],
  imports: [FormsModule, DatePipe, SafePipe],
})
export class PeerMenuComponent implements OnInit {
  private tabletopActionService = inject(TabletopActionService);
  private modalService = inject(ModalService);
  private panelService = inject(PanelService);
  private objectStore = inject(ObjectStore);
  private tableSelecter = inject(TableSelecter);
  private destroyRef = inject(DestroyRef);
  targetUserId = '';
  networkService = Network;
  gameRoomService = this.objectStore;
  help: string = '';
  isPasswordVisible = false;
  dispDetailFlag = false;

  get myPeer(): PeerCursor {
    return PeerCursor.myCursor;
  }

  ngOnInit() {
    queueMicrotask(() => (this.panelService.title = '接続情報'));
    interval(1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.dispInfo());
  }

  changeIcon() {
    this.modalService.open<string>(FileSelecterComponent).then((value) => {
      if (!this.myPeer || !value) return;
      this.myPeer.imageIdentifier = value;
    });
  }

  async connectPeer() {
    const targetUserId = this.targetUserId;
    this.targetUserId = '';
    if (targetUserId.length < 1) return;
    this.help = '';
    const context = await PeerContext.create(targetUserId);
    if (context.isRoom) return;
    this.objectStore.clearDeleteHistory();
    Network.connect(context);
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

  togglePasswordVisibility() {
    this.isPasswordVisible = !this.isPasswordVisible;
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
