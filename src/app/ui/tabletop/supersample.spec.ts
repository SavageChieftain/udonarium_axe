import {
  SUPERSAMPLE_MAX_FACTOR,
  supersampleFactor,
  supersampleInsetPercent,
  supersampleOffsetPercent,
  supersampleTransform,
} from '@axe/ui/tabletop/supersample';
import { describe, expect, it } from 'vitest';

describe('supersampleFactor', () => {
  it('leaves the scale alone when the source matches the layout box', () => {
    expect(supersampleFactor(50, 50)).toBe(1);
    expect(supersampleFactor(99, 50)).toBe(1);
  });

  it('raises the scale only as far as the source pixels allow', () => {
    expect(supersampleFactor(100, 50)).toBe(2);
    expect(supersampleFactor(150, 50)).toBe(3);
  });

  it('stays within the scale ceiling', () => {
    expect(supersampleFactor(4000, 50)).toBe(SUPERSAMPLE_MAX_FACTOR);
  });

  it('stays within the texture size ceiling', () => {
    expect(supersampleFactor(4000, 200, 4, 512)).toBe(2);
  });

  it('leaves the scale alone for nonsense dimensions', () => {
    expect(supersampleFactor(0, 50)).toBe(1);
    expect(supersampleFactor(1000, 0)).toBe(1);
    expect(supersampleFactor(Number.NaN, 50)).toBe(1);
    expect(supersampleFactor(1000, Number.POSITIVE_INFINITY)).toBe(1);
  });
});

describe('supersampleOffsetPercent', () => {
  it('shifts nothing at a scale of one', () => {
    expect(supersampleOffsetPercent(1)).toBe(0);
  });

  it('reports the centre offset between the grown box and the original, relative to the box', () => {
    expect(supersampleOffsetPercent(2)).toBe(25);
    expect(supersampleOffsetPercent(4)).toBe(37.5);
  });
});

describe('supersampleInsetPercent', () => {
  it('leaves the margins alone at a scale of one', () => {
    expect(supersampleInsetPercent(1)).toBe(0);
  });

  it('reports the negative margin that keeps the grown box concentric, relative to the containing block', () => {
    expect(supersampleInsetPercent(2)).toBe(-50);
    expect(supersampleInsetPercent(4)).toBe(-150);
  });
});

describe('supersampleTransform', () => {
  it('returns the transform unchanged at a scale of one', () => {
    expect(
      supersampleTransform({ factor: 1, anchor: 'bottom', outer: 'translateX(-50%)', inner: 'rotateX(-50deg)' })
    ).toBe('translateX(-50%) rotateX(-50deg)');
  });

  it('lifts a box grown downward inside a fixed-height parent so its bottom lines up once scaled back', () => {
    expect(
      supersampleTransform({ factor: 4, anchor: 'bottom', outer: 'translateX(-50%)', inner: 'rotateX(-50deg)' })
    ).toBe('translateX(-50%) translateY(-37.5%) rotateX(-50deg) scale(0.25)');
  });

  it('lines the bottom up at a scale of two as well', () => {
    expect(supersampleTransform({ factor: 2, anchor: 'bottom' })).toBe('translateY(-25%) scale(0.5)');
  });

  it('lifts a top-anchored box that grew downward', () => {
    expect(supersampleTransform({ factor: 2, anchor: 'top', inner: 'rotateZ(10deg)' })).toBe(
      'translateY(-25%) rotateZ(10deg) scale(0.5)'
    );
  });

  it('only scales a box that is already concentric', () => {
    expect(supersampleTransform({ factor: 3, anchor: 'center' })).toBe('scale(0.333333)');
  });
});
