import { DataElement, DataElementRole } from '@axe/domain/data/data-element';
import {
  canAcceptChildRole,
  canDropInside,
  canDropStructureElement,
  getElementDepth,
  getSubtreeDepth,
  MAX_STANDARD_DEPTH,
  resolveDropPosition,
} from '@axe/features/data-element/game-data-element/game-data-element-structure-drop';

function makeDetailTree(): {
  detail: DataElement;
  section: DataElement;
  group: DataElement;
  field: DataElement;
} {
  const detail = DataElement.create('detail', '');
  const section = DataElement.create('section', '', { role: DataElementRole.SECTION });
  const group = DataElement.create('group', '', { role: DataElementRole.GROUP });
  const field = DataElement.create('field', '0', { role: DataElementRole.FIELD });
  detail.appendChild(section);
  section.appendChild(group);
  group.appendChild(field);
  return { detail, section, group, field };
}

describe('canDropInside', () => {
  it('FIELD は子を持てない', () => {
    const field = DataElement.create('hp', '0', { role: DataElementRole.FIELD });
    expect(canDropInside(field)).toBe(false);
  });

  it('GROUP / SECTION は子を持てる', () => {
    const group = DataElement.create('g', '', { role: DataElementRole.GROUP });
    const section = DataElement.create('s', '', { role: DataElementRole.SECTION });
    expect(canDropInside(group)).toBe(true);
    expect(canDropInside(section)).toBe(true);
  });
});

describe('canAcceptChildRole', () => {
  it('detail 直下は SECTION のみ', () => {
    const detail = DataElement.create('detail', '');
    expect(canAcceptChildRole(detail, DataElementRole.SECTION)).toBe(true);
    expect(canAcceptChildRole(detail, DataElementRole.GROUP)).toBe(false);
    expect(canAcceptChildRole(detail, DataElementRole.FIELD)).toBe(false);
  });

  it('SECTION 直下は GROUP のみ', () => {
    const section = DataElement.create('s', '', { role: DataElementRole.SECTION });
    expect(canAcceptChildRole(section, DataElementRole.GROUP)).toBe(true);
    expect(canAcceptChildRole(section, DataElementRole.FIELD)).toBe(false);
  });

  it('GROUP は FIELD を受け入れる', () => {
    const { group } = makeDetailTree();
    expect(canAcceptChildRole(group, DataElementRole.FIELD)).toBe(true);
  });

  it('GROUP が深すぎる位置にあるとき GROUP の入れ子は禁止', () => {
    const { detail } = makeDetailTree();
    const s = DataElement.create('s', '', { role: DataElementRole.SECTION });
    const g1 = DataElement.create('g1', '', { role: DataElementRole.GROUP });
    const g2 = DataElement.create('g2', '', { role: DataElementRole.GROUP });
    detail.appendChild(s);
    s.appendChild(g1);
    g1.appendChild(g2);
    expect(canAcceptChildRole(g2, DataElementRole.GROUP)).toBe(false);
  });
});

describe('getElementDepth / getSubtreeDepth', () => {
  it('detail 自身は depth 0、深いほど大きい', () => {
    const { detail, section, group, field } = makeDetailTree();
    expect(getElementDepth(detail)).toBe(0);
    expect(getElementDepth(section)).toBe(0);
    expect(getElementDepth(group)).toBe(1);
    expect(getElementDepth(field)).toBe(2);
  });

  it('葉ノードのサブツリー高さは 0', () => {
    const { field } = makeDetailTree();
    expect(getSubtreeDepth(field)).toBe(0);
  });

  it('section の高さは葉までの最大距離', () => {
    const { section } = makeDetailTree();
    expect(getSubtreeDepth(section)).toBe(2);
  });
});

describe('canDropStructureElement', () => {
  it('自分自身へのドロップは禁止', () => {
    const { group } = makeDetailTree();
    expect(canDropStructureElement(group, group, 'before', 1)).toBe(false);
  });

  it('ドロップ後の深度合計が MAX_STANDARD_DEPTH を超えるなら禁止', () => {
    const dragged = DataElement.create('s', '', { role: DataElementRole.SECTION });
    const child = DataElement.create('g', '', { role: DataElementRole.GROUP });
    const grand = DataElement.create('f', '0', { role: DataElementRole.FIELD });
    dragged.appendChild(child);
    child.appendChild(grand);
    const target = DataElement.create('s2', '', { role: DataElementRole.SECTION });
    expect(canDropStructureElement(dragged, target, 'inside', MAX_STANDARD_DEPTH - 1)).toBe(false);
  });

  it('inside ドロップは fieldRole の整合が必要', () => {
    const detail = DataElement.create('detail', '');
    const section = DataElement.create('s', '', { role: DataElementRole.SECTION });
    detail.appendChild(section);
    const newGroup = DataElement.create('g', '', { role: DataElementRole.GROUP });
    expect(canDropStructureElement(newGroup, section, 'inside', 0)).toBe(true);

    const newField = DataElement.create('f', '0', { role: DataElementRole.FIELD });
    expect(canDropStructureElement(newField, section, 'inside', 0)).toBe(false);
  });

  it('祖先を自分の中にドロップしようとすると禁止 (cycle 防止)', () => {
    const { section, group } = makeDetailTree();
    expect(canDropStructureElement(section, group, 'inside', 1)).toBe(false);
  });
});

describe('resolveDropPosition', () => {
  it('上端付近は before', () => {
    const target = DataElement.create('s', '', { role: DataElementRole.SECTION });
    expect(resolveDropPosition({ top: 100, height: 40 }, 101, target)).toBe('before');
  });

  it('下端付近は after', () => {
    const target = DataElement.create('s', '', { role: DataElementRole.SECTION });
    expect(resolveDropPosition({ top: 100, height: 40 }, 138, target)).toBe('after');
  });

  it('中央は GROUP/SECTION なら inside', () => {
    const target = DataElement.create('s', '', { role: DataElementRole.SECTION });
    expect(resolveDropPosition({ top: 100, height: 40 }, 120, target)).toBe('inside');
  });

  it('中央でも FIELD は inside ではなく after', () => {
    const target = DataElement.create('f', '0', { role: DataElementRole.FIELD });
    expect(resolveDropPosition({ top: 100, height: 40 }, 120, target)).toBe('after');
  });

  it('rect が無いときは fallback', () => {
    const target = DataElement.create('s', '', { role: DataElementRole.SECTION });
    expect(resolveDropPosition(null, 0, target)).toBe('inside');
  });
});
