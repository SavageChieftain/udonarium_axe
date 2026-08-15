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
  it('takes the current format', () => {
    expect(isSupportedReplayFormat(REPLAY_FORMAT_VERSION)).toBe(true);
  });

  it('turns away a later format and a broken value', () => {
    expect(isSupportedReplayFormat(REPLAY_FORMAT_VERSION + 1)).toBe(false);
    expect(isSupportedReplayFormat(0)).toBe(false);
    expect(isSupportedReplayFormat('1')).toBe(false);
    expect(isSupportedReplayFormat(undefined)).toBe(false);
  });
});

describe('encodeReplayEvents() / decodeReplayEvents()', () => {
  it('makes the round trip with a run of events', () => {
    const decoded = decodeReplayEvents(encodeReplayEvents([moveEvent, chatEvent]));
    expect(decoded).toEqual([moveEvent, chatEvent]);
  });

  it('grows no field that was left out', () => {
    const decoded = decodeReplayEvents(encodeReplayEvents([chatEvent]));
    expect('targetId' in decoded[0]).toBe(false);
    expect('patch' in decoded[0]).toBe(false);
    expect('merged' in decoded[0]).toBe(false);
  });

  it('makes it with an empty run', () => {
    expect(decodeReplayEvents(encodeReplayEvents([]))).toEqual([]);
  });

  it('returns nothing for a format it does not support', () => {
    const future = encode({ v: REPLAY_FORMAT_VERSION + 1, events: [moveEvent] });
    expect(decodeReplayEvents(future)).toEqual([]);
  });

  it('does not fall over on broken contents', () => {
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

  it('makes the round trip with the catalogue', () => {
    expect(decodeReplayManifest(encodeReplayManifest(manifest))).toEqual(manifest);
  });

  it('returns nothing for a format it does not support', () => {
    const future = encode({ v: REPLAY_FORMAT_VERSION + 1, manifest });
    expect(decodeReplayManifest(future)).toBeNull();
  });
});

describe('reading a broken recording', () => {
  it('drops an event of the wrong shape', () => {
    const bytes = encode({ v: REPLAY_FORMAT_VERSION, events: [{ seq: 1 }, null, 'x', { kind: 'chat.message' }] });
    expect(decodeReplayEvents(bytes)).toEqual([]);
  });

  it('fills a missing field in with its default', () => {
    const bytes = encode({
      v: REPLAY_FORMAT_VERSION,
      events: [{ seq: 1, kind: ReplayEventKind.ChatMessage, patch: 'こわれている' }],
    });
    const [event] = decodeReplayEvents(bytes);

    expect(event.detail).toEqual({});
    expect(event.visibility).toEqual(PUBLIC_VISIBILITY);
    expect(event.actorId).toBe('');
    expect(event.at).toBe(0);
    expect(event.patch).toBeUndefined();
  });

  it('keeps a hidden event addressed as it was', () => {
    const bytes = encode({
      v: REPLAY_FORMAT_VERSION,
      events: [
        { seq: 1, kind: ReplayEventKind.ChatMessage, visibility: { kind: 'direct', to: ['bob'] } },
        { seq: 2, kind: ReplayEventKind.ChatMessage, visibility: { kind: 'gm-only' } },
      ],
    });
    const [direct, gmOnly] = decodeReplayEvents(bytes);

    expect(direct.visibility).toEqual({ kind: 'direct', to: ['bob'] });
    expect(gmOnly).toEqual(expect.objectContaining({ visibility: { kind: 'gm-only' } }));
  });

  it('reads no catalogue of the wrong shape', () => {
    expect(decodeReplayManifest(encode({ v: REPLAY_FORMAT_VERSION, manifest: null }))).toBeNull();
    expect(decodeReplayManifest(encode({ v: REPLAY_FORMAT_VERSION, manifest: { formatVersion: 99 } }))).toBeNull();
  });

  it('fills a missing list in as empty', () => {
    const bytes = encode({
      v: REPLAY_FORMAT_VERSION,
      manifest: { formatVersion: REPLAY_FORMAT_VERSION, roomName: 7, endedAt: 'まだ' },
    });
    const manifest = decodeReplayManifest(bytes)!;

    expect(manifest.roomName).toBe('');
    expect(manifest.startedAt).toBe(0);
    expect(manifest.endedAt).toBeNull();
    expect(manifest.actors).toEqual([]);
    expect(manifest.targets).toEqual([]);
    expect(manifest.keyframes).toEqual([]);
    expect(manifest.chunks).toEqual([]);
  });
});
