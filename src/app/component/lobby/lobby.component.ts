import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';

import { ObjectStore } from '@axe/core/synchronize-object/object-store';
import { PeerContext } from '@axe/core/system/network/peer-context';
import { EventSystem, Network } from '@axe/core/system';
import { PeerCursor } from '@axe/peer-cursor';

import { PasswordCheckComponent } from 'component/password-check/password-check.component';
import { RoomSettingComponent } from 'component/room-setting/room-setting.component';
import { ModalService } from 'service/modal.service';
import { PanelService } from 'service/panel.service';

@Component({
  selector: 'lobby',
  templateUrl: './lobby.component.html',
  styleUrls: ['./lobby.component.css'],
})
export class LobbyComponent implements OnInit, OnDestroy {
  private panelService = inject(PanelService);
  private modalService = inject(ModalService);
  private cdr = inject(ChangeDetectorRef);

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
      })
      .on('CONNECT_PEER', (_event) => {
        this.changeTitle();
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
      console.error('ルーム一覧の取得に失敗しました。', e);
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
    EventSystem.register(triedPeer).on('OPEN_NETWORK', (event) => {
      console.log('LobbyComponent OPEN_PEER', event.data.peerId);
      EventSystem.unregister(triedPeer);
      ObjectStore.instance.clearDeleteHistory();
      for (const context of peerContexts) {
        Network.connect(context);
      }
      EventSystem.register(triedPeer)
        .on('CONNECT_PEER', (event) => {
          console.log('接続成功！', event.data.peerId);
          triedPeer.push(event.data.peerId);
          console.log('接続成功 ' + triedPeer.length + '/' + peerContexts.length);
          if (peerContexts.length <= triedPeer.length) {
            this.resetNetwork();
            EventSystem.unregister(triedPeer);
            this.closeIfConnected();
          }
        })
        .on('DISCONNECT_PEER', (event) => {
          console.warn('接続失敗', event.data.peerId);
          triedPeer.push(event.data.peerId);
          console.warn('接続失敗 ' + triedPeer.length + '/' + peerContexts.length);
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
