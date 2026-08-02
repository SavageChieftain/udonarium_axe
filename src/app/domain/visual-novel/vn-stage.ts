import { SyncObject, SyncVar } from '@axe/core/sync/decorator';
import { GameObject } from '@axe/core/sync/game-object';

export type VnStageTransition = 'none' | 'fade' | 'wipe';

export const VN_STAGE_TRANSITIONS: readonly VnStageTransition[] = ['none', 'fade', 'wipe'];

@SyncObject('vn-stage')
export class VnStage extends GameObject {
  @SyncVar() backgroundImageIdentifier = '';
  @SyncVar() transition: VnStageTransition = 'fade';
  @SyncVar() transitionTrigger = 0;
  @SyncVar() isDirected = false;
  @SyncVar() directorPeerId = '';
  @SyncVar() playheadTabIdentifier = '';
  @SyncVar() playheadIdentifier = '';

  startDirecting(peerId: string): void {
    this.directorPeerId = peerId;
    this.isDirected = true;
  }

  stopDirecting(): void {
    this.isDirected = false;
    this.directorPeerId = '';
    this.playheadTabIdentifier = '';
    this.playheadIdentifier = '';
  }

  setPlayhead(tabIdentifier: string, messageIdentifier: string): void {
    this.playheadTabIdentifier = tabIdentifier;
    this.playheadIdentifier = messageIdentifier;
  }

  setBackground(imageIdentifier: string, transition: VnStageTransition = this.transition): void {
    this.transition = transition;
    this.backgroundImageIdentifier = imageIdentifier;
    this.transitionTrigger = this.transitionTrigger + 1;
  }

  clearBackground(): void {
    this.setBackground('');
  }

  playTransition(transition: VnStageTransition = this.transition): void {
    this.transition = transition;
    this.transitionTrigger = this.transitionTrigger + 1;
  }
}
