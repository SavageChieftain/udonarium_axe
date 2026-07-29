import { buildTurnIndicator } from '@axe/ui/turn/turn-indicator';
import { describe, expect, it } from 'vitest';

describe('buildTurnIndicator', () => {
  it('戦闘が始まっていなければ何も表示しない', () => {
    expect(buildTurnIndicator('idle', 0, '')).toBeNull();
  });

  it('ラウンド開始・終了はキャラ名ではなく状態を出す', () => {
    expect(buildTurnIndicator('roundStart', 3, '')).toEqual({
      round: 3,
      statusKey: 'feature.turnOrder.beforeRound',
      name: '',
    });
    expect(buildTurnIndicator('roundEnd', 3, '')).toEqual({
      round: 3,
      statusKey: 'feature.turnOrder.afterRound',
      name: '',
    });
  });

  it('行動中は手番のキャラ名を出す', () => {
    expect(buildTurnIndicator('acting', 2, 'エクィテス')).toEqual({
      round: 2,
      statusKey: null,
      name: 'エクィテス',
    });
  });

  it('行動中でも手番のキャラが特定できなければ状態を出す', () => {
    expect(buildTurnIndicator('acting', 2, '')).toEqual({
      round: 2,
      statusKey: 'feature.turnOrder.noTurn',
      name: '',
    });
  });
});
