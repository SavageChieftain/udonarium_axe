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
  it('places an event by how far into the recording it falls', () => {
    const events = [event(1, 0), event(2, 1000), event(3, 4000)];
    expect(replayTimelinePosition(events, 0)).toBe(0);
    expect(replayTimelinePosition(events, 1)).toBe(0.25);
    expect(replayTimelinePosition(events, 2)).toBe(1);
  });

  it('pulls anything outside the range to an end', () => {
    const events = [event(1, 0), event(2, 1000)];
    expect(replayTimelinePosition(events, -5)).toBe(0);
    expect(replayTimelinePosition(events, 99)).toBe(1);
  });

  it('spaces events out evenly even when they fall at one moment', () => {
    const events = [event(1, 500), event(2, 500), event(3, 500)];
    expect(replayTimelinePosition(events, 1)).toBe(0.5);
  });

  it('puts a lone event at the start', () => {
    expect(replayTimelinePosition([event(1, 900)], 0)).toBe(0);
    expect(replayTimelinePosition([], 0)).toBe(0);
  });
});

describe('replayTimelineIndexAt()', () => {
  const events = [event(1, 0), event(2, 1000), event(3, 8000), event(4, 10_000)];

  it('returns the nearest event', () => {
    expect(replayTimelineIndexAt(events, 0)).toBe(0);
    expect(replayTimelineIndexAt(events, 0.09)).toBe(1);
    expect(replayTimelineIndexAt(events, 0.4)).toBe(1);
    expect(replayTimelineIndexAt(events, 0.5)).toBe(2);
    expect(replayTimelineIndexAt(events, 1)).toBe(3);
  });

  it('makes the round trip to where the handle is held', () => {
    for (let index = 0; index < events.length; index += 1) {
      expect(replayTimelineIndexAt(events, replayTimelinePosition(events, index))).toBe(index);
    }
  });

  it('pulls anything outside the range to an end', () => {
    expect(replayTimelineIndexAt(events, -1)).toBe(0);
    expect(replayTimelineIndexAt(events, 5)).toBe(3);
  });

  it('still tells them apart at one moment', () => {
    const flat = [event(1, 7), event(2, 7), event(3, 7)];
    expect(replayTimelineIndexAt(flat, 1)).toBe(2);
  });
});

describe('buildReplayTimeline()', () => {
  it('returns the busy stretches as peaks', () => {
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

  it('jumps to the first event of a peak', () => {
    const events = [event(1, 0), event(2, 5000), event(3, 5100), event(4, 10_000)];
    const timeline = buildReplayTimeline(events, 4);

    expect(timeline.buckets[0].index).toBe(0);
    expect(timeline.buckets[2].index).toBe(1);
    expect(timeline.buckets[3].index).toBe(3);
  });

  it('points at the nearest event even for an empty peak', () => {
    const events = [event(1, 0), event(2, 10_000)];
    const timeline = buildReplayTimeline(events, 4);

    expect(timeline.buckets[1].count).toBe(0);
    expect(timeline.buckets[1].index).toBe(0);
    expect(timeline.buckets[2].index).toBe(1);
  });

  it('returns the markers as chapters', () => {
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

  it('returns nothing for nothing', () => {
    expect(buildReplayTimeline([])).toBe(EMPTY_REPLAY_TIMELINE);
    expect(buildReplayTimeline([event(1, 0)], 0)).toBe(EMPTY_REPLAY_TIMELINE);
  });
});
