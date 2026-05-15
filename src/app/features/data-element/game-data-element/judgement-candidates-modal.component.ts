import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { type SkillJudgementCandidate } from '@axe/domain/data/skill-table-judgement';

export interface JudgeCandidatesState {
  clickedCellLabel: string;
  candidates: SkillJudgementCandidate[];
}

@Component({
  selector: 'judgement-candidates-modal',
  templateUrl: './judgement-candidates-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JudgementCandidatesModalComponent {
  readonly state = input<JudgeCandidatesState | null>(null);
  readonly closed = output<void>();
  readonly sendToChat = output<SkillJudgementCandidate>();

  onClose(): void {
    this.closed.emit();
  }

  onSendToChat(candidate: SkillJudgementCandidate, event: Event): void {
    event.stopPropagation();
    this.sendToChat.emit(candidate);
  }
}
