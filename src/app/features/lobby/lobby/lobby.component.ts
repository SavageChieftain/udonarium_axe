import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
import { merge, take } from 'rxjs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'lobby',
  templateUrl: './lobby.component.html',
  styleUrls: ['./lobby.component.css'],
})
export class LobbyComponent implements OnInit {
  private panelService = inject(PanelService);
  private modalService = inject(ModalService);
  private objectStore = inject(ObjectStore);
  private objectChange = inject(ObjectChangeService);
  private destroyRef = inject(DestroyRef);

  rooms = signal<{ alias: string; roomName: string; peerContexts: PeerContext[] }[]>([]);

  isReloading = signal(false);

  help = signal('「一覧を更新」ボタンを押すと接続可能なルーム一覧を表示します。');

  get currentRoom(): string {
    return Network.peerContext.roomId;
  }
  get peerId(): string {
    return Network.peerId;
  }
  get isConnected(): boolean {
    this.objectChange.networkVersion();
    return Network.peerIds.length <= 1 ? false : true;
  }

  get myPeer(): PeerCursor {
    return PeerCursor.myCursor;
  }

  ngOnInit() {
    queueMicrotask(() => this.changeTitle());
    this.objectChange.networkOpen$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.changeTitle();
      if (Network.peerContext.isRoom) {
        queueMicrotask(() => this.modalService.resolve());
        return;
      }
      if (!this.isReloading()) this.reload();
    });
    this.objectChange.peerConnect$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
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
          if (!(alias in peersOfroom)) {
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
    this.objectChange.networkOpen$.pipe(take(1)).subscribe(() => {
      this.objectStore.clearDeleteHistory();
      for (const context of peerContexts) {
        Network.connect(context);
      }
      merge(this.objectChange.peerConnect$, this.objectChange.peerDisconnect$)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((event) => {
          triedPeer.push(event.peerId);
          if (peerContexts.length <= triedPeer.length) {
            this.resetNetwork();
            this.closeIfConnected();
          }
        });
    });
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
