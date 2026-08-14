import {
  SNAPSHOT_IDLE_DELAY_MS,
  SNAPSHOT_MAX_DELAY_MS,
  snapshotDelays,
} from '@axe/features/room-archive/room-snapshot-schedule';

describe('snapshotDelays()', () => {
  it('keeps the usual interval in a light room', () => {
    expect(snapshotDelays(0)).toEqual({ idle: SNAPSHOT_IDLE_DELAY_MS, max: SNAPSHOT_MAX_DELAY_MS });
    expect(snapshotDelays(300)).toEqual({ idle: SNAPSHOT_IDLE_DELAY_MS, max: SNAPSHOT_MAX_DELAY_MS });
  });

  it('triples it once a save takes a second', () => {
    expect(snapshotDelays(1_500)).toEqual({ idle: SNAPSHOT_IDLE_DELAY_MS * 3, max: SNAPSHOT_MAX_DELAY_MS * 3 });
  });

  it('sextuples it once a save takes three', () => {
    expect(snapshotDelays(9_000)).toEqual({ idle: SNAPSHOT_IDLE_DELAY_MS * 6, max: SNAPSHOT_MAX_DELAY_MS * 6 });
  });
});
