import { isCcfoliaRoomArchive } from '@axe/core/storage/room-archive';

describe('isCcfoliaRoomArchive', () => {
  it('__data.json を含む ZIP をココフォリアのルームデータと判定する', () => {
    expect(isCcfoliaRoomArchive(['__data.json', '.token', 'aaaa.png'])).toBe(true);
  });

  it('AXE 自身の保存 ZIP は判定しない', () => {
    expect(isCcfoliaRoomArchive(['data.xml', 'chat.xml', 'config.xml', 'summary.xml'])).toBe(false);
  });

  it('素材だけの ZIP は判定しない', () => {
    expect(isCcfoliaRoomArchive(['a.png', 'b.png'])).toBe(false);
    expect(isCcfoliaRoomArchive([])).toBe(false);
  });
});
