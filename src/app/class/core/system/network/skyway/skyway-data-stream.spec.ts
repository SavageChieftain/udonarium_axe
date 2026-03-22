vi.mock('@skyway-sdk/core', () => ({}));

import { SkyWayDataStream } from './skyway-data-stream';

describe('SkyWayDataStream', () => {
  it('クラスがエクスポートされている', () => {
    expect(SkyWayDataStream).toBeDefined();
  });

  it('EventEmitterを継承している', () => {
    expect(SkyWayDataStream.prototype).toHaveProperty('emit');
    expect(SkyWayDataStream.prototype).toHaveProperty('on');
  });
});
