import { PeerRole } from '@axe/domain/peer/peer-role';
import type { ReplayObjectSnapshot } from '@axe/domain/replay/replay-keyframe';
import { buildReplayVisionScene, replayOverlayPlan, replaySceneViewer } from '@axe/domain/replay/replay-vision-scene';
import { isPointVisible } from '@axe/domain/tabletop/vision-scene';
import { VisionType } from '@axe/domain/tabletop/vision-types';

function snapshot(identifier: string, aliasName: string, syncData: Record<string, unknown> = {}): ReplayObjectSnapshot {
  return { identifier, aliasName, syncData };
}

function table(overrides: Record<string, unknown> = {}): ReplayObjectSnapshot {
  return snapshot('table-1', 'game-table', {
    width: 20,
    height: 20,
    gridSize: 50,
    darknessEnabled: true,
    darknessLevel: 1,
    ambientColor: '#000000',
    globalIllumination: 0,
    ...overrides,
  });
}

function character(identifier: string, overrides: Record<string, unknown> = {}): ReplayObjectSnapshot {
  return snapshot(identifier, 'character', {
    location: { name: 'table', x: 500, y: 500, surface: 'floor' },
    isVisibleOnTable: true,
    ...overrides,
  });
}

describe('buildReplayVisionScene()', () => {
  it('卓が無ければ組めないこと', () => {
    expect(buildReplayVisionScene([])).toBeNull();
  });

  it('卓の暗闇の設定をそのまま持ってくること', () => {
    const scene = buildReplayVisionScene([table({ ambientColor: '#101020', globalIllumination: 0.25 })]);

    expect(scene).toMatchObject({
      darknessEnabled: true,
      ambientColor: '#101020',
      globalIllumination: 0.25,
      gridSize: 50,
      widthPx: 1000,
      heightPx: 1000,
    });
  });

  it('見ているほうの卓を使うこと', () => {
    const snapshots = [
      table(),
      snapshot('table-2', 'game-table', { width: 5, height: 5, gridSize: 100 }),
      snapshot('selecter', 'TableSelecter', { viewTableIdentifier: 'table-2' }),
    ];

    expect(buildReplayVisionScene(snapshots)?.widthPx).toBe(500);
  });

  it('持ち主のいるコマを視界の元にすること', () => {
    const snapshots = [
      table(),
      character('c1', { owner: 'alice', visionType: VisionType.DARKVISION, visionRange: 6 }),
      // 持ち主のいないコマは誰の目でもない。
      character('c2', { visionType: VisionType.DARKVISION, visionRange: 6 }),
      // しまわれているコマも数えない。
      character('c3', { owner: 'bob', location: { name: 'inventory', x: 0, y: 0 } }),
    ];

    const sources = buildReplayVisionScene(snapshots)!.visionSources;
    expect(sources).toHaveLength(1);
    expect(sources[0]).toMatchObject({ owner: 'alice', rangePx: 300 });
  });

  it('灯りを持つコマと光源を灯りとして数えること', () => {
    const snapshots = [
      table(),
      character('c1', { lightEnabled: true, lightBrightRadius: 2, lightDimRadius: 4, lightColor: '#ffddaa' }),
      snapshot('l1', 'light-source', {
        location: { name: 'table', x: 100, y: 100, surface: 'floor' },
        isVisibleOnTable: true,
        lightEnabled: true,
        lightBrightRadius: 1,
        lightDimRadius: 3,
      }),
      // 消えている灯りは数えない。
      snapshot('l2', 'light-source', {
        location: { name: 'table', x: 0, y: 0 },
        isVisibleOnTable: true,
        lightEnabled: false,
      }),
    ];

    const lights = buildReplayVisionScene(snapshots)!.lights;
    expect(lights).toHaveLength(2);
    expect(lights.map((light) => light.dimPx).sort((a, b) => a - b)).toEqual([150, 200]);
  });

  it('コマに付いて回る灯りはそのコマの場所で光ること', () => {
    const snapshots = [
      table(),
      character('c1', { location: { name: 'table', x: 700, y: 300, surface: 'floor' } }),
      snapshot('l1', 'light-source', {
        location: { name: 'table', x: 0, y: 0, surface: 'floor' },
        isVisibleOnTable: true,
        lightEnabled: true,
        lightDimRadius: 2,
        followingCharacterIdentifier: 'c1',
      }),
    ];

    const light = buildReplayVisionScene(snapshots)!.lights[0];
    expect(light.x).toBe(725);
    expect(light.y).toBe(325);
  });

  it('壁になる地形で視線を遮ること', () => {
    const wall = snapshot('t1', 'terrain', {
      location: { name: 'table', x: 600, y: 0, surface: 'floor' },
      parentIdentifier: 'table-1',
      width: 1,
      depth: 20,
      hasWall: true,
      blocksSight: true,
    });
    const scene = buildReplayVisionScene([table(), wall])!;

    // 卓の外周ぶんと、地形の 4 辺が増える。
    expect(scene.sightSegments.length).toBeGreaterThan(4);
    expect(isPointVisible(scene, 100, 500, { userId: 'gm', isGameMaster: true })).toBe(true);
  });
});

describe('replaySceneViewer()', () => {
  const snapshots = [
    table(),
    character('c1', { owner: 'alice', partyIdentifier: 'party-1' }),
    character('c2', { owner: 'bob', partyIdentifier: 'party-2' }),
  ];

  it('GM は全部見えること', () => {
    expect(replaySceneViewer(snapshots, { userId: 'gm', role: PeerRole.GameMaster })).toEqual({
      userId: 'gm',
      isGameMaster: true,
    });
  });

  it('PL は自分の同行だけを持つこと', () => {
    expect(replaySceneViewer(snapshots, { userId: 'alice', role: PeerRole.Player })).toEqual({
      userId: 'alice',
      isGameMaster: false,
      partyIds: ['party-1'],
    });
  });

  it('見学者は卓に居る PL の視界を借りること', () => {
    const viewer = replaySceneViewer(snapshots, { userId: 'watcher', role: PeerRole.Guest });

    expect(viewer.isGameMaster).toBe(false);
    expect([...(viewer.visionOwnerIds ?? [])].sort()).toEqual(['alice', 'bob']);
  });
});

describe('replayOverlayPlan()', () => {
  const gm = { userId: 'gm', role: PeerRole.GameMaster };

  it('暗闇を使っていない卓では何も描かないこと', () => {
    expect(replayOverlayPlan([table({ darknessEnabled: false })], gm)).toBeNull();
  });

  it('暗闇の卓では暗幕と灯りを返すこと', () => {
    const plan = replayOverlayPlan(
      [table(), character('c1', { lightEnabled: true, lightBrightRadius: 2, lightDimRadius: 4 })],
      gm
    )!;

    expect(plan.darknessAlpha).toBeGreaterThan(0);
    expect(plan.reveals.length).toBeGreaterThan(0);
    expect(plan.glows.length).toBeGreaterThan(0);
  });

  it('見る人によって見える範囲が変わること', () => {
    const snapshots = [
      table(),
      character('c1', {
        owner: 'alice',
        visionType: VisionType.DARKVISION,
        visionRange: 6,
        location: { name: 'table', x: 200, y: 200, surface: 'floor' },
      }),
    ];

    // 自分のコマの目は自分にだけ効く。他人の視界を勝手に借りない。
    const alice = replayOverlayPlan(snapshots, { userId: 'alice', role: PeerRole.Player })!;
    const bob = replayOverlayPlan(snapshots, { userId: 'bob', role: PeerRole.Player })!;

    expect(alice.reveals.length).toBeGreaterThan(bob.reveals.length);
  });
});
