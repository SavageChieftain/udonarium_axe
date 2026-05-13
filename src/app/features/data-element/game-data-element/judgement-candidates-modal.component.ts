import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { type SkillJudgementCandidate } from '@axe/domain/data/skill-table-judgement';

/** 表 GAP 判定候補リストの表示状態。 */
export interface JudgeCandidatesState {
  /** クリックしたセルの技能名（表示用） */
  clickedCellLabel: string;
  candidates: SkillJudgementCandidate[];
}

/**
 * GAP 判定候補のモーダル表示専用コンポーネント。状態は親（GameDataElementComponent）から
 * input で受け取り、close / sendToChat の操作は output で親に通知する Pure Presentational。
 *
 * 親から切り出した目的は、約 50 行の HTML と関連ロジックを `game-data-element.component`
 * 本体から分離して責務を明確化するため。判定計算自体は `domain/data/skill-table-judgement.ts`
 * が担う。
 */
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
