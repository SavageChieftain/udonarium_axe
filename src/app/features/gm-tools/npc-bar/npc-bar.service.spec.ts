import { NpcBarService } from '@axe/features/gm-tools/npc-bar/npc-bar.service';

describe('NpcBarService', () => {
  it('open / close / toggle で isOpen を切り替える', () => {
    const service = new NpcBarService();
    expect(service.isOpen()).toBe(false);

    service.open();
    expect(service.isOpen()).toBe(true);

    service.close();
    expect(service.isOpen()).toBe(false);

    service.toggle();
    expect(service.isOpen()).toBe(true);
    service.toggle();
    expect(service.isOpen()).toBe(false);
  });
});
