import { EventChannel } from '@axe/core/event/event-channel';

describe('EventChannel', () => {
  it('emit でリスナーが呼ばれる', () => {
    const ch = new EventChannel<number>();
    const received: number[] = [];
    ch.subscribe((v) => received.push(v));

    ch.emit(42);

    expect(received).toEqual([42]);
  });

  it('subscribe の戻り値で購読解除できる', () => {
    const ch = new EventChannel<number>();
    const received: number[] = [];
    const unsub = ch.subscribe((v) => received.push(v));

    ch.emit(1);
    unsub();
    ch.emit(2);

    expect(received).toEqual([1]);
  });

  it('listenerCount がリスナー数を返す', () => {
    const ch = new EventChannel<void>();
    expect(ch.listenerCount).toBe(0);

    const unsub = ch.subscribe(() => {});
    expect(ch.listenerCount).toBe(1);

    unsub();
    expect(ch.listenerCount).toBe(0);
  });

  it('emit 中に追加されたリスナーは同じ emit では呼ばれない', () => {
    const ch = new EventChannel<string>();
    const calls: string[] = [];

    ch.subscribe((v) => {
      calls.push('first:' + v);
      // emit 中に新しいリスナーを追加
      ch.subscribe((v2) => {
        calls.push('added:' + v2);
      });
    });

    ch.emit('A');

    // 初回 emit では追加されたリスナーは発火しない
    expect(calls).toEqual(['first:A']);

    // 次の emit では発火する
    ch.emit('B');
    expect(calls).toEqual(['first:A', 'first:B', 'added:B']);
  });

  it('emit 中に解除されたリスナーは呼ばれない', () => {
    const ch = new EventChannel<number>();
    const calls: string[] = [];
    const unsub2Ref = { fn: (() => {}) as () => void };

    ch.subscribe((v) => {
      calls.push('first:' + v);
      unsub2Ref.fn();
    });
    unsub2Ref.fn = ch.subscribe((v) => {
      calls.push('second:' + v);
    });

    ch.emit(1);

    // second は first の中で解除されたので呼ばれない
    expect(calls).toEqual(['first:1']);
  });

  it('void 型のチャネルで引数なしに emit できる', () => {
    const ch = new EventChannel<void>();
    let called = false;
    ch.subscribe(() => {
      called = true;
    });

    ch.emit();

    expect(called).toBe(true);
  });

  it('複数リスナーが登録順で呼ばれる', () => {
    const ch = new EventChannel<void>();
    const order: number[] = [];

    ch.subscribe(() => order.push(1));
    ch.subscribe(() => order.push(2));
    ch.subscribe(() => order.push(3));

    ch.emit();

    expect(order).toEqual([1, 2, 3]);
  });
});
