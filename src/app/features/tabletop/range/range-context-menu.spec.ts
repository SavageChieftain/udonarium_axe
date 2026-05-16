import { GameObjectInventoryService } from '@axe/application/inventory/game-object-inventory.service';
import { TabletopActionService } from '@axe/application/tabletop/tabletop-action.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { RangeArea } from '@axe/domain/tabletop/range';
import { buildRangeContextMenu } from '@axe/features/tabletop/range/range-context-menu';
import { createSyncTranslate } from '@axe/testing/transloco-testing';

const t = createSyncTranslate('ja');

describe('buildRangeContextMenu', () => {
  it('形状変更メニューにひし形を表示しないこと', () => {
    const range = RangeArea.create('test', 1, 1, 50);

    try {
      const actions = buildRangeContextMenu(
        range,
        50,
        { x: 0, y: 0, z: 0 },
        ObjectStore.instance,
        { notifyInventoryUpdate: vi.fn() } as unknown as GameObjectInventoryService,
        { makeDefaultContextMenuActions: vi.fn(() => []) } as unknown as TabletopActionService,
        vi.fn(),
        vi.fn(),
        t
      );
      const shapeMenu = actions.find((action) => action.name === '形状変更');

      expect(shapeMenu?.subActions?.map((action) => action.name.replace('✔ ', ''))).not.toContain('ひし形');
    } finally {
      range.destroy();
    }
  });
});
