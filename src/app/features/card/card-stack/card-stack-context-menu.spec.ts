import { CardStack } from '@axe/domain/card/card-stack';
import { buildCardStackContextMenu } from '@axe/features/card/card-stack/card-stack-context-menu';
import { createSyncTranslate } from '@axe/testing/transloco-testing';

const t = createSyncTranslate('ja');

describe('buildCardStackContextMenu', () => {
  it('１枚引くの直下に手札へ引く・X枚を引くを並べ、選択時にそれぞれの処理を呼ぶこと', () => {
    const cardStack = CardStack.create('test stack');
    const onDrawCard = vi.fn();
    const onDrawToHand = vi.fn();
    const onDrawCards = vi.fn();

    try {
      const actions = buildCardStackContextMenu(
        cardStack,
        50,
        onDrawCard,
        onDrawToHand,
        onDrawCards,
        vi.fn(),
        vi.fn(),
        vi.fn(),
        vi.fn(),
        vi.fn(),
        t
      );
      const drawIndex = actions.findIndex((action) => action.name === '１枚引く');

      expect(drawIndex).toBeGreaterThanOrEqual(0);
      expect(actions[drawIndex + 1].name).toBe('１枚引いて手札に加える');
      expect(actions[drawIndex + 2].name).toBe('X枚を引く');

      actions[drawIndex + 1].action?.();
      actions[drawIndex + 2].action?.();

      expect(onDrawToHand).toHaveBeenCalledOnce();
      expect(onDrawCards).toHaveBeenCalledOnce();
    } finally {
      cardStack.destroy();
    }
  });

  it('全員に配り切る entry が山札を分割する項目の前に並ぶこと', () => {
    const cardStack = CardStack.create('test stack');
    try {
      const actions = buildCardStackContextMenu(
        cardStack,
        50,
        vi.fn(),
        vi.fn(),
        vi.fn(),
        vi.fn(),
        vi.fn(),
        vi.fn(),
        vi.fn(),
        vi.fn(),
        t
      );
      const dealIndex = actions.findIndex((action) => action.name === '全員に配り切る');

      expect(dealIndex).toBeGreaterThanOrEqual(0);
      expect(actions[dealIndex + 1].name).toBe('山札を人数分に分割する');
    } finally {
      cardStack.destroy();
    }
  });

  it('カード一覧 entry is no longer present (folded into 詳細を表示)', () => {
    const cardStack = CardStack.create('test stack');
    try {
      const actions = buildCardStackContextMenu(
        cardStack,
        50,
        vi.fn(),
        vi.fn(),
        vi.fn(),
        vi.fn(),
        vi.fn(),
        vi.fn(),
        vi.fn(),
        vi.fn(),
        t
      );
      expect(actions.some((action) => action.name === 'カード一覧')).toBe(false);
    } finally {
      cardStack.destroy();
    }
  });
});
