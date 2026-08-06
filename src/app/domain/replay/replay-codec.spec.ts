import { encode } from '@axe/core/util/message-pack';
import { PeerRole } from '@axe/domain/peer/peer-role';
import {
  decodeReplayEvents,
  decodeReplayManifest,
  encodeReplayEvents,
  encodeReplayManifest,
  isSupportedReplayFormat,
} from '@axe/domain/replay/replay-codec';
import {
  PUBLIC_VISIBILITY,
  REPLAY_FORMAT_VERSION,
  ReplayDetailLevel,
  type ReplayEvent,
  ReplayEventKind,
  type ReplayManifest,
} from '@axe/domain/replay/replay-event';

const moveEvent: ReplayEvent = {
  seq: 7,
  at: 1_700_000_000_000,
  t: 4_200,
  kind: ReplayEventKind.ObjectMove,
  actorId: 'alice',
  targetId: 'c1',
  detail: { from: { name: 'table', x: 0, y: 0, z: 0 }, to: { name: 'table', x: 100, y: 50, z: 0 } },
  patch: {
    identifier: 'c1',
    aliasName: 'character',
    before: { location: { name: 'table', x: 0, y: 0 } },
    after: { location: { name: 'table', x: 100, y: 50 } },
  },
  visibility: PUBLIC_VISIBILITY,
  merged: 3,
};

const chatEvent: ReplayEvent = {
  seq: 8,
  at: 1_700_000_001_000,
  t: 5_200,
  kind: ReplayEventKind.ChatMessage,
  actorId: 'bob',
  detail: { text: 'こんばんは' },
  visibility: { kind: 'direct', to: ['alice'] },
};

describe('isSupportedReplayFormat()', () => {
  it('現在の書式を受け入れること', () => {
    expect(isSupportedReplayFormat(REPLAY_FORMAT_VERSION)).toBe(true);
  });

  it('未来の書式や壊れた値を拒むこと', () => {
    expect(isSupportedReplayFormat(REPLAY_FORMAT_VERSION + 1)).toBe(false);
    expect(isSupportedReplayFormat(0)).toBe(false);
    expect(isSupportedReplayFormat('1')).toBe(false);
    expect(isSupportedReplayFormat(undefined)).toBe(false);
  });
});

describe('encodeReplayEvents() / decodeReplayEvents()', () => {
  it('イベント列を往復できること', () => {
    const decoded = decodeReplayEvents(encodeReplayEvents([moveEvent, chatEvent]));
    expect(decoded).toEqual([moveEvent, chatEvent]);
  });

  it('省略された項目を復元後も生やさないこと', () => {
    const decoded = decodeReplayEvents(encodeReplayEvents([chatEvent]));
    expect('targetId' in decoded[0]).toBe(false);
    expect('patch' in decoded[0]).toBe(false);
    expect('merged' in decoded[0]).toBe(false);
  });

  it('空の列を往復できること', () => {
    expect(decodeReplayEvents(encodeReplayEvents([]))).toEqual([]);
  });

  it('未対応の書式では空を返すこと', () => {
    const future = encode({ v: REPLAY_FORMAT_VERSION + 1, events: [moveEvent] });
    expect(decodeReplayEvents(future)).toEqual([]);
  });

  it('中身が壊れていても落ちないこと', () => {
    expect(decodeReplayEvents(encode({ v: REPLAY_FORMAT_VERSION }))).toEqual([]);
    expect(decodeReplayEvents(encode(null))).toEqual([]);
  });
});

describe('encodeReplayManifest() / decodeReplayManifest()', () => {
  const manifest: ReplayManifest = {
    formatVersion: REPLAY_FORMAT_VERSION,
    roomName: '第一夜',
    startedAt: 1_700_000_000_000,
    endedAt: null,
    recordedBy: {
      userId: 'gm',
      peerId: 'p1',
      name: 'ゲームマスター',
      role: PeerRole.GameMaster,
      imageIdentifier: '',
      sinceSeq: 0,
    },
    detailLevel: ReplayDetailLevel.Notable,
    actors: [],
    targets: [],
    keyframes: [{ seq: 0, at: 1_700_000_000_000, byteSize: 2048 }],
    chunks: [{ index: 0, seqStart: 1, seqEnd: 40, eventCount: 40, byteSize: 900 }],
  };

  it('目録を往復できること', () => {
    expect(decodeReplayManifest(encodeReplayManifest(manifest))).toEqual(manifest);
  });

  it('未対応の書式では null を返すこと', () => {
    const future = encode({ v: REPLAY_FORMAT_VERSION + 1, manifest });
    expect(decodeReplayManifest(future)).toBeNull();
  });
});
