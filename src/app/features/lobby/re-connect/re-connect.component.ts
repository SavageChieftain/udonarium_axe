import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { EventSystem, Network } from '@axe/core/index';
import { Logger } from '@axe/core/logger';
import { PeerContext } from '@axe/core/network/peer-context';
import { GameObject } from '@axe/core/sync/game-object';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { DiceSymbol } from '@axe/domain/dice/dice-symbol';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { TextNote } from '@axe/domain/shared/text-note';
import { GameTableMask } from '@axe/domain/tabletop/game-table-mask';
import { RangeArea } from '@axe/domain/tabletop/range';
import { Terrain } from '@axe/domain/tabletop/terrain';
import { ModalService } from '@axe/shared/modal.service';
import { PanelService } from '@axe/shared/panel.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 're-connect',
  templateUrl: './re-connect.component.html',
  styleUrls: ['./re-connect.component.css'],
})
export class ReConnectComponent implements OnInit, OnDestroy {
  private changeDetector = inject(ChangeDetectorRef);
  private panelService = inject(PanelService);
  private modalService = inject(ModalService);
  private objectStore = inject(ObjectStore);

  rooms: { alias: string; roomName: string; peerContexts: PeerContext[] }[] = [];

  isReloading: boolean = false;

  isDisconnect: boolean = false;

  networkService = Network;
  roomName = '';
  roomId = '';

  get myPeer(): PeerCursor {
    return PeerCursor.myCursor;
  }

  get currentRoom(): string {
    return Network.peerContext.roomId;
  }
  get peerId(): string {
    return Network.peerId;
  }
  get isConnected(): boolean {
    return Network.peerIds.length <= 1 ? false : true;
  }

  ngOnInit() {
    queueMicrotask(() => this.changeTitle());
    if (this.networkService.peerContext.isRoom) {
      this.roomName = this.networkService.peerContext.roomName;
      this.roomId = this.networkService.peerContext.roomId;
    }

    this.reload();
  }

  private changeTitle() {
    this.modalService.title = this.panelService.title = '再接続';
    this.modalService.title = this.panelService.title = '＜' + this.roomName + '/' + this.roomId + '＞';
  }

  ngOnDestroy() {}

  reConnect() {
    this.disConnect();
    this.deleteObject();

    this.isDisconnect = true;
  }

  reConnect2() {
    if (!this.isDisconnect) return;

    for (const room of this.rooms) {
      if (room.alias == this.roomId + this.roomName) {
        this.connect(room.peerContexts);
        Logger.info(`[Network] 再接続成功 (room: ${this.roomName})`);
        return;
      }
    }
    Logger.warn(`[Network] 再接続先が見つかりません (room: ${this.roomName}/${this.roomId})`);
  }

  async reload() {
    this.isReloading = true;
    this.rooms = [];
    const peersOfroom: { [room: string]: PeerContext[] } = {};
    const peerIds = await Network.listAllPeers();
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
    this.isReloading = false;
  }

  async connect(peerContexts: PeerContext[]) {
    const context = peerContexts[0];
    let password = '';

    if (context.hasPassword) {
      password = this.myPeer.reConnectPass;
      if (password == null) password = '';
    }

    if (!(await context.verifyPassword(password))) return;

    const userId = Network.peerContext ? Network.peerContext.userId : PeerContext.generateId();
    Network.open(userId, context.roomId, context.roomName, password);
    PeerCursor.myCursor.peerId = Network.peerId;

    const triedPeer: string[] = [];
    EventSystem.register(triedPeer).on('OPEN_NETWORK', (event) => {
      Logger.info('[Network] ピア接続開始', event.data.peerId);
      EventSystem.unregister(triedPeer);
      this.objectStore.clearDeleteHistory();
      for (const context of peerContexts) {
        Network.connect(context);
      }
      EventSystem.register(triedPeer)
        .on('CONNECT_PEER', (event) => {
          triedPeer.push(event.data.peerId);
          Logger.info(`[Network] 接続成功 (${triedPeer.length}/${peerContexts.length})`, event.data.peerId);
          if (peerContexts.length <= triedPeer.length) {
            this.resetNetwork();
            EventSystem.unregister(triedPeer);
            this.closeIfConnected();
          }
        })
        .on('DISCONNECT_PEER', (event) => {
          triedPeer.push(event.data.peerId);
          Logger.warn(`[Network] 接続失敗 (${triedPeer.length}/${peerContexts.length})`, event.data.peerId);
          if (peerContexts.length <= triedPeer.length) {
            this.resetNetwork();
            EventSystem.unregister(triedPeer);
            this.closeIfConnected();
          }
        });
    });
  }

  cancel() {
    this.modalService.resolve();
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

  disConnect() {
    Logger.info(`[Network] 切断実行 (接続数: ${this.networkService.peerIds.length})`);
    this.networkService.open();
    this.networkService.open();
  }

  deleteObject() {
    Logger.info('[Network] 切断元と不一致の可能性があるオブジェクトを削除');

    //要素変更後updateをかけ、clearDeleteHistoryでログを飛ばせば再接続先の後方を取得、表示される
    const gameCharacters = this.objectStore.getObjects<GameCharacter>(GameCharacter);
    for (const obj of gameCharacters) {
      obj.setLocation('graveyard');
      this.deleteGameObject(obj);
    }

    const rangeAreas = this.objectStore.getObjects<RangeArea>(RangeArea);
    for (const obj of rangeAreas) {
      obj.setLocation('graveyard');
      this.deleteGameObject(obj);
    }

    const textNote = this.objectStore.getObjects<TextNote>(TextNote);
    for (const obj of textNote) {
      obj.setLocation('graveyard');
      this.deleteGameObject(obj);
    }

    const diceSymbol = this.objectStore.getObjects<DiceSymbol>(DiceSymbol);
    for (const obj of diceSymbol) {
      obj.setLocation('graveyard');
      this.deleteGameObject(obj);
    }

    const gameTableMask = this.objectStore.getObjects<GameTableMask>(GameTableMask);
    for (const obj of gameTableMask) {
      obj.setLocation('graveyard');
      this.deleteGameObject(obj);
    }

    const terrain = this.objectStore.getObjects<Terrain>(Terrain);
    for (const obj of terrain) {
      obj.setLocation('graveyard');
      this.deleteGameObject(obj);
    }

    this.objectStore.clearDeleteHistory();
  }

  private deleteGameObject(gameObject: GameObject) {
    gameObject.destroy();
    this.changeDetector.markForCheck();
  }
}
