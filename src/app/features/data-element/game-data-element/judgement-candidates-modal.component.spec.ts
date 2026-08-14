import { ComponentRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DataElement } from '@axe/domain/data/data-element';
import { type SkillJudgementCandidate } from '@axe/domain/data/skill-table-judgement';
import {
  JudgeCandidatesState,
  JudgementCandidatesModalComponent,
} from '@axe/features/data-element/game-data-element/judgement-candidates-modal.component';

function candidate(overrides: Partial<SkillJudgementCandidate> = {}): SkillJudgementCandidate {
  const cell = DataElement.create('skill-cell', '');
  return {
    cell,
    rowName: 'row',
    colName: 'col',
    colLabel: '列',
    cellLabel: '技能',
    distance: 1,
    ...overrides,
  };
}

describe('JudgementCandidatesModalComponent', () => {
  let fixture: ComponentFixture<JudgementCandidatesModalComponent>;
  let component: JudgementCandidatesModalComponent;
  let componentRef: ComponentRef<JudgementCandidatesModalComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [JudgementCandidatesModalComponent] });
    fixture = TestBed.createComponent(JudgementCandidatesModalComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
  });

  it('shows no dialogue while there is nothing to show', () => {
    componentRef.setInput('state', null);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.bg-ui-bg')).toBeNull();
  });

  it('gives each candidate a line', () => {
    const state: JudgeCandidatesState = {
      clickedCellLabel: '攻撃',
      candidates: [candidate({ cellLabel: '剣' }), candidate({ cellLabel: '盾' })],
    };
    componentRef.setInput('state', state);
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('li');
    expect(items.length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('攻撃');
    expect(fixture.nativeElement.textContent).toContain('剣');
    expect(fixture.nativeElement.textContent).toContain('盾');
  });

  it('says so when no learnt skill was found', () => {
    componentRef.setInput('state', { clickedCellLabel: '攻撃', candidates: [] });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('習得済みの技能が見つかりませんでした');
  });

  it('emits a close', () => {
    const closeSpy = vi.fn();
    component.closed.subscribe(closeSpy);

    component.onClose();

    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it('emits the candidate and stops the event going further', () => {
    const sendSpy = vi.fn();
    component.sendToChat.subscribe(sendSpy);
    const c = candidate({ cellLabel: '剣' });
    const event = new MouseEvent('click');
    const stopSpy = vi.spyOn(event, 'stopPropagation');

    component.onSendToChat(c, event);

    expect(stopSpy).toHaveBeenCalled();
    expect(sendSpy).toHaveBeenCalledWith(c);
  });
});
