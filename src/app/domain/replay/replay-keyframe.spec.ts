import { encode } from '@axe/core/util/message-pack';
import { REPLAY_FORMAT_VERSION } from '@axe/domain/replay/replay-event';
import {
  decodeReplayKeyframe,
  encodeReplayKeyframe,
  type ReplayObjectSnapshot,
} from '@axe/domain/replay/replay-keyframe';

const objects: ReplayObjectSnapshot[] = [
  { identifier: 'c1', aliasName: 'character', syncData: { location: { name: 'table', x: 10, y: 20 }, posZ: 0 } },
  { identifier: 'hp1', aliasName: 'data', syncData: { value: 12, currentValue: 7, attributes: { name: 'HP' } } },
];

describe('encodeReplayKeyframe() / decodeReplayKeyframe()', () => {
  it('盤面を識別子ごと往復できること', () => {
    expect(decodeReplayKeyframe(encodeReplayKeyframe(objects))).toEqual(objects);
  });

  it('空の盤面を往復できること', () => {
    expect(decodeReplayKeyframe(encodeReplayKeyframe([]))).toEqual([]);
  });

  it('未対応の書式では空を返すこと', () => {
    expect(decodeReplayKeyframe(encode({ v: REPLAY_FORMAT_VERSION + 1, objects }))).toEqual([]);
  });

  it('壊れた中身を読み飛ばすこと', () => {
    const broken = encode({ v: REPLAY_FORMAT_VERSION, objects: [objects[0], null, { aliasName: 'character' }, 42] });
    expect(decodeReplayKeyframe(broken)).toEqual([objects[0]]);
  });

  it('中身が配列でなければ空を返すこと', () => {
    expect(decodeReplayKeyframe(encode({ v: REPLAY_FORMAT_VERSION }))).toEqual([]);
    expect(decodeReplayKeyframe(encode(null))).toEqual([]);
  });
});
