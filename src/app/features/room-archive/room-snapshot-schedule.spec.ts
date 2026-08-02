import {
  SNAPSHOT_IDLE_DELAY_MS,
  SNAPSHOT_MAX_DELAY_MS,
  snapshotDelays,
} from '@axe/features/room-archive/room-snapshot-schedule';

describe('snapshotDelays()', () => {
  it('軽い部屋では既定の間隔を使うこと', () => {
    expect(snapshotDelays(0)).toEqual({ idle: SNAPSHOT_IDLE_DELAY_MS, max: SNAPSHOT_MAX_DELAY_MS });
    expect(snapshotDelays(300)).toEqual({ idle: SNAPSHOT_IDLE_DELAY_MS, max: SNAPSHOT_MAX_DELAY_MS });
  });

  it('保存に 1 秒以上かかる部屋では間隔を 3 倍にすること', () => {
    expect(snapshotDelays(1_500)).toEqual({ idle: SNAPSHOT_IDLE_DELAY_MS * 3, max: SNAPSHOT_MAX_DELAY_MS * 3 });
  });

  it('保存に 3 秒以上かかる部屋では間隔を 6 倍にすること', () => {
    expect(snapshotDelays(9_000)).toEqual({ idle: SNAPSHOT_IDLE_DELAY_MS * 6, max: SNAPSHOT_MAX_DELAY_MS * 6 });
  });
});
