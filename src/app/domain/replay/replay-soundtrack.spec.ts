import { PUBLIC_VISIBILITY, type ReplayEvent, ReplayEventKind } from '@axe/domain/replay/replay-event';
import {
  buildReplaySoundtrack,
  collectSoundtrackAssetIds,
  EMPTY_REPLAY_SOUNDTRACK,
  hasReplaySound,
  REPLAY_BGM_GAIN,
  REPLAY_SE_GAIN,
} from '@axe/domain/replay/replay-soundtrack';
import type { ReplayStoryboard } from '@axe/domain/replay/replay-storyboard';

function event(
  seq: number,
  kind: ReplayEventKind,
  detail: Record<string, unknown> = {},
  targetId?: string
): ReplayEvent {
  return {
    seq,
    at: seq * 1000,
    t: seq * 1000,
    kind,
    actorId: 'alice',
    targetId,
    detail,
    visibility: PUBLIC_VISIBILITY,
  };
}

function storyboard(times: [number, number][], totalMs: number): ReplayStoryboard {
  return { shots: [], totalMs, timeOfSeq: new Map(times) };
}

describe('buildReplaySoundtrack()', () => {
  it('効果音をその場面の時刻に置くこと', () => {
    const track = buildReplaySoundtrack(
      [event(1, ReplayEventKind.MediaSoundEffect, { identifier: 'se-1' })],
      storyboard([[1, 2500]], 10_000)
    );

    expect(track.effects).toEqual([{ audioIdentifier: 'se-1', startMs: 2500, offsetMs: 0, gain: REPLAY_SE_GAIN }]);
  });

  it('鳴らす音の分からない効果音は捨てること', () => {
    const track = buildReplaySoundtrack(
      [event(1, ReplayEventKind.MediaSoundEffect, { identifier: '' })],
      storyboard([[1, 0]], 10_000)
    );

    expect(track.effects).toEqual([]);
  });

  it('BGM を鳴り始めから止まるまでの区間にすること', () => {
    const track = buildReplaySoundtrack(
      [
        event(1, ReplayEventKind.MediaBgm, { isPlaying: true, startTime: 12 }, 'bgm-1'),
        event(2, ReplayEventKind.MediaBgm, { isPlaying: false }, 'bgm-1'),
      ],
      storyboard(
        [
          [1, 1000],
          [2, 6000],
        ],
        10_000
      )
    );

    expect(track.music).toEqual([
      {
        audioIdentifier: 'bgm-1',
        startMs: 1000,
        endMs: 6000,
        offsetMs: 12_000,
        gain: REPLAY_BGM_GAIN,
        fadeMs: expect.any(Number),
      },
    ]);
  });

  it('鳴りっぱなしの BGM は終わりまで伸ばすこと', () => {
    const track = buildReplaySoundtrack(
      [event(1, ReplayEventKind.MediaBgm, { isPlaying: true }, 'bgm-1')],
      storyboard([[1, 1000]], 10_000)
    );

    expect(track.music[0]).toMatchObject({ startMs: 1000, endMs: 10_000 });
  });

  it('曲が変わったら前の曲を切ること', () => {
    const track = buildReplaySoundtrack(
      [
        event(1, ReplayEventKind.MediaBgm, { isPlaying: true }, 'bgm-1'),
        event(2, ReplayEventKind.MediaBgm, { isPlaying: true }, 'bgm-2'),
      ],
      storyboard(
        [
          [1, 0],
          [2, 4000],
        ],
        10_000
      )
    );

    expect(track.music.map((cue) => [cue.audioIdentifier, cue.startMs, cue.endMs])).toEqual([
      ['bgm-1', 0, 4000],
      ['bgm-2', 4000, 10_000],
    ]);
  });

  it('長さの無い区間は残さないこと', () => {
    const track = buildReplaySoundtrack(
      [
        event(1, ReplayEventKind.MediaBgm, { isPlaying: true }, 'bgm-1'),
        event(2, ReplayEventKind.MediaBgm, { isPlaying: false }, 'bgm-1'),
      ],
      storyboard(
        [
          [1, 3000],
          [2, 3000],
        ],
        10_000
      )
    );

    expect(track.music).toEqual([]);
  });

  it('絵コンテに載らない出来事は鳴らさないこと', () => {
    const track = buildReplaySoundtrack(
      [event(9, ReplayEventKind.MediaSoundEffect, { identifier: 'se-1' })],
      storyboard([[1, 0]], 10_000)
    );

    expect(track.effects).toEqual([]);
  });

  it('終わりより後ろの音は鳴らさないこと', () => {
    const track = buildReplaySoundtrack(
      [event(1, ReplayEventKind.MediaSoundEffect, { identifier: 'se-1' })],
      storyboard([[1, 10_000]], 10_000)
    );

    expect(track.effects).toEqual([]);
  });

  it('絵の無い記録では音も作らないこと', () => {
    expect(
      buildReplaySoundtrack([event(1, ReplayEventKind.MediaSoundEffect, { identifier: 'se-1' })], storyboard([], 0))
    ).toBe(EMPTY_REPLAY_SOUNDTRACK);
  });
});

describe('collectSoundtrackAssetIds() / hasReplaySound()', () => {
  const track = buildReplaySoundtrack(
    [
      event(1, ReplayEventKind.MediaSoundEffect, { identifier: 'se-1' }),
      event(2, ReplayEventKind.MediaBgm, { isPlaying: true }, 'bgm-1'),
    ],
    storyboard(
      [
        [1, 0],
        [2, 1000],
      ],
      10_000
    )
  );

  it('鳴らす音をまとめて返すこと', () => {
    expect(collectSoundtrackAssetIds(track)).toEqual(['se-1', 'bgm-1']);
  });

  it('鳴らす音があるかを答えること', () => {
    expect(hasReplaySound(track)).toBe(true);
    expect(hasReplaySound(EMPTY_REPLAY_SOUNDTRACK)).toBe(false);
  });
});
