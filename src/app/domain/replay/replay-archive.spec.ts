import { PeerRole } from '@axe/domain/peer/peer-role';
import {
  buildReplayArchiveFiles,
  parseReplayArchive,
  type ReplayArchiveEntry,
  replayArchiveName,
} from '@axe/domain/replay/replay-archive';
import {
  PUBLIC_VISIBILITY,
  REPLAY_FORMAT_VERSION,
  ReplayDetailLevel,
  type ReplayEvent,
  ReplayEventKind,
  type ReplayManifest,
} from '@axe/domain/replay/replay-event';

const manifest: ReplayManifest = {
  formatVersion: REPLAY_FORMAT_VERSION,
  roomName: '第一夜',
  startedAt: new Date(2026, 0, 2, 20, 5).getTime(),
  endedAt: new Date(2026, 0, 2, 23, 40).getTime(),
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
  keyframes: [],
  chunks: [],
};

function event(seq: number): ReplayEvent {
  return {
    seq,
    at: seq * 1000,
    t: seq * 1000,
    kind: ReplayEventKind.ChatMessage,
    actorId: 'gm',
    detail: { text: `発言 ${seq}` },
    visibility: PUBLIC_VISIBILITY,
  };
}

async function toEntries(files: File[]): Promise<ReplayArchiveEntry[]> {
  return files.map((file) => ({ name: file.name, blob: file }));
}

describe('replayArchiveName()', () => {
  it('部屋名と日時から名前を作ること', () => {
    expect(replayArchiveName(manifest)).toBe('第一夜_20260102_2005');
  });

  it('部屋名が無ければ replay と呼ぶこと', () => {
    expect(replayArchiveName({ ...manifest, roomName: '' })).toBe('replay_20260102_2005');
  });

  it('ファイル名に使えない文字を落とすこと', () => {
    expect(replayArchiveName({ ...manifest, roomName: 'a/b:c' })).toBe('a_b_c_20260102_2005');
  });
});

describe('buildReplayArchiveFiles()', () => {
  it('目録・イベント・キーフレーム・素材を並べること', () => {
    const files = buildReplayArchiveFiles({
      manifest,
      chunks: [{ index: 0, events: [event(1)] }],
      keyframes: [{ seq: 0, blob: new Blob(['<xml/>']) }],
      assets: [new File(['png'], 'image-1.png', { type: 'image/png' })],
    });
    expect(files.map((file) => file.name)).toEqual([
      'manifest.json',
      'events/000000.msgpack',
      'keyframes/000000.zip',
      'assets/image-1.png',
    ]);
  });

  it('目録を読める JSON で書くこと', async () => {
    const [manifestFile] = buildReplayArchiveFiles({ manifest, chunks: [], keyframes: [], assets: [] });
    expect(JSON.parse(await manifestFile.text())).toEqual(manifest);
  });
});

describe('parseReplayArchive()', () => {
  it('書き出した束を読み戻せること', async () => {
    const files = buildReplayArchiveFiles({
      manifest,
      chunks: [
        { index: 0, events: [event(1), event(2)] },
        { index: 1, events: [event(3)] },
      ],
      keyframes: [
        { seq: 0, blob: new Blob(['<a/>']) },
        { seq: 2, blob: new Blob(['<b/>']) },
      ],
      assets: [new File(['png'], 'image-1.png', { type: 'image/png' })],
    });

    const content = await parseReplayArchive(await toEntries(files));
    expect(content?.manifest.roomName).toBe('第一夜');
    expect(content?.events.map((e) => e.seq)).toEqual([1, 2, 3]);
    expect(content?.keyframes.map((k) => k.seq)).toEqual([0, 2]);
    expect(content?.assets.map((a) => a.name)).toEqual(['image-1.png']);
  });

  it('チャンクの並びが乱れても seq 順に戻すこと', async () => {
    const files = buildReplayArchiveFiles({
      manifest,
      chunks: [
        { index: 1, events: [event(3)] },
        { index: 0, events: [event(1)] },
      ],
      keyframes: [],
      assets: [],
    });
    const content = await parseReplayArchive(await toEntries(files.reverse()));
    expect(content?.events.map((e) => e.seq)).toEqual([1, 3]);
  });

  it('目録が無ければ null を返すこと', async () => {
    expect(await parseReplayArchive([{ name: 'events/000000.msgpack', blob: new Blob([]) }])).toBeNull();
  });

  it('壊れた目録では null を返すこと', async () => {
    expect(await parseReplayArchive([{ name: 'manifest.json', blob: new Blob(['{ not json']) }])).toBeNull();
  });

  it('未対応の書式では null を返すこと', async () => {
    const future = JSON.stringify({ ...manifest, formatVersion: REPLAY_FORMAT_VERSION + 1 });
    expect(await parseReplayArchive([{ name: 'manifest.json', blob: new Blob([future]) }])).toBeNull();
  });

  it('入れ子のディレクトリ名でも読めること', async () => {
    const files = buildReplayArchiveFiles({
      manifest,
      chunks: [{ index: 0, events: [event(1)] }],
      keyframes: [],
      assets: [],
    });
    const nested = files.map((file) => ({ name: `replay_20260102/${file.name}`, blob: file }));
    const content = await parseReplayArchive(nested);
    expect(content?.events.map((e) => e.seq)).toEqual([1]);
  });
});
