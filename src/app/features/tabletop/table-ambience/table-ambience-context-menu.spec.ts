import { TestBed } from '@angular/core/testing';
import { ObjectStore } from '@axe/core/sync/object-store';
import { TableAmbience } from '@axe/domain/tabletop/table-ambience';
import { buildTableAmbienceContextMenu } from '@axe/features/tabletop/table-ambience/table-ambience-context-menu';

const t = ((key: string) => key) as Parameters<typeof buildTableAmbienceContextMenu>[3];

type Menu = ReturnType<typeof buildTableAmbienceContextMenu>;
type SubMenu = { subActions: { name: string; action: () => void }[] };

function findByName(menu: Menu, fragment: string) {
  return menu.find((item) => 'name' in item && item.name.includes(fragment));
}

describe('buildTableAmbienceContextMenu', () => {
  let store: ObjectStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = ObjectStore.instance;
    for (const object of store.getObjects()) store.delete(object, false);
    store.clearDeleteHistory();
  });

  afterEach(() => {
    for (const object of store.getObjects()) store.delete(object, false);
    store.clearDeleteHistory();
    vi.clearAllMocks();
  });

  function makeAmbience(): TableAmbience {
    return TableAmbience.create('毒沼', 'swamp', 4, 4);
  }

  it('種類を選ぶと切り替わること', () => {
    const ambience = makeAmbience();
    const kinds = findByName(
      buildTableAmbienceContextMenu(ambience, 50, () => undefined, t),
      'kind'
    ) as SubMenu;
    kinds.subActions.find((item) => item.name.includes('vent'))!.action();
    expect(ambience.kind).toBe('vent');
  });

  it('いま選ばれている種類に印を付けること', () => {
    const ambience = makeAmbience();
    const kinds = findByName(
      buildTableAmbienceContextMenu(ambience, 50, () => undefined, t),
      'kind'
    ) as SubMenu;
    expect(kinds.subActions.find((item) => item.name.includes('swamp'))!.name.startsWith('✔')).toBe(true);
  });

  it('濃さを選ぶと反映されること', () => {
    const ambience = makeAmbience();
    const density = findByName(
      buildTableAmbienceContextMenu(ambience, 50, () => undefined, t),
      'density'
    ) as SubMenu;
    density.subActions.find((item) => item.name.includes('densityThick'))!.action();
    expect(ambience.density).toBe(1);
  });

  it('広さを変えても中心が動かないこと', () => {
    const ambience = makeAmbience();
    ambience.location.x = 200;
    ambience.location.y = 400;

    const size = findByName(
      buildTableAmbienceContextMenu(ambience, 50, () => undefined, t),
      'size'
    ) as SubMenu;
    size.subActions.find((item) => item.name.startsWith('6') || item.name.includes(' 6 '))!.action();

    expect(ambience.width).toBe(6);
    expect(ambience.location.x).toBe(150);
    expect(ambience.location.y).toBe(350);
  });

  it('設定を開くアクションが呼び出しへ渡ること', () => {
    let opened = 0;
    const menu = buildTableAmbienceContextMenu(makeAmbience(), 50, () => (opened += 1), t);
    (findByName(menu, 'settings') as { action: () => void }).action();
    expect(opened).toBe(1);
  });

  it('削除で ObjectStore から取り除くこと', () => {
    const ambience = makeAmbience();
    const menu = buildTableAmbienceContextMenu(ambience, 50, () => undefined, t);
    (findByName(menu, 'delete') as { action: () => void }).action();
    expect(store.get(ambience.identifier)).toBeNull();
  });
});
