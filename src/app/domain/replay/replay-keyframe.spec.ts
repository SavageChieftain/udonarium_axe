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
  it('makes the round trip with the board and its identifiers', () => {
    expect(decodeReplayKeyframe(encodeReplayKeyframe(objects))).toEqual(objects);
  });

  it('makes it with an empty board', () => {
    expect(decodeReplayKeyframe(encodeReplayKeyframe([]))).toEqual([]);
  });

  it('returns nothing for a format it does not support', () => {
    expect(decodeReplayKeyframe(encode({ v: REPLAY_FORMAT_VERSION + 1, objects }))).toEqual([]);
  });

  it('passes over broken contents', () => {
    const broken = encode({ v: REPLAY_FORMAT_VERSION, objects: [objects[0], null, { aliasName: 'character' }, 42] });
    expect(decodeReplayKeyframe(broken)).toEqual([objects[0]]);
  });

  it('returns nothing when the contents are not a list', () => {
    expect(decodeReplayKeyframe(encode({ v: REPLAY_FORMAT_VERSION }))).toEqual([]);
    expect(decodeReplayKeyframe(encode(null))).toEqual([]);
  });
});
