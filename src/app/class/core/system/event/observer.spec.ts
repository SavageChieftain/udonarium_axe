import type { Callback, EventMap } from './observer';

describe('Observer interfaces', () => {
  it('Callback型が関数型として使用可能', () => {
    const cb: Callback<string> = (_event) => {};
    expect(typeof cb).toBe('function');
  });

  it('EventMap型のキーが定義されている', () => {
    const keys: (keyof EventMap)[] = [
      'OPEN_NETWORK',
      'CLOSE_NETWORK',
      'NETWORK_ERROR',
      'CONNECT_PEER',
      'DISCONNECT_PEER',
      'UPDATE_GAME_OBJECT',
      'DELETE_GAME_OBJECT',
    ];
    expect(keys).toHaveLength(7);
  });
});
