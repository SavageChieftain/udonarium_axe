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

  it('state が null の間はモーダル DOM を出さない', () => {
    componentRef.setInput('state', null);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.bg-ui-bg')).toBeNull();
  });

  it('候補ありの状態で候補件数分の <li> を描画する', () => {
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

  it('候補 0 件のときは「習得済みの技能が見つかりませんでした」を表示', () => {
    componentRef.setInput('state', { clickedCellLabel: '攻撃', candidates: [] });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('習得済みの技能が見つかりませんでした');
  });

  it('onClose は closed output を emit する', () => {
    const closeSpy = vi.fn();
    component.closed.subscribe(closeSpy);

    component.onClose();

    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it('onSendToChat は sendToChat output を emit し event.stopPropagation を呼ぶ', () => {
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
