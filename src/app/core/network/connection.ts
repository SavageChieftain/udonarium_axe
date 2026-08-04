import { IPeerContext } from '@axe/core/network/peer-context';
import { IRoomInfo } from '@axe/core/network/room-info';

export type PeerReconnectState = 'retrying' | 'recovered' | 'failed';

export class ConnectionCallback {
  onOpen!: (peer: IPeerContext) => void;
  onClose!: (peer: IPeerContext) => void;
  onConnect!: (peer: IPeerContext) => void;
  onDisconnect!: (peer: IPeerContext) => void;
  onReconnect!: (peer: IPeerContext, state: PeerReconnectState) => void;
  onData!: (peer: IPeerContext | null, data: unknown[]) => void;
  onError!: (peer: IPeerContext, errorType: string, errorMessage: string, errorObject: unknown) => void;
}

export interface Connection {
  readonly peerId: string;
  readonly peerIds: string[];
  readonly peer: IPeerContext;
  readonly peers: IPeerContext[];
  readonly callback: ConnectionCallback;
  readonly bandwidthUsage: number;

  configure(config: Record<string, unknown>): void;
  openStandby(userId?: string): void;
  open(userId: string, roomId: string, roomName: string, password: string): void;
  close(): void;
  leaveImmediately?(): void;
  rejoinAfterLeave?(): Promise<void>;
  connect(peer: IPeerContext): boolean | Promise<boolean>;
  disconnect(peer: IPeerContext): boolean;
  disconnectAll(): void;
  send(data: unknown, sendTo?: string): void;
  listAllPeers(): Promise<string[]>;
  listAllRooms(): Promise<IRoomInfo[]>;
}
