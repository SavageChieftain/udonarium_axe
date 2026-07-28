import { TestBed } from '@angular/core/testing';
import { ActiveCharacterService } from '@axe/features/pl-tools/active-character.service';
import { beforeEach, describe, expect, it } from 'vitest';

describe('ActiveCharacterService', () => {
  let service: ActiveCharacterService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ActiveCharacterService);
  });

  it('初期状態では操作対象がない', () => {
    expect(service.identifier()).toBeNull();
    expect(service.isActive('a')).toBe(false);
  });

  it('select で操作対象を設定する', () => {
    service.select('a');
    expect(service.identifier()).toBe('a');
    expect(service.isActive('a')).toBe(true);
    expect(service.isActive('b')).toBe(false);
  });

  it('toggle は同じ対象なら解除、別の対象なら乗り換える', () => {
    service.toggle('a');
    expect(service.identifier()).toBe('a');

    service.toggle('a');
    expect(service.identifier()).toBeNull();

    service.toggle('a');
    service.toggle('b');
    expect(service.identifier()).toBe('b');
  });

  it('clear で解除する', () => {
    service.select('a');
    service.clear();
    expect(service.identifier()).toBeNull();
  });
});
