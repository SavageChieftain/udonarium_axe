import { PUBLIC_VISIBILITY, type ReplayEvent, ReplayEventKind } from '@axe/domain/replay/replay-event';
import {
  buildReplayTimeline,
  EMPTY_REPLAY_TIMELINE,
  replayTimelineIndexAt,
  replayTimelinePosition,
} from '@axe/features/replay/replay-timeline';

function event(
  seq: number,
  t: number,
  kind: ReplayEventKind = ReplayEventKind.ChatMessage,
  label?: string
): ReplayEvent {
  return {
    seq,
    at: t,
    t,
    kind,
    actorId: 'alice',
    detail: label === undefined ? {} : { label },
    visibility: PUBLIC_VISIBILITY,
  };
}

describe('replayTimelinePosition()', () => {
  it('経過時間で置くこと', () => {
    const events = [event(1, 0), event(2, 1000), event(3, 4000)];
    expect(replayTimelinePosition(events, 0)).toBe(0);
    expect(replayTimelinePosition(events, 1)).toBe(0.25);
    expect(replayTimelinePosition(events, 2)).toBe(1);
  });

  it('範囲の外は端に寄せること', () => {
    const events = [event(1, 0), event(2, 1000)];
    expect(replayTimelinePosition(events, -5)).toBe(0);
    expect(replayTimelinePosition(events, 99)).toBe(1);
  });

  it('同じ時刻に固まっていても等間隔に置くこと', () => {
    const events = [event(1, 500), event(2, 500), event(3, 500)];
    expect(replayTimelinePosition(events, 1)).toBe(0.5);
  });

  it('1 件だけなら先頭に置くこと', () => {
    expect(replayTimelinePosition([event(1, 900)], 0)).toBe(0);
    expect(replayTimelinePosition([], 0)).toBe(0);
  });
});

describe('replayTimelineIndexAt()', () => {
  const events = [event(1, 0), event(2, 1000), event(3, 8000), event(4, 10_000)];

  it('いちばん近い出来事を返すこと', () => {
    expect(replayTimelineIndexAt(events, 0)).toBe(0);
    expect(replayTimelineIndexAt(events, 0.09)).toBe(1);
    expect(replayTimelineIndexAt(events, 0.4)).toBe(1);
    expect(replayTimelineIndexAt(events, 0.5)).toBe(2);
    expect(replayTimelineIndexAt(events, 1)).toBe(3);
  });

  it('つまみを掴む位置と往復できること', () => {
    for (let index = 0; index < events.length; index += 1) {
      expect(replayTimelineIndexAt(events, replayTimelinePosition(events, index))).toBe(index);
    }
  });

  it('範囲の外は端に寄せること', () => {
    expect(replayTimelineIndexAt(events, -1)).toBe(0);
    expect(replayTimelineIndexAt(events, 5)).toBe(3);
  });

  it('同じ時刻に固まっていても割り当てること', () => {
    const flat = [event(1, 7), event(2, 7), event(3, 7)];
    expect(replayTimelineIndexAt(flat, 1)).toBe(2);
  });
});

describe('buildReplayTimeline()', () => {
  it('賑わいを山として返すこと', () => {
    const events = [event(1, 0), event(2, 10), event(3, 20), event(4, 10_000)];
    const timeline = buildReplayTimeline(events, 4);

    expect(timeline.buckets).toHaveLength(4);
    expect(timeline.buckets[0].count).toBe(3);
    expect(timeline.buckets[0].ratio).toBe(1);
    expect(timeline.buckets[1].count).toBe(0);
    expect(timeline.buckets[1].ratio).toBe(0);
    expect(timeline.buckets[3].count).toBe(1);
    expect(timeline.buckets[3].ratio).toBeCloseTo(1 / 3);
  });

  it('山を掴めば最初の出来事へ飛べること', () => {
    const events = [event(1, 0), event(2, 5000), event(3, 5100), event(4, 10_000)];
    const timeline = buildReplayTimeline(events, 4);

    expect(timeline.buckets[0].index).toBe(0);
    expect(timeline.buckets[2].index).toBe(1);
    expect(timeline.buckets[3].index).toBe(3);
  });

  it('空の山でも近い出来事を指すこと', () => {
    const events = [event(1, 0), event(2, 10_000)];
    const timeline = buildReplayTimeline(events, 4);

    expect(timeline.buckets[1].count).toBe(0);
    expect(timeline.buckets[1].index).toBe(0);
    expect(timeline.buckets[2].index).toBe(1);
  });

  it('目印を章として返すこと', () => {
    const events = [
      event(1, 0),
      event(2, 5000, ReplayEventKind.Marker, ' 第一幕 '),
      event(3, 10_000, ReplayEventKind.Marker, '第二幕'),
    ];
    const timeline = buildReplayTimeline(events, 4);

    expect(timeline.chapters).toEqual([
      { index: 1, label: '第一幕', at: 0.5 },
      { index: 2, label: '第二幕', at: 1 },
    ]);
  });

  it('何も無ければ空を返すこと', () => {
    expect(buildReplayTimeline([])).toBe(EMPTY_REPLAY_TIMELINE);
    expect(buildReplayTimeline([event(1, 0)], 0)).toBe(EMPTY_REPLAY_TIMELINE);
  });
});
