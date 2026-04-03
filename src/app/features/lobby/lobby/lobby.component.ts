import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { Network } from '@axe/core/index';
import { Logger } from '@axe/core/logging/logger';
import { PeerContext } from '@axe/core/network/peer-context';
import { ObjectStore } from '@axe/core/sync/object-store';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { PasswordCheckComponent } from '@axe/features/lobby/password-check/password-check.component';
import { RoomSettingComponent } from '@axe/features/lobby/room-setting/room-setting.component';
import { ObjectChangeService } from '@axe/shared/sync/object-change.service';
import { ModalService } from '@axe/shared/ui/modal.service';
import { PanelService } from '@axe/shared/ui/panel.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'lobby',
  templateUrl: './lobby.component.html',
  styleUrls: ['./lobby.component.css'],
})
export class LobbyComponent {
  private readonly panelService = inject(PanelService);
  private readonly modalService = inject(ModalService);
  private readonly objectStore = inject(ObjectStore);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly destroyRef = inject(DestroyRef);

  rooms = signal<{ alias: string; roomName: string; peerContexts: PeerContext[] }[]>([]);

  isReloading = signal(false);

  help = signal('「一覧を更新」ボタンを押すと接続可能なルーム一覧を表示します。');

  get currentRoom(): string {
    return Network.peerContext.roomId;
  }
  get peerId(): string {
    return Network.peerId;
  }
  readonly isConnected = computed(() => {
    this.objectChange.networkVersion();
    return Network.peerIds.length > 1;
  });

  get myPeer(): PeerCursor {
    return PeerCursor.myCursor;
  }

  constructor() {
    queueMicrotask(() => this.changeTitle());
    this.objectChange.networkOpen$.subscribe(() => {
      this.changeTitle();
      if (Network.peerContext.isRoom) {
        queueMicrotask(() => this.modalService.resolve());
        return;
      }
      if (!this.isReloading()) this.reload();
    }, this.destroyRef);
    this.objectChange.peerConnect$.subscribe(() => {
      this.changeTitle();
    }, this.destroyRef);
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

  async reload() {
    this.isReloading.set(true);
    this.help.set('検索中...');
    this.rooms.set([]);
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
          if (!Object.hasOwn(peersOfroom, alias)) {
            peersOfroom[alias] = [];
          }
          peersOfroom[alias].push(context);
        }
      }
      const roomsList: { alias: string; roomName: string; peerContexts: PeerContext[] }[] = [];
      for (const alias of Object.keys(peersOfroom)) {
        roomsList.push({
          alias: alias,
          roomName: peersOfroom[alias][0].roomName,
          peerContexts: peersOfroom[alias],
        });
      }
      roomsList.sort((a, b) => {
        if (a.alias < b.alias) return -1;
        if (a.alias > b.alias) return 1;
        return 0;
      });
      this.rooms.set(roomsList);
      this.help.set('接続可能なルームが見つかりませんでした。「新しいルームを作成する」で新規ルームを作成できます。');
    } catch (e) {
      Logger.error('[Lobby] ルーム一覧の取得に失敗しました', e);
      this.help.set('ルーム一覧の取得に失敗しました。「一覧を更新」で再検索できます。');
    } finally {
      this.isReloading.set(false);
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
    const offOpen = this.objectChange.networkOpen$.subscribe(() => {
      offOpen();
      this.objectStore.clearDeleteHistory();
      for (const context of peerContexts) {
        Network.connect(context);
      }
      this.objectChange.peerConnect$.subscribe((event) => {
        triedPeer.push(event.peerId);
        if (peerContexts.length <= triedPeer.length) {
          this.resetNetwork();
          this.closeIfConnected();
        }
      }, this.destroyRef);
      this.objectChange.peerDisconnect$.subscribe((event) => {
        triedPeer.push(event.peerId);
        if (peerContexts.length <= triedPeer.length) {
          this.resetNetwork();
          this.closeIfConnected();
        }
      }, this.destroyRef);
    }, this.destroyRef);
  }

  private resetNetwork() {
    if (Network.peerContexts.length < 1) {
      Network.openStandby();
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
