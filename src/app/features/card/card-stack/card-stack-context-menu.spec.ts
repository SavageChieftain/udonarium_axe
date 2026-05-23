import { CardStack } from '@axe/domain/card/card-stack';
import { buildCardStackContextMenu } from '@axe/features/card/card-stack/card-stack-context-menu';
import { createSyncTranslate } from '@axe/testing/transloco-testing';

const t = createSyncTranslate('ja');

describe('buildCardStackContextMenu', () => {
  it('１枚引くの直下にX枚を引くを追加し、選択時に複数枚ドロー処理を呼ぶこと', () => {
    const cardStack = CardStack.create('test stack');
    const onDrawCard = vi.fn();
    const onDrawCards = vi.fn();

    try {
      const actions = buildCardStackContextMenu(cardStack, 50, onDrawCard, onDrawCards, vi.fn(), vi.fn(), vi.fn(), t);
      const drawIndex = actions.findIndex((action) => action.name === '１枚引く');

      expect(drawIndex).toBeGreaterThanOrEqual(0);
      expect(actions[drawIndex + 1].name).toBe('X枚を引く');

      actions[drawIndex + 1].action?.();

      expect(onDrawCards).toHaveBeenCalledOnce();
    } finally {
      cardStack.destroy();
    }
  });

  it('カード一覧 entry is no longer present (folded into 詳細を表示)', () => {
    const cardStack = CardStack.create('test stack');
    try {
      const actions = buildCardStackContextMenu(cardStack, 50, vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn(), t);
      expect(actions.some((action) => action.name === 'カード一覧')).toBe(false);
    } finally {
      cardStack.destroy();
    }
  });
});
