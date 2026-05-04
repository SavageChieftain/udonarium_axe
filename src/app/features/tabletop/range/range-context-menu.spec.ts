import { ObjectStore } from '@axe/core/sync/object-store';
import { RangeArea } from '@axe/domain/tabletop/range';
import { buildRangeContextMenu } from '@axe/features/tabletop/range/range-context-menu';
import { GameObjectInventoryService } from '@axe/shared/inventory/game-object-inventory.service';
import { TabletopActionService } from '@axe/shared/tabletop/tabletop-action.service';

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
        vi.fn()
      );
      const shapeMenu = actions.find((action) => action.name === '形状変更');

      expect(shapeMenu?.subActions?.map((action) => action.name.replace('✔ ', ''))).not.toContain('ひし形');
    } finally {
      range.destroy();
    }
  });
});
