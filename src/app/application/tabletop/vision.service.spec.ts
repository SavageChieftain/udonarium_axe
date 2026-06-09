import { TestBed } from '@angular/core/testing';
import { VisionService } from '@axe/application/tabletop/vision.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { PeerRole } from '@axe/domain/peer/peer-role';
import { GameTable } from '@axe/domain/tabletop/game-table';
import { LightSource } from '@axe/domain/tabletop/light-source';
import { Terrain } from '@axe/domain/tabletop/terrain';
import { VisionType } from '@axe/domain/tabletop/vision-types';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

function makeMyCursor(userId: string, role: PeerRole): void {
  const cursor = new PeerCursor();
  cursor.userId = userId;
  cursor.role = role;
  cursor.initialize();
  PeerCursor.myCursor = cursor;
}

function makeDarkTable(): GameTable {
  const table = new GameTable();
  table.width = 20;
  table.height = 20;
  table.gridSize = 50;
  table.darknessEnabled = true;
  table.initialize();
  return table;
}

describe('VisionService', () => {
  let service: VisionService;
  let store: ObjectStore;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...TEST_PROVIDERS, VisionService] });
    store = ObjectStore.instance;
    store.getObjects().forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
    service = TestBed.inject(VisionService);
  });

  afterEach(() => {
    store.getObjects().forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
    PeerCursor.myCursor = null!;
    vi.clearAllMocks();
  });

  it('暗闇OFFでも scene は構築されるが darknessEnabled=false / active=false', () => {
    makeMyCursor('p1', PeerRole.Player);
    const table = makeDarkTable();
    table.darknessEnabled = false;
    expect(service.active()).toBe(false);
    const scene = service.scene();
    expect(scene).not.toBeNull();
    expect(scene!.darknessEnabled).toBe(false);
  });

  it('暗闇有効時に scene を組み立て、ライト・視界源を px へ変換する', () => {
    makeMyCursor('p1', PeerRole.Player);
    makeDarkTable();

    const character = GameCharacter.create('PC', 1, '');
    character.owner = 'p1';
    character.visionType = VisionType.DARKVISION;
    character.visionRange = 4;
    character.location.x = 100;
    character.location.y = 100;

    const light = LightSource.create('torch');
    light.lightBrightRadius = 2;
    light.lightDimRadius = 5;
    light.location.x = 300;
    light.location.y = 300;

    const scene = service.scene();
    expect(scene).not.toBeNull();
    expect(scene!.gridSize).toBe(50);
    expect(scene!.widthPx).toBe(1000);
    expect(scene!.lights).toHaveLength(1);
    expect(scene!.lights[0].dimPx).toBe(5 * 50);
    expect(scene!.visionSources).toHaveLength(1);
    expect(scene!.visionSources[0].type).toBe(VisionType.DARKVISION);
    expect(scene!.visionSources[0].rangePx).toBe(4 * 50);
    expect(scene!.visionSources[0].owner).toBe('p1');
  });

  it('光源の z は高度に追従する (altitude * gridSize + emitter)', () => {
    makeMyCursor('p1', PeerRole.Player);
    makeDarkTable();
    const torch = GameCharacter.create('Torch', 1, '');
    torch.location.x = 200;
    torch.location.y = 200;
    torch.altitude = 2;
    torch.lightEnabled = true;
    torch.lightBrightRadius = 2;
    torch.lightDimRadius = 4;
    const scene = service.scene();
    expect(scene!.lights[0].z).toBeCloseTo((2 + 0.5) * 50);
  });

  it('壁に配置された発光キャラは壁の3D位置から部屋へ向けて発光する', () => {
    makeMyCursor('p1', PeerRole.Player);
    const table = makeDarkTable();
    table.wallHeight = 6;

    const onFloor = GameCharacter.create('Floor', 1, '');
    onFloor.location.x = 100;
    onFloor.location.y = 100;
    onFloor.lightEnabled = true;
    onFloor.lightDimRadius = 4;

    const onWall = GameCharacter.create('Wall', 1, '');
    onWall.location.x = 200;
    onWall.location.y = 100;
    onWall.location.surface = 'north-wall';
    onWall.lightEnabled = true;
    onWall.lightDimRadius = 4;
    onWall.castsShadow = true;

    const scene = service.scene();
    expect(scene!.lights).toHaveLength(2);
    const wallLight = scene!.lights.find((l) => l.direction === 90);
    expect(wallLight).toBeTruthy();
    expect(wallLight!.y).toBeCloseTo(0.4 * 50);
    expect(wallLight!.z).toBeCloseTo(6 * 50 - (100 + 25));
    expect(scene!.shadowCasters.every((c) => c.ownerId !== onWall.identifier)).toBe(true);
    expect(service.isTokenVisible(onWall)).toBe(true);
  });

  it('明るい(暗闇OFF)テーブルでも光源のオーブ・ビームは描画される', () => {
    makeMyCursor('p1', PeerRole.Player);
    const table = makeDarkTable();
    table.darknessEnabled = false;

    const torch = GameCharacter.create('Torch', 1, '');
    torch.location.x = 200;
    torch.location.y = 200;
    torch.altitude = 2;
    torch.lightEnabled = true;
    torch.lightAngle = 360;
    torch.lightBrightRadius = 3;
    torch.lightDimRadius = 7;

    const flash = GameCharacter.create('Flash', 1, '');
    flash.location.x = 400;
    flash.location.y = 400;
    flash.altitude = 3;
    flash.lightEnabled = true;
    flash.lightAngle = 45;
    flash.lightPitch = -40;
    flash.lightBrightRadius = 4;
    flash.lightDimRadius = 10;

    expect(service.scene()!.darknessEnabled).toBe(false);
    expect(service.lightGlows()).toHaveLength(1);
    expect(service.lightBeams()).toHaveLength(1);
  });

  it('GM は全トークンを可視と判定する', () => {
    makeMyCursor('gm', PeerRole.GameMaster);
    makeDarkTable();
    const enemy = GameCharacter.create('Enemy', 1, '');
    enemy.owner = 'enemy';
    enemy.location.x = 800;
    enemy.location.y = 800;
    expect(service.isTokenVisible(enemy)).toBe(true);
  });

  it('PL は自分のトークンを見、暗所の敵トークンは隠れる', () => {
    makeMyCursor('p1', PeerRole.Player);
    makeDarkTable();

    const mine = GameCharacter.create('Mine', 1, '');
    mine.owner = 'p1';
    mine.visionType = VisionType.NORMAL;
    mine.location.x = 100;
    mine.location.y = 100;

    const enemy = GameCharacter.create('Enemy', 1, '');
    enemy.owner = 'enemy';
    enemy.location.x = 800;
    enemy.location.y = 800;

    expect(service.isTokenVisible(mine)).toBe(true);
    expect(service.isTokenVisible(enemy)).toBe(false);
  });

  it('発光する地形は scene のライトに含まれ、自分の光を遮らない', () => {
    makeMyCursor('p1', PeerRole.Player);
    const table = makeDarkTable();

    const terrain = Terrain.create('結晶', 2, 2, 2, '', '');
    terrain.location.x = 200;
    terrain.location.y = 200;
    terrain.lightEnabled = true;
    terrain.lightBrightRadius = 3;
    terrain.lightDimRadius = 6;
    table.appendChild(terrain);

    const scene = service.scene();
    expect(scene!.lights.some((l) => l.dimPx === 6 * 50)).toBe(true);
    expect(scene!.lightSegments).toHaveLength(0);
    expect(scene!.sightSegments.length).toBeGreaterThan(4);
  });

  it('previewAsUserId で GM が PL 視点に切り替えられる', () => {
    makeMyCursor('gm', PeerRole.GameMaster);
    makeDarkTable();
    expect(service.viewer().isGameMaster).toBe(true);
    service.previewAsUserId.set('p1');
    expect(service.viewer().isGameMaster).toBe(false);
    expect(service.viewer().userId).toBe('p1');
  });
});
