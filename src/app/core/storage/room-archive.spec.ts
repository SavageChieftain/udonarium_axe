import { isCcfoliaRoomArchive } from '@axe/core/storage/room-archive';

describe('isCcfoliaRoomArchive', () => {
  it('recognises an archive carrying room data from the other tool', () => {
    expect(isCcfoliaRoomArchive(['__data.json', '.token', 'aaaa.png'])).toBe(true);
  });

  it('does not mistake its own archive for one', () => {
    expect(isCcfoliaRoomArchive(['data.xml', 'chat.xml', 'config.xml', 'summary.xml'])).toBe(false);
  });

  it('does not mistake an archive of assets for one', () => {
    expect(isCcfoliaRoomArchive(['a.png', 'b.png'])).toBe(false);
    expect(isCcfoliaRoomArchive([])).toBe(false);
  });
});
