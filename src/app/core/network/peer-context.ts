import { Logger } from '@axe/core/logging/logger';
import { sha256 } from '@axe/core/util/crypto-util';
import base from 'base-x';
import lzbase62 from 'lzbase62';

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
    return this.roomId.length > 0;
  }
  get hasPassword(): boolean {
    return this.password.length + this.digestPassword.length > 0;
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
      Logger.warn('[PeerContext] ピアIDパースエラー', e);
    }
    this.digestUserId = peerId;
    return;
  }

  async verifyPassword(password: string): Promise<boolean> {
    const digest = await calcDigestPassword(this.digestUserId, this.roomId, this.roomName, password);
    const isCorrect = digest === this.digestPassword;
    return isCorrect && (await this.verifyRoomId(password));
  }

  private async verifyRoomId(password: string): Promise<boolean> {
    const checksumedRoomId = await calcChecksumedRoomId(this.roomId, this.roomName, password);
    const isCorrect = checksumedRoomId === this.roomId;
    return isCorrect;
  }

  async verifyPeer(peerId: string): Promise<boolean> {
    const peer = PeerContext.parse(peerId);
    if (this.roomId != peer.roomId || this.roomName != peer.roomName || this.hasPassword != peer.hasPassword) {
      return false;
    }

    if (!this.hasPassword) {
      return true;
    }

    if (this.password.length === 0) {
      Logger.error('[PeerContext] パスワードが未設定です');
      return false;
    }

    const isValid = await peer.verifyPassword(this.password);
    return isValid;
  }

  static parse(peerId: string): PeerContext {
    return new PeerContext(peerId);
  }

  static create(userId: string): Promise<PeerContext>;
  static create(userId: string, roomId: string, roomName: string, password: string): Promise<PeerContext>;
  static create(...args: string[]): Promise<PeerContext> {
    if (args.length <= 1) {
      return PeerContext._create(args[0]);
    } else {
      return PeerContext._createRoom(args[0], args[1], args[2], args[3]);
    }
  }

  private static async _create(userId: string = ''): Promise<PeerContext> {
    const digestUserId = await calcDigestUserId(userId);
    const peer = new PeerContext(digestUserId);

    peer.userId = userId;
    return peer;
  }

  private static async _createRoom(
    userId: string = '',
    roomId: string = '',
    roomName: string = '',
    password: string = ''
  ): Promise<PeerContext> {
    const digestUserId = await calcDigest(userId, 6);
    const checksumedRoomId = await calcChecksumedRoomId(roomId, roomName, password);
    const digestPassword = await calcDigestPassword(digestUserId, checksumedRoomId, roomName, password);
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

async function calcDigestUserId(userId: string): Promise<string> {
  if (userId == null) return '';
  return calcDigest(userId);
}

async function calcDigestPassword(
  digestUserId: string,
  roomId: string,
  roomName: string,
  password: string
): Promise<string> {
  if (roomId == null || password == null) return '';
  return password.length > 0 ? calcDigest(digestUserId + roomId + roomName + password, 7) : '';
}

async function calcChecksumedRoomId(roomId: string, roomName: string, password: string): Promise<string> {
  if (password.length === 0) return roomId;
  const salt = roomId.slice(0, 2);
  return salt + (await calcDigest(salt + roomName + password, 1));
}

async function calcDigest(str: string, truncateLength: number = -1): Promise<string> {
  if (str == null) return '';
  const array = await sha256(str);
  let base62 = Base62.encode(array);

  if (truncateLength < 0) truncateLength = base62.length;
  if (base62.length < truncateLength) truncateLength = base62.length;

  base62 = base62.slice(0, truncateLength);
  return base62;
}
