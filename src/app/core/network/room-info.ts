import { IPeerContext, PeerContext } from './peer-context';

export interface IRoomInfo {
  readonly id: string;
  readonly name: string;
  readonly hasPassword: boolean;
  readonly peers: IPeerContext[];

  filterByPassword(password: string): IPeerContext[] | Promise<IPeerContext[]>;
}

export class RoomInfo implements IRoomInfo {
  id: string = '';
  name: string = '';
  get hasPassword(): boolean {
    return this.peers.some((peer) => peer.hasPassword);
  }
  peers: PeerContext[] = [];

  constructor(id: string = '', name: string = '', peers: PeerContext[] = []) {
    this.id = id;
    this.name = name;
    this.peers = peers;
  }

  async filterByPassword(password: string): Promise<PeerContext[]> {
    const results: PeerContext[] = [];
    for (const peer of this.peers) {
      if (await peer.verifyPassword(password)) {
        results.push(peer);
      }
    }
    return results;
  }

  static listFrom(peerIds: string[]) {
    const peers = peerIds
      .map((peerId) => PeerContext.parse(peerId))
      .sort((a, b) => {
        if (a.peerId > b.peerId) return 1;
        if (a.peerId < b.peerId) return -1;
        return 0;
      });

    const roomMap: Map<string, RoomInfo> = new Map();
    for (const peer of peers) {
      if (peer.isRoom) {
        const alias = peer.roomId + peer.roomName;
        const room = roomMap.get(alias) ?? new RoomInfo(peer.roomId, peer.roomName);
        room.peers.push(peer);
        roomMap.set(alias, room);
      }
    }

    if (roomMap.size < 1) return [];

    const rooms = Array.from(roomMap.values()).sort((a, b) => {
      if (a.id + a.name < b.id + b.name) return -1;
      if (a.id + a.name > b.id + b.name) return 1;
      return 0;
    });
    return rooms;
  }
}
