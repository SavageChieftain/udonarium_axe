import {
  DEFAULT_REPLAY_RETENTION,
  type ReplayRecordingMeta,
  type ReplayRetention,
  selectExpiredRecordings,
  sortRecordingsByNewest,
} from '@axe/core/storage/replay-log-store';

const MEGA_BYTE = 1024 * 1024;

/** 上限を決めたときの振る舞いを確かめるための設定。既定は上限なし。 */
const BOUNDED: ReplayRetention = { maxCount: 5, maxTotalBytes: 512 * MEGA_BYTE };

function meta(id: number, startedAt: number, byteSize = MEGA_BYTE): ReplayRecordingMeta {
  return { id, roomName: '部屋', startedAt, endedAt: startedAt + 1000, eventCount: 10, byteSize };
}

describe('sortRecordingsByNewest()', () => {
  it('開始が新しい順に並べること', () => {
    const sorted = sortRecordingsByNewest([meta(1, 100), meta(2, 300), meta(3, 200)]);
    expect(sorted.map((m) => m.id)).toEqual([2, 3, 1]);
  });

  it('同時刻なら id の大きい方を先にすること', () => {
    const sorted = sortRecordingsByNewest([meta(1, 100), meta(2, 100)]);
    expect(sorted.map((m) => m.id)).toEqual([2, 1]);
  });

  it('元の配列を変えないこと', () => {
    const source = [meta(1, 100), meta(2, 300)];
    sortRecordingsByNewest(source);
    expect(source.map((m) => m.id)).toEqual([1, 2]);
  });
});

describe('selectExpiredRecordings()', () => {
  it('既定では何本あっても捨てないこと', () => {
    // 記録した本人が消すまで残す。勝手に消えると、あとで動画にしようとした卓が無い。
    const metas = Array.from({ length: 40 }, (_, index) => meta(index + 1, (index + 1) * 100, 512 * MEGA_BYTE));

    expect(selectExpiredRecordings(metas)).toEqual([]);
    expect(selectExpiredRecordings(metas, DEFAULT_REPLAY_RETENTION)).toEqual([]);
  });

  it('上限内なら何も捨てないこと', () => {
    expect(selectExpiredRecordings([meta(1, 100), meta(2, 200)], BOUNDED)).toEqual([]);
  });

  it('本数の上限を超えた古い録画を捨てること', () => {
    const metas = Array.from({ length: 7 }, (_, index) => meta(index + 1, (index + 1) * 100));
    expect(selectExpiredRecordings(metas, BOUNDED)).toEqual([2, 1]);
  });

  it('合計容量を超えた古い録画を捨てること', () => {
    const big = BOUNDED.maxTotalBytes!;
    const metas = [meta(1, 300, big), meta(2, 200, big), meta(3, 100, big)];
    expect(selectExpiredRecordings(metas, BOUNDED)).toEqual([2, 3]);
  });

  it('最新の 1 本は容量を超えていても残すこと', () => {
    const huge = BOUNDED.maxTotalBytes! * 2;
    expect(selectExpiredRecordings([meta(1, 100, huge)], BOUNDED)).toEqual([]);
  });

  it('記録中の録画は古くても残すこと', () => {
    const metas = Array.from({ length: 7 }, (_, index) => meta(index + 1, (index + 1) * 100));
    expect(selectExpiredRecordings(metas, BOUNDED)).toContain(1);
    expect(selectExpiredRecordings(metas, BOUNDED, 1)).not.toContain(1);
  });

  it('記録中の録画を残しても容量の勘定に入れること', () => {
    const big = BOUNDED.maxTotalBytes!;
    const metas = [meta(1, 300, big), meta(2, 200, big), meta(3, 100, big)];
    expect(selectExpiredRecordings(metas, BOUNDED, 3)).toEqual([2]);
  });

  it('本数だけを決めたら容量では捨てないこと', () => {
    const metas = Array.from({ length: 3 }, (_, index) => meta(index + 1, (index + 1) * 100, 8 * 1024 * MEGA_BYTE));
    expect(selectExpiredRecordings(metas, { maxCount: 5, maxTotalBytes: null })).toEqual([]);
  });

  it('空なら何も捨てないこと', () => {
    expect(selectExpiredRecordings([])).toEqual([]);
  });
});
