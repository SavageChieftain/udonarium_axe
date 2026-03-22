import { DatePipe } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, inject, NgZone, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ObjectStore } from '@axe/core/synchronize-object/object-store';
import { EventSystem, Network } from '@axe/core/system';
import { PeerContext } from '@axe/core/system/network/peer-context';
import { PeerCursor } from '@axe/peer-cursor';
import { TableSelecter } from '@axe/table-selecter';
import { FileSelecterComponent } from 'component/file-selecter/file-selecter.component';
import { LobbyComponent } from 'component/lobby/lobby.component';
import { ReConnectComponent } from 'component/re-connect/re-connect.component';
import { SafePipe } from 'pipe/safe.pipe';
import { ModalService } from 'service/modal.service';
import { PanelService } from 'service/panel.service';
import { TabletopActionService } from 'service/tabletop-action.service';

@Component({
  selector: 'peer-menu',
  templateUrl: './peer-menu.component.html',
  styleUrls: ['./peer-menu.component.css'],
  imports: [FormsModule, DatePipe, SafePipe],
})
export class PeerMenuComponent implements OnInit, OnDestroy, AfterViewInit {
  private tabletopActionService = inject(TabletopActionService);
  private changeDetector = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);
  private modalService = inject(ModalService);
  private panelService = inject(PanelService);
  private objectStore = inject(ObjectStore);
  private tableSelecter = inject(TableSelecter);
  targetUserId = '';
  networkService = Network;
  gameRoomService = this.objectStore;
  help: string = '';
  isPasswordVisible = false;
  disptimer: ReturnType<typeof setInterval> | null = null;
  dispDetailFlag = false;

  get myPeer(): PeerCursor {
    return PeerCursor.myCursor;
  }

  ngOnInit() {
    queueMicrotask(() => (this.panelService.title = '接続情報'));
  }

  ngAfterViewInit() {
    this.changeDetector.detach();

    EventSystem.register(this).on('OPEN_NETWORK', (_event) => {
      this.ngZone.run(() => {});
    });

    this.ngZone.runOutsideAngular(() => {
      this.disptimer = setInterval(() => {
        this.dispInfo();
        this.changeDetector.detectChanges();
      }, 1000);
    });
  }

  ngOnDestroy() {
    EventSystem.unregister(this);
    if (this.disptimer != null) {
      clearInterval(this.disptimer);
      this.disptimer = null;
    }
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

  myTime = 0;
  dispInfo() {
    this.myTime = Date.now();
  }
}
