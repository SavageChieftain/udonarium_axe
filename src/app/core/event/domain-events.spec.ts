import {
  alarmPop$,
  alarmTimeUp$,
  cardStackDecreased$,
  emitAlarmPop,
  emitAlarmTimeUp,
  emitCardStackDecreased,
  emitFinishVote,
  emitMessageAdded,
  emitSelectFile,
  emitSelectGameTable,
  emitSendMessage,
  emitStartCutIn,
  emitStopCutInByBgm,
  finishVote$,
  messageAdded$,
  selectFile$,
  selectGameTable$,
  sendMessage$,
  startCutIn$,
  stopCutInByBgm$,
} from '@axe/core/event/domain-events';

describe('domain-events emit→subscribe wiring', () => {
  it('emitSendMessage で sendMessage$ にイベントが届く', () => {
    const received: unknown[] = [];
    const unsub = sendMessage$.subscribe((e) => received.push(e));
    emitSendMessage({ messageIdentifier: 'm1', messageTarget: null });
    unsub();
    expect(received).toEqual([{ messageIdentifier: 'm1', messageTarget: null }]);
  });

  it('emitSelectGameTable で selectGameTable$ にイベントが届く', () => {
    const received: unknown[] = [];
    const unsub = selectGameTable$.subscribe((e) => received.push(e));
    emitSelectGameTable({ identifier: 'table-1' });
    unsub();
    expect(received).toEqual([{ identifier: 'table-1' }]);
  });

  it('emitMessageAdded で messageAdded$ にイベントが届く', () => {
    const received: unknown[] = [];
    const unsub = messageAdded$.subscribe((e) => received.push(e));
    emitMessageAdded({ tabIdentifier: 't1', messageIdentifier: 'm1' });
    unsub();
    expect(received).toHaveLength(1);
  });

  it('emitStartCutIn で startCutIn$ にイベントが届く', () => {
    const received: unknown[] = [];
    const unsub = startCutIn$.subscribe((e) => received.push(e));
    emitStartCutIn({ cutIn: { identifier: 'c1' } });
    unsub();
    expect(received).toHaveLength(1);
  });

  it('emitStopCutInByBgm で stopCutInByBgm$ が voidトリガされる', () => {
    let count = 0;
    const unsub = stopCutInByBgm$.subscribe(() => count++);
    emitStopCutInByBgm();
    emitStopCutInByBgm();
    unsub();
    expect(count).toBe(2);
  });

  it('emitFinishVote で finishVote$ にイベントが届く', () => {
    const received: unknown[] = [];
    const unsub = finishVote$.subscribe((e) => received.push(e));
    emitFinishVote({ text: 'done' });
    unsub();
    expect(received).toEqual([{ text: 'done' }]);
  });

  it('emitAlarmTimeUp / emitAlarmPop で各 channel にイベントが届く', () => {
    const timeUp: unknown[] = [];
    const pop: unknown[] = [];
    const u1 = alarmTimeUp$.subscribe((e) => timeUp.push(e));
    const u2 = alarmPop$.subscribe((e) => pop.push(e));
    emitAlarmTimeUp({ text: 'ring' });
    emitAlarmPop({ title: 'pop', time: 1000 });
    u1();
    u2();
    expect(timeUp).toEqual([{ text: 'ring' }]);
    expect(pop).toEqual([{ title: 'pop', time: 1000 }]);
  });

  it('emitCardStackDecreased で cardStackDecreased$ にイベントが届く', () => {
    const received: unknown[] = [];
    const unsub = cardStackDecreased$.subscribe((e) => received.push(e));
    emitCardStackDecreased({ cardStackIdentifier: 's1', cardIdentifier: 'c1' });
    unsub();
    expect(received).toHaveLength(1);
  });

  it('emitSelectFile で selectFile$ にイベントが届く', () => {
    const received: unknown[] = [];
    const unsub = selectFile$.subscribe((e) => received.push(e));
    emitSelectFile({ fileIdentifier: 'file-1' });
    unsub();
    expect(received).toEqual([{ fileIdentifier: 'file-1' }]);
  });

  it('unsubscribe 後はイベントが届かない', () => {
    let count = 0;
    const unsub = sendMessage$.subscribe(() => count++);
    emitSendMessage({ messageIdentifier: 'a', messageTarget: null });
    unsub();
    emitSendMessage({ messageIdentifier: 'b', messageTarget: null });
    expect(count).toBe(1);
  });
});
