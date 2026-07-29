import { TurnPhase } from '@axe/domain/tabletop/turn-state';

export interface TurnIndicator {
  readonly round: number;
  readonly statusKey: string | null;
  readonly name: string;
}

export function buildTurnIndicator(phase: TurnPhase, round: number, currentName: string): TurnIndicator | null {
  if (phase === 'idle') return null;

  switch (phase) {
    case 'roundStart':
      return { round, statusKey: 'feature.turnOrder.beforeRound', name: '' };
    case 'roundEnd':
      return { round, statusKey: 'feature.turnOrder.afterRound', name: '' };
    default:
      return currentName.length
        ? { round, statusKey: null, name: currentName }
        : { round, statusKey: 'feature.turnOrder.noTurn', name: '' };
  }
}
