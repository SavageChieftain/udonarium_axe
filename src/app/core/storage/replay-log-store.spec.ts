import {
  DEFAULT_REPLAY_RETENTION,
  type ReplayRecordingMeta,
  type ReplayRetention,
  selectExpiredRecordings,
  sortRecordingsByNewest,
} from '@axe/core/storage/replay-log-store';

const MEGA_BYTE = 1024 * 1024;

/** For testing the behaviour under a limit. There is none by default. */
const BOUNDED: ReplayRetention = { maxCount: 5, maxTotalBytes: 512 * MEGA_BYTE };

function meta(id: number, startedAt: number, byteSize = MEGA_BYTE): ReplayRecordingMeta {
  return { id, roomName: '部屋', startedAt, endedAt: startedAt + 1000, eventCount: 10, byteSize };
}

describe('sortRecordingsByNewest()', () => {
  it('orders them by start, newest first', () => {
    const sorted = sortRecordingsByNewest([meta(1, 100), meta(2, 300), meta(3, 200)]);
    expect(sorted.map((m) => m.id)).toEqual([2, 3, 1]);
  });

  it('puts the higher id first on a tie', () => {
    const sorted = sortRecordingsByNewest([meta(1, 100), meta(2, 100)]);
    expect(sorted.map((m) => m.id)).toEqual([2, 1]);
  });

  it('leaves the original list alone', () => {
    const source = [meta(1, 100), meta(2, 300)];
    sortRecordingsByNewest(source);
    expect(source.map((m) => m.id)).toEqual([1, 2]);
  });
});

describe('selectExpiredRecordings()', () => {
  it('keeps them all by default', () => {
    // They stay until whoever recorded them deletes them; vanishing would take the session someone meant to turn into a video.
    const metas = Array.from({ length: 40 }, (_, index) => meta(index + 1, (index + 1) * 100, 512 * MEGA_BYTE));

    expect(selectExpiredRecordings(metas)).toEqual([]);
    expect(selectExpiredRecordings(metas, DEFAULT_REPLAY_RETENTION)).toEqual([]);
  });

  it('drops nothing within the limit', () => {
    expect(selectExpiredRecordings([meta(1, 100), meta(2, 200)], BOUNDED)).toEqual([]);
  });

  it('drops the oldest past a limit on the count', () => {
    const metas = Array.from({ length: 7 }, (_, index) => meta(index + 1, (index + 1) * 100));
    expect(selectExpiredRecordings(metas, BOUNDED)).toEqual([2, 1]);
  });

  it('drops the oldest past a limit on the size', () => {
    const big = BOUNDED.maxTotalBytes!;
    const metas = [meta(1, 300, big), meta(2, 200, big), meta(3, 100, big)];
    expect(selectExpiredRecordings(metas, BOUNDED)).toEqual([2, 3]);
  });

  it('keeps the newest even when it alone exceeds the size', () => {
    const huge = BOUNDED.maxTotalBytes! * 2;
    expect(selectExpiredRecordings([meta(1, 100, huge)], BOUNDED)).toEqual([]);
  });

  it('keeps a recording still in progress however old', () => {
    const metas = Array.from({ length: 7 }, (_, index) => meta(index + 1, (index + 1) * 100));
    expect(selectExpiredRecordings(metas, BOUNDED)).toContain(1);
    expect(selectExpiredRecordings(metas, BOUNDED, 1)).not.toContain(1);
  });

  it('counts a recording in progress towards the size even so', () => {
    const big = BOUNDED.maxTotalBytes!;
    const metas = [meta(1, 300, big), meta(2, 200, big), meta(3, 100, big)];
    expect(selectExpiredRecordings(metas, BOUNDED, 3)).toEqual([2]);
  });

  it('drops nothing by size when only a count is set', () => {
    const metas = Array.from({ length: 3 }, (_, index) => meta(index + 1, (index + 1) * 100, 8 * 1024 * MEGA_BYTE));
    expect(selectExpiredRecordings(metas, { maxCount: 5, maxTotalBytes: null })).toEqual([]);
  });

  it('drops nothing from an empty list', () => {
    expect(selectExpiredRecordings([])).toEqual([]);
  });
});
