import { TestBed } from '@angular/core/testing';
import { VisionService } from '@axe/application/tabletop/vision.service';
import { objectChanged$ } from '@axe/core/sync/object-event-extension';
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

function addPeer(userId: string, role: PeerRole): PeerCursor {
  const cursor = new PeerCursor();
  cursor.userId = userId;
  cursor.role = role;
  cursor.initialize();
  return cursor;
}

/** The throttle the service puts on a change before it acts on it. */
const GEOMETRY_THROTTLE = 50;

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

  describe('the walls it cuts from what stands on the table', () => {
    async function announce(aliasName: string, identifier: string): Promise<void> {
      objectChanged$.emit({ aliasName, identifier, isSendFromSelf: true });
      await vi.advanceTimersByTimeAsync(GEOMETRY_THROTTLE);
    }

    /**
     * Everything the setup itself stirred up, so only what a test does is measured. Reading a
     * terrain writes the values nobody has set yet, so the second round is what settles.
     */
    async function settle(): Promise<void> {
      for (let round = 0; round < 3; round++) {
        await vi.advanceTimersByTimeAsync(GEOMETRY_THROTTLE);
        service.scene();
      }
    }

    beforeEach(() => {
      vi.useFakeTimers();
      makeMyCursor('p1', PeerRole.Player);
      const table = makeDarkTable();
      const terrain = Terrain.create('wall', 1, 1, 2, '', '');
      terrain.location.x = 200;
      terrain.location.y = 200;
      table.appendChild(terrain);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('hands the same walls back when a piece has moved and nothing else', async () => {
      const character = GameCharacter.create('c', 1, '');
      await settle();
      const before = service.scene()!.sightSegments;

      await announce('character', character.identifier);

      expect(service.scene()!.sightSegments).toBe(before);
    });

    it('cuts them again once something standing has changed', async () => {
      await settle();
      const before = service.scene()!.sightSegments;

      await announce('terrain', store.getObjects(Terrain)[0].identifier);

      expect(service.scene()!.sightSegments).not.toBe(before);
      expect(service.scene()!.sightSegments).toEqual(before);
    });
  });

  it('builds a scene with the darkness off, marked as such', () => {
    makeMyCursor('p1', PeerRole.Player);
    const table = makeDarkTable();
    table.darknessEnabled = false;
    expect(service.active()).toBe(false);
    const scene = service.scene();
    expect(scene).not.toBeNull();
    expect(scene!.darknessEnabled).toBe(false);
  });

  it('builds the scene with the darkness on, converting lights and sight sources to pixels', () => {
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

  it('raises a light with the altitude of what carries it', () => {
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

  it('shines a wall-mounted character into the room from where it hangs', () => {
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

  it('still draws the orbs and beams on a table with no darkness', () => {
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

  it('shows every token to the game master', () => {
    makeMyCursor('gm', PeerRole.GameMaster);
    makeDarkTable();
    const enemy = GameCharacter.create('Enemy', 1, '');
    enemy.owner = 'enemy';
    enemy.location.x = 800;
    enemy.location.y = 800;
    expect(service.isTokenVisible(enemy)).toBe(true);
  });

  it('shows a player their own tokens and hides an enemy standing in the dark', () => {
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

  it('counts glowing terrain as a light and never lets it shadow itself', () => {
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

  it('lets the game master look through the eyes of a player', () => {
    makeMyCursor('gm', PeerRole.GameMaster);
    makeDarkTable();
    expect(service.viewer().isGameMaster).toBe(true);
    service.previewAsUserId.set('p1');
    expect(service.viewer().isGameMaster).toBe(false);
    expect(service.viewer().userId).toBe('p1');
  });

  it('gives a guest the combined sight of the connected players', () => {
    addPeer('player-1', PeerRole.Player);
    addPeer('player-2', PeerRole.Player);
    addPeer('gm-1', PeerRole.GameMaster);
    makeMyCursor('guest-1', PeerRole.Guest);

    const viewer = service.viewer();
    expect(viewer.isGameMaster).toBe(false);
    expect(viewer.visionOwnerIds).toEqual(expect.arrayContaining(['player-1', 'player-2']));
    expect(viewer.visionOwnerIds).not.toContain('gm-1');
    expect(viewer.visionOwnerIds).not.toContain('guest-1');
  });

  it('gives a player their own sight and no one elses', () => {
    makeMyCursor('player-x', PeerRole.Player);
    expect(service.viewer().visionOwnerIds).toBeUndefined();
  });

  it('gives the game master the combined sight of a guest when looking through their eyes', () => {
    addPeer('guest-2', PeerRole.Guest);
    addPeer('player-3', PeerRole.Player);
    makeMyCursor('gm-x', PeerRole.GameMaster);
    service.previewAsUserId.set('guest-2');

    const viewer = service.viewer();
    expect(viewer.userId).toBe('guest-2');
    expect(viewer.isGameMaster).toBe(false);
    expect(viewer.visionOwnerIds).toContain('player-3');
  });

  describe('what is remembered while the scene holds still', () => {
    it('hands back the same array when asked about a face again', () => {
      // One repaint asks eight times per terrain, and rebuilding the array, identical or not,
      // sends the view off to rebuild its list.
      const table = makeDarkTable();
      ObjectStore.instance.add(table);
      makeMyCursor('gm-1', PeerRole.GameMaster);
      const face = { ax: 100, ay: 100, bx: 200, by: 100, nx: 0, ny: -1, heightPx: 100 };

      expect(service.wallSilhouettes(face)).toBe(service.wallSilhouettes(face));
      expect(service.wallLights(face)).toBe(service.wallLights(face));
      expect(service.lightBeams()).toBe(service.lightBeams());
      expect(service.lightGlows()).toBe(service.lightGlows());
    });

    it('builds no new array for a table without darkness either', () => {
      const table = makeDarkTable();
      table.darknessEnabled = false;
      ObjectStore.instance.add(table);
      const face = { ax: 0, ay: 0, bx: 50, by: 0, nx: 0, ny: -1, heightPx: 50 };

      expect(service.wallSilhouettes(face)).toBe(service.wallSilhouettes(face));
      expect(service.wallLights(face)).toBe(service.wallLights(face));
    });
  });
});
