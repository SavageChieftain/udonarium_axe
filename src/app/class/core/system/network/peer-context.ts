import base from 'base-x';
import lzbase62 from 'lzbase62';

import { CryptoUtil } from '@axe/core/system/util/crypto-util';
import { MutablePeerSessionState, PeerSessionGrade, PeerSessionState } from './peer-session-state';

const Base62 = base('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');
const roomIdPattern = /^(\w{6})(\w{3})(\w*)-(\w*)/i;

export interface IPeerContext {
  readonly peerId: string;
  readonly userId: string;
  readonly roomId: string;
  readonly roomName: string;
  readonly password: string;
  readonly digestUserId: string;
  readonly digestPassword: string;
  readonly isOpen: boolean;
  readonly isRoom: boolean;
  readonly hasPassword: boolean;
  readonly session: PeerSessionState;
}

export class PeerContext implements IPeerContext {
  peerId: string = '';
  userId: string = '';
  roomId: string = '';
  roomName: string = '';
  password: string = '';
  digestUserId: string = '';
  digestPassword: string = '';
  isOpen: boolean = false;
  session: MutablePeerSessionState = {
    grade: PeerSessionGrade.UNSPECIFIED,
    ping: 0,
    health: 0,
    speed: 0,
    description: '',
  };

  get isRoom(): boolean {
    return 0 < this.roomId.length;
  }
  get hasPassword(): boolean {
    return 0 < this.password.length + this.digestPassword.length;
  }

  private constructor(peerId: string) {
    this.parse(peerId);
  }

  private parse(peerId: string) {
    try {
      this.peerId = peerId;
      const regArray = roomIdPattern.exec(peerId);
      const isRoom = regArray != null;
      if (isRoom) {
        this.digestUserId = regArray[1];
        this.roomId = regArray[2];
        this.roomName = lzbase62.decompress(regArray[3]);
        this.digestPassword = regArray[4];
        return;
      }
    } catch (e) {
      console.warn(e);
    }
    this.digestUserId = peerId;
    return;
  }

  verifyPassword(password: string): boolean {
    const digest = calcDigestPassword(this.digestUserId, this.roomId, this.roomName, password);
    const isCorrect = digest === this.digestPassword;
    return isCorrect && this.verifyRoomId(password);
  }

  private verifyRoomId(password: string): boolean {
    const checksumedRoomId = calcChecksumedRoomId(this.roomId, this.roomName, password);
    const isCorrect = checksumedRoomId === this.roomId;
    return isCorrect;
  }

  verifyPeer(peerId: string): boolean {
    const peer = PeerContext.parse(peerId);
    if (this.roomId != peer.roomId || this.roomName != peer.roomName || this.hasPassword != peer.hasPassword) {
      return false;
    }

    if (!this.hasPassword) {
      return true;
    }

    if (this.password.length < 1) {
      console.error('do not know password.');
      return false;
    }

    const isValid = peer.verifyPassword(this.password);
    return isValid;
  }

  static parse(peerId: string): PeerContext {
    return new PeerContext(peerId);
  }

  static create(userId: string): PeerContext;
  static create(userId: string, roomId: string, roomName: string, password: string): PeerContext;
  static create(...args: any[]): PeerContext {
    if (args.length <= 1) {
      return PeerContext._create.apply(this, args as [string?]);
    } else {
      return PeerContext._createRoom.apply(this, args as [string?, string?, string?, string?]);
    }
  }

  private static _create(userId: string = ''): PeerContext {
    const digestUserId = calcDigestUserId(userId);
    const peer = new PeerContext(digestUserId);

    peer.userId = userId;
    return peer;
  }

  private static _createRoom(
    userId: string = '',
    roomId: string = '',
    roomName: string = '',
    password: string = ''
  ): PeerContext {
    const digestUserId = calcDigest(userId, 6);
    const checksumedRoomId = calcChecksumedRoomId(roomId, roomName, password);
    const digestPassword = calcDigestPassword(digestUserId, checksumedRoomId, roomName, password);
    const peerId = `${digestUserId}${checksumedRoomId}${lzbase62.compress(roomName)}-${digestPassword}`;

    const peer = new PeerContext(peerId);
    peer.userId = userId;
    peer.password = password;
    return peer;
  }

  static generateId(format: string = '********'): string {
    const h: string = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

    return format.replace(/\*/g, () => h[Math.floor(Math.random() * h.length)]);
  }
}

function calcDigestUserId(userId: string): string {
  if (userId == null) return '';
  return calcDigest(userId);
}

function calcDigestPassword(digestUserId: string, roomId: string, roomName: string, password: string): string {
  if (roomId == null || password == null) return '';
  return 0 < password.length ? calcDigest(digestUserId + roomId + roomName + password, 7) : '';
}

function calcChecksumedRoomId(roomId: string, roomName: string, password: string): string {
  if (password.length < 1) return roomId;
  const salt = roomId.slice(0, 2);
  return salt + calcDigest(salt + roomName + password, 1);
}

function calcDigest(str: string, truncateLength: number = -1): string {
  if (str == null) return '';
  const array = CryptoUtil.sha256(str);
  let base62 = Base62.encode(array);

  if (truncateLength < 0) truncateLength = base62.length;
  if (base62.length < truncateLength) truncateLength = base62.length;

  base62 = base62.slice(0, truncateLength);
  return base62;
}
