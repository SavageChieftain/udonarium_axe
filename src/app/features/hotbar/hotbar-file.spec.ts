import { TestBed } from '@angular/core/testing';
import { HotbarStoreService } from '@axe/application/hotbar/hotbar-store.service';
import { TabletopService } from '@axe/application/tabletop/tabletop.service';
import { FileArchiver } from '@axe/core/storage/file-archiver';
import { ObjectSerializer } from '@axe/core/sync/object-serializer';
import { ObjectStore } from '@axe/core/sync/object-store';
import { Hotbar } from '@axe/domain/hotbar/hotbar';
import { emptyHotbarSlotDraft } from '@axe/domain/hotbar/hotbar-draft';
import { HotbarSet } from '@axe/domain/hotbar/hotbar-set';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';
import { strToU8, zip } from 'fflate';

/** The archive a saved bar comes in: one data.xml, as every other saved object is packed. */
async function archiveOf(xml: string): Promise<File> {
  const packed = await new Promise<Uint8Array>((resolve, reject) => {
    zip({ 'data.xml': strToU8(xml) }, (reason, data) => (reason ? reject(reason) : resolve(data)));
  });
  return new File([packed.slice()], 'hotbar.zip', { type: 'application/zip' });
}

describe('reading a saved bar back in from its file', () => {
  const store = ObjectStore.instance;
  let hotbarStore: HotbarStoreService;

  beforeEach(() => {
    localStorage.removeItem('ui-hotbar-owner');
    TestBed.configureTestingModule({ providers: [...TEST_PROVIDERS] });
    hotbarStore = TestBed.inject(HotbarStoreService);
    // The tabletop is what listens for a loaded file and hands the XML to the serializer.
    TestBed.inject(TabletopService);
  });

  afterEach(() => {
    store.getObjects().forEach((object) => store.delete(object, false));
    store.clearDeleteHistory();
    localStorage.removeItem('ui-hotbar-owner');
  });

  it('lands the slots of the file in the reader own bar', async () => {
    const donor = new Hotbar('Hotbar_someone-else');
    donor.ownerUserId = 'someone-else';
    donor.initialize();
    const draft = emptyHotbarSlotDraft('chat');
    draft.value = '2d6+3 攻撃';
    draft.label = '全力攻撃';
    donor.put(1, 4, draft);
    const xml = ObjectSerializer.instance.toXml(HotbarSet.of(donor));

    await TestBed.inject(FileArchiver).load([await archiveOf(xml)]);

    const mine = hotbarStore.own();
    expect(mine?.ownerUserId).toBe(hotbarStore.ownerId);
    expect(mine?.slotAt(1, 4)?.argument).toBe('2d6+3 攻撃');
    expect(mine?.slotAt(1, 4)?.label).toBe('全力攻撃');
  });

  it('keeps what it displaced, so a file dropped by mistake can be taken back', async () => {
    const standing = emptyHotbarSlotDraft('chat');
    standing.value = '前の卓のマクロ';
    hotbarStore.ensureOwn()!.put(0, 0, standing);

    const donor = new Hotbar('Hotbar_donor');
    donor.initialize();
    const carried = emptyHotbarSlotDraft('chat');
    carried.value = '新しい卓のマクロ';
    donor.put(0, 1, carried);
    const xml = ObjectSerializer.instance.toXml(HotbarSet.of(donor));

    await TestBed.inject(FileArchiver).load([await archiveOf(xml)]);

    const mine = hotbarStore.own()!;
    expect(mine.slotAt(0, 0)).toBeNull();
    expect(mine.hasDisplaced).toBe(true);

    mine.restoreDisplaced();
    expect(mine.slotAt(0, 0)?.argument).toBe('前の卓のマクロ');
  });
});
