import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Network } from '@axe/core/index';
import { PeerContext } from '@axe/core/network/peer-context';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { ModalService } from '@axe/shared/ui/modal.service';
import { PanelService } from '@axe/shared/ui/panel.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'room-setting',
  templateUrl: './room-setting.component.html',
  styleUrls: ['./room-setting.component.css'],
  imports: [FormsModule],
})
export class RoomSettingComponent {
  private readonly panelService = inject(PanelService);
  private readonly modalService = inject(ModalService);

  readonly roomName = signal<string>('ふつうの部屋');
  readonly password = signal<string>('');
  readonly validateLength = signal<boolean>(true);

  get peerId(): string {
    return Network.peerId;
  }
  readonly isConnected = computed(() => Network.peerIds.length > 1);

  get myPeer(): PeerCursor {
    return PeerCursor.myCursor;
  }

  constructor() {
    queueMicrotask(() => (this.modalService.title = this.panelService.title = ' ルーム作成'));
    effect(() => {
      void this.calcPeerId(this.roomName(), this.password());
    });
  }

  async calcPeerId(roomName: string, password: string) {
    const userId = Network.peerContext ? Network.peerContext.userId : PeerContext.generateId();
    const context = await PeerContext.createRoom(userId, PeerContext.generateId('***'), roomName, password);
    this.validateLength.set(context.peerId.length < 64);
    this.myPeer.reConnectPass = password;
  }

  createRoom() {
    const userId = Network.peerContext ? Network.peerContext.userId : PeerContext.generateId();
    Network.open(userId, PeerContext.generateId('***'), this.roomName(), this.password());
    PeerCursor.myCursor.peerId = Network.peerId;
    this.myPeer.reConnectPass = this.password();
    this.modalService.resolve(true);
  }
}
