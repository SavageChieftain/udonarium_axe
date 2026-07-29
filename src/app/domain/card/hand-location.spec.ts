import { handHolderOf, handLocationOf, isHandLocation, isHandOf } from '@axe/domain/card/hand-location';
import { describe, expect, it } from 'vitest';

describe('hand-location', () => {
  it('userId から手札の置き場所を作る', () => {
    expect(handLocationOf('u1')).toBe('hand:u1');
  });

  it('手札の置き場所を判別する', () => {
    expect(isHandLocation('hand:u1')).toBe(true);
    expect(isHandLocation('table')).toBe(false);
    expect(isHandLocation('graveyard')).toBe(false);
    expect(isHandLocation('common')).toBe(false);
  });

  it('持ち主のいない置き場所は手札とみなさない', () => {
    expect(isHandLocation('hand:')).toBe(false);
    expect(handHolderOf('hand:')).toBeNull();
  });

  it('置き場所から持ち主を取り出す', () => {
    expect(handHolderOf('hand:u1')).toBe('u1');
    expect(handHolderOf('table')).toBeNull();
  });

  it('特定の参加者の手札かを判定する', () => {
    expect(isHandOf('hand:u1', 'u1')).toBe(true);
    expect(isHandOf('hand:u1', 'u2')).toBe(false);
    expect(isHandOf('table', 'u1')).toBe(false);
  });

  it('userId が空なら誰の手札でもない', () => {
    expect(isHandOf('hand:', '')).toBe(false);
    expect(isHandOf('hand:u1', '')).toBe(false);
  });
});
