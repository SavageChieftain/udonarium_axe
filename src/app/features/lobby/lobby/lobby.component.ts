import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { EventSystem, Network } from '@axe/core/index';
import { Logger } from '@axe/core/logger';
import { PeerContext } from '@axe/core/network/peer-context';
import { ObjectStore } from '@axe/core/sync/object-store';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { PasswordCheckComponent } from '@axe/features/lobby/password-check/password-check.component';
import { RoomSettingComponent } from '@axe/features/lobby/room-setting/room-setting.component';
import { ModalService } from '@axe/shared/modal.service';
import { PanelService } from '@axe/shared/panel.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'lobby',
  templateUrl: './lobby.component.html',
  styleUrls: ['./lobby.component.css'],
})
export class LobbyComponent implements OnInit, OnDestroy {
  private panelService = inject(PanelService);
  private modalService = inject(ModalService);
  private cdr = inject(ChangeDetectorRef);
  private objectStore = inject(ObjectStore);

  rooms: { alias: string; roomName: string; peerContexts: PeerContext[] }[] = [];

  isReloading: boolean = false;

  help: string = '「一覧を更新」ボタンを押すと接続可能なルーム一覧を表示します。';

  get currentRoom(): string {
    return Network.peerContext.roomId;
  }
  get peerId(): string {
    return Network.peerId;
  }
  get isConnected(): boolean {
    return Network.peerIds.length <= 1 ? false : true;
  }

  get myPeer(): PeerCursor {
    return PeerCursor.myCursor;
  }

  ngOnInit() {
    queueMicrotask(() => this.changeTitle());
    EventSystem.register(this)
      .on('OPEN_NETWORK', (_event) => {
        this.changeTitle();
        if (Network.peerContext.isRoom) {
          this.modalService.resolve();
          return;
        }
        if (!this.isReloading) this.reload();
        this.cdr.markForCheck();
      })
      .on('CONNECT_PEER', (_event) => {
        this.changeTitle();
        this.cdr.markForCheck();
      });
    if (Network.isOpen) {
      this.reload();
    }
  }

  private changeTitle() {
    this.modalService.title = this.panelService.title = 'ロビー';
    if (Network.peerContext.roomName.length) {
      this.modalService.title = this.panelService.title =
        '＜' + Network.peerContext.roomName + '/' + Network.peerContext.roomId + '＞';
    }
  }

  ngOnDestroy() {
    EventSystem.unregister(this);
  }

  async reload() {
    this.isReloading = true;
    this.help = '検索中...';
    this.rooms = [];
    try {
      const peersOfroom: { [room: string]: PeerContext[] } = {};
      const peerIds = await Promise.race([
        Network.listAllPeers(),
        new Promise<string[]>((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000)),
      ]);
      for (const peerId of peerIds) {
        const context = PeerContext.parse(peerId);
        if (context.isRoom) {
          const alias = context.roomId + context.roomName;
          if (!(alias in peersOfroom)) {
            peersOfroom[alias] = [];
          }
          peersOfroom[alias].push(context);
        }
      }
      for (const alias in peersOfroom) {
        this.rooms.push({
          alias: alias,
          roomName: peersOfroom[alias][0].roomName,
          peerContexts: peersOfroom[alias],
        });
      }
      this.rooms.sort((a, b) => {
        if (a.alias < b.alias) return -1;
        if (a.alias > b.alias) return 1;
        return 0;
      });
      this.help = '接続可能なルームが見つかりませんでした。「新しいルームを作成する」で新規ルームを作成できます。';
    } catch (e) {
      Logger.error('[Lobby] ルーム一覧の取得に失敗しました', e);
      this.help = 'ルーム一覧の取得に失敗しました。「一覧を更新」で再検索できます。';
    } finally {
      this.isReloading = false;
      this.cdr.detectChanges();
    }
  }

  async connect(peerContexts: PeerContext[]) {
    const context = peerContexts[0];
    let password = '';

    if (context.hasPassword) {
      password = await this.modalService.open<string>(PasswordCheckComponent, {
        peerId: context.peerId,
        title: `${context.roomName}/${context.roomId}`,
      });
      if (password == null) password = '';
      this.myPeer.reConnectPass = password;
    }

    if (!context.verifyPassword(password)) return;

    const userId = Network.peerContext ? Network.peerContext.userId : PeerContext.generateId();
    Network.open(userId, context.roomId, context.roomName, password);
    PeerCursor.myCursor.peerId = Network.peerId;

    const triedPeer: string[] = [];
    EventSystem.register(triedPeer).on('OPEN_NETWORK', (_event) => {
      EventSystem.unregister(triedPeer);
      this.objectStore.clearDeleteHistory();
      for (const context of peerContexts) {
        Network.connect(context);
      }
      EventSystem.register(triedPeer)
        .on('CONNECT_PEER', (event) => {
          triedPeer.push(event.data.peerId);
          if (peerContexts.length <= triedPeer.length) {
            this.resetNetwork();
            EventSystem.unregister(triedPeer);
            this.closeIfConnected();
          }
        })
        .on('DISCONNECT_PEER', (event) => {
          triedPeer.push(event.data.peerId);
          if (peerContexts.length <= triedPeer.length) {
            this.resetNetwork();
            EventSystem.unregister(triedPeer);
            this.closeIfConnected();
          }
        });
    });
  }

  private resetNetwork() {
    if (Network.peerContexts.length < 1) {
      Network.open();
      PeerCursor.myCursor.peerId = Network.peerId;
    }
  }

  private closeIfConnected() {
    if (0 < Network.peerContexts.length) this.modalService.resolve();
  }

  async showRoomSetting() {
    const created = await this.modalService.open<boolean>(RoomSettingComponent, {
      width: 700,
      height: 400,
      left: 0,
      top: 400,
    });
    if (!created) {
      this.reload();
    }
  }
}
