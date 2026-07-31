import { formatSnapshotByteSize, formatSnapshotSavedAt } from '@axe/features/room-archive/snapshot-format';

describe('formatSnapshotSavedAt', () => {
  it('年月日と時刻を 0 埋めで整形する', () => {
    const savedAt = new Date(2026, 6, 3, 9, 5).getTime();
    expect(formatSnapshotSavedAt(savedAt)).toBe('2026/07/03 09:05');
  });

  it('2 桁の月日と時刻をそのまま扱う', () => {
    const savedAt = new Date(2026, 11, 25, 23, 59).getTime();
    expect(formatSnapshotSavedAt(savedAt)).toBe('2026/12/25 23:59');
  });
});

describe('formatSnapshotByteSize', () => {
  it('1KB 未満はバイト表記', () => {
    expect(formatSnapshotByteSize(0)).toBe('0 B');
    expect(formatSnapshotByteSize(1023)).toBe('1023 B');
  });

  it('1MB 未満は KB 表記', () => {
    expect(formatSnapshotByteSize(1024)).toBe('1.0 KB');
    expect(formatSnapshotByteSize(1536)).toBe('1.5 KB');
  });

  it('1MB 以上は MB 表記', () => {
    expect(formatSnapshotByteSize(1024 * 1024)).toBe('1.0 MB');
    expect(formatSnapshotByteSize(1024 * 1024 * 12.5)).toBe('12.5 MB');
  });
});
