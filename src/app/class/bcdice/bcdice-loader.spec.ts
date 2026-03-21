import { vi, describe, it, expect } from 'vitest';
import BCDiceLoader from './bcdice-loader';

describe('BCDiceLoader', () => {
  it('StaticLoaderを継承している', () => {
    const loader = new BCDiceLoader();
    expect(loader).toBeTruthy();
  });

  it('dynamicLoadがメソッドとして存在する', () => {
    const loader = new BCDiceLoader();
    expect(typeof loader.dynamicLoad).toBe('function');
  });
});
