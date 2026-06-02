import { TestBed } from '@angular/core/testing';
import { GravityService } from '@axe/application/tabletop/gravity.service';
import { TabletopOverlapRegistryEntry, TabletopOverlapService } from '@axe/application/ui/tabletop-overlap.service';
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

describe('GravityService.contactTopZ', () => {
  it('床では topZ と同じ (altitude を含む)', () => {
    const entry = makeTerrain({ x: 0, y: 0, w: 1, d: 1, h: 2, altitude: 1, posZ: 25 });
    expect(GravityService.contactTopZ(entry.object, 'floor')).toBe(GravityService.topZ(entry.object));
  });

  it('壁では posZ + 地形の height のみ (altitude は不使用)', () => {
    const entry = makeTerrain({ x: 0, y: 0, w: 1, d: 1, h: 2, altitude: 1, posZ: 25 });
    expect(GravityService.contactTopZ(entry.object, 'north-wall')).toBe(25 + 2 * 50);
  });

  it('壁では地形以外は posZ のみ (奥行きなし)', () => {
    const entry = makeCharacter({ x: 0, y: 0, altitude: 1, posZ: 10 });
    expect(GravityService.contactTopZ(entry.object, 'east-wall')).toBe(10);
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

  it('自分より上にある候補は無視する (相互参照で打ち上がらない)', () => {
    // A が B の上に乗っている: A は posZ=50 で B (height=1) の天面に着地済み
    const lower = makeTerrain({ x: 0, y: 0, w: 1, d: 1, h: 1, identifier: 'lower', posZ: 0 });
    const upper = makeTerrain({ x: 0, y: 0, w: 1, d: 1, h: 1, identifier: 'upper', posZ: 50 });
    // upper の支台は lower の天面 50
    expect(GravityService.findSupportZ(upper, [lower, upper])).toBe(50);
    // lower の支台は地面 0 (upper は lower より上なので候補外)
    expect(GravityService.findSupportZ(lower, [lower, upper])).toBe(0);
  });

  it('地面に同居する 2 つは互いに支台候補にしない', () => {
    const a = makeTerrain({ x: 0, y: 0, w: 1, d: 1, h: 1, identifier: 'a', posZ: 0 });
    const b = makeTerrain({ x: 0, y: 0, w: 1, d: 1, h: 1, identifier: 'b', posZ: 0 });
    expect(GravityService.findSupportZ(a, [a, b])).toBe(0);
    expect(GravityService.findSupportZ(b, [a, b])).toBe(0);
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

describe('GravityService.apply (空間インデックス経由)', () => {
  function setup(entries: TabletopOverlapRegistryEntry[]): GravityService {
    const overlap = TestBed.inject(TabletopOverlapService);
    for (const e of entries) overlap.register(e.object, e.element);
    return TestBed.inject(GravityService);
  }

  function applyNow(svc: GravityService): void {
    (svc as unknown as { apply(): void }).apply();
  }

  it('空中のキャラクタは下にある地形の天面まで落下する', () => {
    const base = makeTerrain({ x: 0, y: 0, w: 4, d: 4, h: 2, identifier: 'base' });
    const char = makeCharacter({ x: 50, y: 50, posZ: 300 });
    const svc = setup([base, char]);

    applyNow(svc);

    expect(char.object.posZ).toBe(2 * 50);
  });

  it('遠く離れた地形は支えにならない (空間インデックスが範囲外を弾く)', () => {
    const base = makeTerrain({ x: 0, y: 0, w: 1, d: 1, h: 2, identifier: 'base' });
    const char = makeCharacter({ x: 2000, y: 2000, posZ: 300 });
    const svc = setup([base, char]);

    applyNow(svc);

    expect(char.object.posZ).toBe(0);
  });

  it('多段スタックでも settling は収束する (再帰的な落下)', () => {
    // base (h=1, top=50) の上に空中の terrain1 (h=1) を置き、その上に空中の char。
    const base = makeTerrain({ x: 0, y: 0, w: 2, d: 2, h: 1, identifier: 'base' });
    const stack = makeTerrain({ x: 0, y: 0, w: 2, d: 2, h: 1, identifier: 'stack', posZ: 300 });
    const char = makeCharacter({ x: 25, y: 25, posZ: 500 });
    const svc = setup([base, stack, char]);

    applyNow(svc);

    // stack は base の上 (50)、char は stack の上 (100)
    expect(stack.object.posZ).toBe(50);
    expect(char.object.posZ).toBe(50 + 50);
  });

  it('大量オブジェクト下でも reflow を強制しない (offsetWidth は apply 中に追加で読まれない)', () => {
    const entries: TabletopOverlapRegistryEntry[] = [];
    const ROWS = 10;
    const COLS = 10;
    for (let i = 0; i < ROWS; i++) {
      for (let j = 0; j < COLS; j++) {
        entries.push(makeTerrain({ x: i * 60, y: j * 60, w: 1, d: 1, h: 1, identifier: `t_${i}_${j}` }));
      }
    }
    // 1 つだけ空中に置く: 中心 (30,30) が terrain(0,0)-(50,50) の真上
    const flying = makeCharacter({ x: 5, y: 5, posZ: 400 });
    entries.push(flying);

    const svc = setup(entries);

    // apply 中に offsetWidth が何度読まれるかを計測 (キャッシュ後は追加読み出しが起きないことを期待)
    let postCacheReads = 0;
    const counted = new WeakSet<HTMLElement>();
    for (const e of entries) {
      const el = e.element;
      const fixed = el.offsetWidth;
      Object.defineProperty(el, 'offsetWidth', {
        configurable: true,
        get() {
          if (counted.has(el)) postCacheReads++;
          counted.add(el);
          return fixed;
        },
      });
    }

    applyNow(svc);

    // 各要素の offsetWidth 読み出しは apply 1 回につき 1 度だけ (キャッシュ構築時のみ)
    expect(postCacheReads).toBe(0);
    expect(flying.object.posZ).toBe(50);
  });

  it('apply 後の microtask 排出が完了すれば再 schedule できる (applying 解除)', async () => {
    const base = makeTerrain({ x: 0, y: 0, w: 1, d: 1, h: 1, identifier: 'base' });
    const char = makeCharacter({ x: 25, y: 25, posZ: 200 });
    const svc = setup([base, char]);

    applyNow(svc);
    expect((svc as unknown as { applying: boolean }).applying).toBe(true);

    // microtask drain を待つ — 実機の peer onmessage / pointerdown が走るタイミング
    await Promise.resolve();
    await Promise.resolve();

    expect((svc as unknown as { applying: boolean }).applying).toBe(false);
  });
});
