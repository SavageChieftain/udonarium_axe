import { SyncObject, SyncVar } from '@axe/core/sync/decorator';
import { GameObject } from '@axe/core/sync/game-object';

export type TurnPhase = 'idle' | 'roundStart' | 'acting' | 'roundEnd';

@SyncObject('TurnState')
export class TurnState extends GameObject {
  private static _instance: TurnState;
  static get instance(): TurnState {
    if (!TurnState._instance) {
      TurnState._instance = new TurnState('TurnState');
      TurnState._instance.initialize();
    }
    return TurnState._instance;
  }

  @SyncVar() currentIdentifier: string = '';
  @SyncVar() round: number = 0;
  @SyncVar() phase: TurnPhase = 'idle';
}
