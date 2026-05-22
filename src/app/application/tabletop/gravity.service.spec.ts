import { TestBed } from '@angular/core/testing';
import { GravityService } from '@axe/application/tabletop/gravity.service';
import { TabletopOverlapRegistryEntry } from '@axe/application/ui/tabletop-overlap.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';
import { Terrain } from '@axe/domain/tabletop/terrain';

beforeEach(() => {
  TestBed.configureTestingModule({});
  const store = ObjectStore.instance;
  for (const obj of store.getObjects()) store.delete(obj, false);
  store.clearDeleteHistory();
});

function makeTerrain(opts: {
  x: number;
  y: number;
  w: number;
  d: number;
  h: number;
  altitude?: number;
  posZ?: number;
  identifier?: string;
}): TabletopOverlapRegistryEntry {
  const terrain = Terrain.create('t', opts.w, opts.d, opts.h, '', '', opts.identifier ?? `terrain_${opts.x}_${opts.y}`);
  terrain.location.x = opts.x;
  terrain.location.y = opts.y;
  terrain.posZ = opts.posZ ?? 0;
  void terrain.altitude;
  terrain.altitude = opts.altitude ?? 0;
  const element = document.createElement('div');
  Object.defineProperty(element, 'offsetWidth', { value: opts.w * 50, configurable: true });
  Object.defineProperty(element, 'offsetHeight', { value: opts.d * 50, configurable: true });
  return { object: terrain, element };
}

function makeCharacter(opts: {
  x: number;
  y: number;
  size?: number;
  altitude?: number;
  posZ?: number;
  identifier?: string;
}): TabletopOverlapRegistryEntry {
  const character = GameCharacter.create('c', opts.size ?? 1, '');
  if (opts.identifier) {
    (character as unknown as { identifier: string }).identifier = opts.identifier;
  }
  character.location.x = opts.x;
  character.location.y = opts.y;
  character.posZ = opts.posZ ?? 0;
  void character.altitude;
  character.altitude = opts.altitude ?? 0;
  const size = (opts.size ?? 1) * 50;
  const element = document.createElement('div');
  Object.defineProperty(element, 'offsetWidth', { value: size, configurable: true });
  Object.defineProperty(element, 'offsetHeight', { value: size, configurable: true });
  return { object: character, element };
}

describe('GravityService.topZ', () => {
  it('地形の top は (altitude + height) * gridSize + posZ', () => {
    const entry = makeTerrain({ x: 0, y: 0, w: 1, d: 1, h: 2, altitude: 1, posZ: 25 });
    expect(GravityService.topZ(entry.object)).toBe((1 + 2) * 50 + 25);
  });

  it('キャラクタの top は altitude * gridSize + posZ (height 寄与なし)', () => {
    const entry = makeCharacter({ x: 0, y: 0, altitude: 1, posZ: 10 });
    expect(GravityService.topZ(entry.object)).toBe(1 * 50 + 10);
  });
});

describe('GravityService.findSupportZ', () => {
  it('対象の中心が他オブジェクトの footprint 内にあれば topZ を支台として返す', () => {
    const base = makeTerrain({ x: 0, y: 0, w: 4, d: 4, h: 2, identifier: 'base' });
    const target = makeTerrain({ x: 50, y: 50, w: 1, d: 1, h: 1, identifier: 'target', posZ: 100 });
    const z = GravityService.findSupportZ(target, [base, target]);
    expect(z).toBe(2 * 50);
  });

  it('複数の支台候補があれば最も高い topZ を採用する', () => {
    const low = makeTerrain({ x: 0, y: 0, w: 4, d: 4, h: 1, identifier: 'low' });
    const high = makeTerrain({ x: 0, y: 0, w: 4, d: 4, h: 3, identifier: 'high' });
    const target = makeTerrain({ x: 50, y: 50, w: 1, d: 1, h: 1, identifier: 'target', posZ: 200 });
    const z = GravityService.findSupportZ(target, [low, high, target]);
    expect(z).toBe(3 * 50);
  });

  it('footprint がずれて中心が外なら支台候補に含めない', () => {
    const base = makeTerrain({ x: 0, y: 0, w: 1, d: 1, h: 2, identifier: 'base' });
    const target = makeTerrain({ x: 500, y: 500, w: 1, d: 1, h: 1, identifier: 'target', posZ: 100 });
    const z = GravityService.findSupportZ(target, [base, target]);
    expect(z).toBe(0);
  });

  it('対象自身は支台候補にしない', () => {
    const target = makeTerrain({ x: 0, y: 0, w: 1, d: 1, h: 2, identifier: 'target', posZ: 100 });
    const z = GravityService.findSupportZ(target, [target]);
    expect(z).toBe(0);
  });
});

describe('GravityService.isAffectedByGravity', () => {
  it('Terrain は対象', () => {
    const entry = makeTerrain({ x: 0, y: 0, w: 1, d: 1, h: 1 });
    expect(GravityService.isAffectedByGravity(entry.object)).toBe(true);
  });

  it('GameCharacter は対象', () => {
    const entry = makeCharacter({ x: 0, y: 0 });
    expect(GravityService.isAffectedByGravity(entry.object)).toBe(true);
  });

  it('それ以外の TabletopObject は対象外', () => {
    const obj = { identifier: 'x', altitude: 0, posZ: 0 } as unknown as TabletopObject;
    expect(GravityService.isAffectedByGravity(obj)).toBe(false);
  });
});
