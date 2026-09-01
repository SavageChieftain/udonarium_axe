import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { PERF_VISION_MEMO_MISS, PERF_VISION_SCENE, perfCounters, perfTimed } from '@axe/core/util/perf-counters';
import { GameCharacter } from '@axe/domain/character/game-character';
import { partyIdsOwnedBy } from '@axe/domain/party/party-membership';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { CellBits } from '@axe/domain/tabletop/fog/cell-bits';
import { cellCount, CellGrid, cellGridOf, cellIndexAt } from '@axe/domain/tabletop/fog/cell-grid';
import { fogMemoryOn } from '@axe/domain/tabletop/fog/fog-memory';
import {
  asFogMode,
  FOG_EDGE_BLUR_RATIO,
  FOG_GM_ALPHA_FACTOR,
  FOG_UNEXPLORED_ALPHA,
  FOG_VEIL_ALPHA,
} from '@axe/domain/tabletop/fog/fog-mode';
import { computeVisibleCellsFor, VisibleCellsOptions } from '@axe/domain/tabletop/fog/visible-cells';
import { GameTable } from '@axe/domain/tabletop/game-table';
import { SegmentIndexes } from '@axe/domain/tabletop/los/segment-index';
import { perimeterSegments, rectangleSegments, TallSegment } from '@axe/domain/tabletop/los/segments';
import { type SurfaceDims, surfaceInwardDirection, surfacePointTo3D } from '@axe/domain/tabletop/surface-space';
import { lightSourcesOn } from '@axe/domain/tabletop/table-lights';
import { TableSelecter } from '@axe/domain/tabletop/table-selecter';
import { surfaceOf, TableSurface, TabletopObject } from '@axe/domain/tabletop/tabletop-object';
import {
  computeLightBeam,
  computeLightGlow,
  computeWallLights,
  computeWallSilhouettes,
  darknessAlphaFor,
  eyeHeightPx,
  isPointVisible,
  type LightBeam,
  type LightGlow,
  type LightSegment,
  objectBrightnessFor,
  type OverlayVision,
  type SceneLight,
  type SceneViewer,
  type SceneVisionSource,
  type ShadowCaster,
  viewerShares,
  type VisionScene,
  type WallFace,
  type WallLight,
  type WallSilhouette,
} from '@axe/domain/tabletop/vision-scene';
import { visionLobesOf } from '@axe/domain/tabletop/vision-shape';
import { LightSpec, VisionType } from '@axe/domain/tabletop/vision-types';

const GEOMETRY_THROTTLE_MS = 40;
const RELEVANT_ALIASES = new Set(['character', 'light-source', 'terrain', 'game-table']);
/** How many table cells one bucket of the sight index spans. */
const SIGHT_INDEX_BUCKET_CELLS = 2;
/** What the walls of a place are cut from. A piece walking past moves none of it. */
const STANDING_ALIASES = new Set(['terrain', 'game-table']);
/** How many answers to keep, set well above what a single repaint asks for. */
const MEMO_LIMIT = 8192;
const EMPTY_SILHOUETTES: WallSilhouette[] = [];
const EMPTY_WALL_LIGHTS: WallLight[] = [];

function faceKey(face: WallFace): string {
  return `${face.ax}:${face.ay}:${face.bx}:${face.by}:${face.nx}:${face.ny}:${face.heightPx}`;
}
const WALL_LIGHT_INSET_CELLS = 0.4;

function sameIds(a: readonly string[] | undefined, b: readonly string[] | undefined): boolean {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  return a.every((id, index) => id === b[index]);
}

/** Who is looking, by what they are rather than by the object that says so. */
function sameViewer(a: SceneViewer, b: SceneViewer): boolean {
  return (
    a.userId === b.userId &&
    a.isGameMaster === b.isGameMaster &&
    sameIds(a.visionOwnerIds, b.visionOwnerIds) &&
    sameIds(a.partyIds, b.partyIds)
  );
}

@Injectable({ providedIn: 'root' })
export class VisionService {
  private readonly objectChange = inject(ObjectChangeService);
  private readonly objectStore = inject(ObjectStore);
  private readonly tableSelecter = inject(TableSelecter);
  private readonly destroyRef = inject(DestroyRef);

  readonly previewAsUserId = signal<string | null>(null);
  private readonly geometryEpoch = signal(0);
  private readonly standingEpoch = signal(0);

  /**
   * Remembers the answers for as long as the scene and the viewer hold still.
   *
   * Wall faces and brightness are asked for on every repaint: eight times per terrain and once
   * per piece, each walking every light and every caster. When the answer is the same, so is
   * the array: a new one would send the view off to rebuild its list for nothing.
   */
  private memoScene: VisionScene | null = null;
  private memoViewer: SceneViewer | null = null;
  private readonly memo = new Map<string, unknown>();

  private recall<T>(key: string, compute: () => T): T {
    const scene = this.scene();
    const viewer = this.viewer();
    if (scene !== this.memoScene || viewer !== this.memoViewer) {
      this.memoScene = scene;
      this.memoViewer = viewer;
      this.memo.clear();
    }
    const cached = this.memo.get(key);
    if (cached !== undefined) return cached as T;
    perfCounters.bump(PERF_VISION_MEMO_MISS);
    const value = perfTimed(key.slice(0, key.indexOf(':')), compute);
    // It grows with the number of places asked about, so it is capped rather than left to swell.
    if (this.memo.size >= MEMO_LIMIT) this.memo.clear();
    this.memo.set(key, value);
    return value;
  }

  constructor() {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let standingTimer: ReturnType<typeof setTimeout> | null = null;
    const bump = () => {
      if (timer !== null) return;
      timer = setTimeout(() => {
        timer = null;
        this.geometryEpoch.update((v) => v + 1);
      }, GEOMETRY_THROTTLE_MS);
    };
    const bumpStanding = () => {
      if (standingTimer !== null) return;
      standingTimer = setTimeout(() => {
        standingTimer = null;
        this.standingEpoch.update((v) => v + 1);
      }, GEOMETRY_THROTTLE_MS);
    };
    const changed = (aliasName: string) => {
      if (!RELEVANT_ALIASES.has(aliasName)) return;
      perfCounters.bump(`dirty:${aliasName}`);
      bump();
      if (STANDING_ALIASES.has(aliasName)) bumpStanding();
    };
    this.objectChange.onObjectChangedForAlias(
      [...RELEVANT_ALIASES],
      (event) => changed(event.aliasName),
      this.destroyRef
    );
    this.objectChange.objectAdded$.subscribe((event) => changed(event.aliasName), this.destroyRef);
    this.objectChange.objectRemoved$.subscribe((event) => changed(event.aliasName), this.destroyRef);
    this.destroyRef.onDestroy(() => {
      if (timer !== null) clearTimeout(timer);
      if (standingTimer !== null) clearTimeout(standingTimer);
    });
  }

  /**
   * The walls in the way of sight and of light, which only what stands on the table can move.
   *
   * Kept apart from the scene so that a piece crossing the floor hands the same lists back
   * rather than cutting seven hundred terrains into segments again, and so that what has been
   * worked out about those lists survives the walk.
   */
  private readonly standingSegments = computed(() => {
    this.standingEpoch();
    const table = this.currentTable();
    if (!table) return null;
    const gridSize = table.gridSize;
    return this.collectSegments(table, gridSize, table.width * gridSize, table.height * gridSize);
  });

  readonly viewer = computed<SceneViewer>(
    () => {
      this.objectChange.versionOf(PeerCursor.myCursor?.identifier ?? '')();
      this.objectChange.collectionOf('PeerCursor')();
      this.geometryEpoch();
      const preview = this.previewAsUserId();
      if (preview) {
        const cursor = PeerCursor.findByUserId(preview);
        return cursor?.isGuest
          ? { userId: preview, isGameMaster: false, visionOwnerIds: this.playerVisionOwnerIds() }
          : { userId: preview, isGameMaster: false, partyIds: this.partyIdsOf(preview) };
      }
      const my = PeerCursor.myCursor;
      if (my?.isGuest) {
        return { userId: my.userId, isGameMaster: false, visionOwnerIds: this.playerVisionOwnerIds() };
      }
      const userId = my?.userId ?? '';
      return { userId, isGameMaster: my?.isGameMaster ?? false, partyIds: this.partyIdsOf(userId) };
    },
    { equal: sameViewer }
  );

  private shownVisionIds(): Set<string> {
    const shown = new Set<string>();
    for (const character of this.objectStore.getObjects<GameCharacter>(GameCharacter)) {
      if (character.showVisionRange) shown.add(character.identifier);
    }
    return shown;
  }

  private playerVisionOwnerIds(): string[] {
    return this.objectStore
      .getObjects<PeerCursor>(PeerCursor)
      .filter((cursor) => cursor.isPlayer && cursor.userId.length > 0)
      .map((cursor) => cursor.userId);
  }

  private partyIdsOf(userId: string): string[] {
    return partyIdsOwnedBy(this.objectStore.getObjects<GameCharacter>(GameCharacter), userId);
  }

  private currentTable(): GameTable | null {
    this.objectChange.versionOf(this.tableSelecter.identifier)();
    const table = this.tableSelecter.viewTable;
    if (table) this.objectChange.versionOf(table.identifier)();
    return table;
  }

  readonly active = computed(() => {
    const table = this.currentTable();
    return (table?.darknessEnabled || table?.fogEnabled) ?? false;
  });

  readonly scene = computed<VisionScene | null>(() => {
    this.geometryEpoch();
    perfCounters.bump(PERF_VISION_SCENE);
    return perfTimed('scene', () => this.buildScene());
  });

  private buildScene(): VisionScene | null {
    const table = this.currentTable();
    if (!table) return null;

    const standing = this.standingSegments();
    if (!standing) return null;
    const gridSize = table.gridSize;
    const widthPx = table.width * gridSize;
    const heightPx = table.height * gridSize;
    const { sight, light } = standing;
    return {
      darknessEnabled: table.darknessEnabled,
      fogEnabled: table.fogEnabled,
      darknessLevel: table.darknessLevel,
      ambientColor: table.ambientColor,
      globalIllumination: table.globalIllumination,
      gridSize,
      gridType: table.gridType,
      snapLightToGrid: table.lightSnapToGrid,
      widthPx,
      heightPx,
      lights: this.collectLights(table, gridSize),
      visionSources: this.collectVisionSources(gridSize),
      sightSegments: sight,
      lightSegments: light,
      shadowCasters: this.collectShadowCasters(gridSize),
    };
  }

  private readonly cellGrid = computed<CellGrid | null>(() => {
    const table = this.currentTable();
    if (!table) return null;
    return cellGridOf(table.width, table.height, table.gridSize, table.gridType);
  });

  private readonly sightIndexes = computed<SegmentIndexes | null>(() => {
    const standing = this.standingSegments();
    const table = this.currentTable();
    if (!standing || !table) return null;
    return new SegmentIndexes(standing.sight, table.gridSize * SIGHT_INDEX_BUCKET_CELLS);
  });

  /**
   * Which cells each pair of eyes on the table reaches.
   *
   * Kept per pair rather than as one answer because three questions are asked of it: what the
   * reader sees, what the party between them has been shown, and what one piece alone reaches
   * when its own sight is drawn out.
   */
  private readonly visionCells = computed(() => {
    const scene = this.scene();
    const grid = this.cellGrid();
    const indexes = this.sightIndexes();
    const table = this.currentTable();
    if (!scene || !grid || !indexes || !table || !this.active()) return null;
    return perfTimed('cells', () => {
      const options: VisibleCellsOptions = {
        scene,
        grid,
        indexes,
        sightRangePx: table.fogSightRange * table.gridSize,
      };
      const perSource = new Map<string, CellBits>();
      const shared = new CellBits(cellCount(grid));
      const players = new Set(this.playerVisionOwnerIds());
      const viewer = this.viewer();
      const shown = this.shownVisionIds();
      // A monster the game master keeps on the table is nobody's eyes: it does not clear the
      // fog, it is not the reader's, and unless its sight is being drawn nothing asks about it.
      for (const source of scene.visionSources) {
        const wanted =
          players.has(source.owner) || shown.has(source.sourceId) || viewerShares(viewer, source.owner, source.partyId);
        if (!wanted) continue;
        const cells = computeVisibleCellsFor(source, options);
        perSource.set(source.sourceId, cells);
        if (players.has(source.owner)) shared.or(cells);
      }
      return { grid, perSource, shared };
    });
  });

  /** Null when the reader has no eyes of their own, which is when nothing is cut back to them. */
  private readonly viewerCells = computed<CellBits | null>(() => {
    const cells = this.visionCells();
    const scene = this.scene();
    if (!cells || !scene) return null;
    const viewer = this.viewer();
    if (viewer.isGameMaster) return null;
    const mine = new CellBits(cellCount(cells.grid));
    let any = false;
    for (const source of scene.visionSources) {
      if (source.type === VisionType.BLIND) continue;
      if (!viewerShares(viewer, source.owner, source.partyId)) continue;
      const own = cells.perSource.get(source.sourceId);
      if (!own) continue;
      mine.or(own);
      any = true;
    }
    return any ? mine : null;
  });

  readonly sharedVisibleCells = computed<{ grid: CellGrid; cells: CellBits } | null>(() => {
    const cells = this.visionCells();
    return cells ? { grid: cells.grid, cells: cells.shared } : null;
  });

  readonly exploredCells = computed<CellBits | null>(() => {
    const cells = this.visionCells();
    const table = this.currentTable();
    if (!cells || !table || !table.fogEnabled) return null;
    const explored = cells.shared.copy();
    if (asFogMode(table.fogMode) === 'easy') {
      this.objectChange.collectionOf('fog-memory')();
      const memory = fogMemoryOn(table);
      if (memory) {
        this.objectChange.versionOf(memory.identifier)();
        explored.or(memory.read(cells.grid));
      }
    }
    return explored;
  });

  readonly overlayVision = computed<OverlayVision | undefined>(() => {
    const cells = this.visionCells();
    const table = this.currentTable();
    if (!cells || !table) return undefined;
    const own = this.viewerCells();
    const dim = this.viewer().isGameMaster ? FOG_GM_ALPHA_FACTOR : 1;
    return {
      grid: cells.grid,
      visible: own ?? cells.shared,
      explored: this.exploredCells() ?? cells.shared,
      clipReveals: own !== null,
      fogEnabled: table.fogEnabled,
      fogColor: table.fogColor,
      veilAlpha: FOG_VEIL_ALPHA * dim,
      unexploredAlpha: FOG_UNEXPLORED_ALPHA * dim,
      blurPx: table.gridSize * FOG_EDGE_BLUR_RATIO,
    };
  });

  visibleCellsOf(identifier: string): { grid: CellGrid; cells: CellBits } | null {
    const cells = this.visionCells();
    const own = cells?.perSource.get(identifier);
    return cells && own ? { grid: cells.grid, cells: own } : null;
  }

  isHiddenByFog(x: number, y: number): boolean {
    if (this.viewer().isGameMaster) return false;
    const explored = this.exploredCells();
    const cells = this.visionCells();
    if (!explored || !cells) return false;
    const index = cellIndexAt(cells.grid, x, y);
    if (index < 0) return false;
    return !explored.get(index);
  }

  objectBrightness(x: number, y: number, radiusPx = 0, ignoreShadowCasters = false): number {
    if (!this.active()) return 1;
    const scene = this.scene();
    if (!scene) return 1;
    return this.recall(`bright:${x}:${y}:${radiusPx}:${ignoreShadowCasters}`, () =>
      objectBrightnessFor(scene, this.viewer(), x, y, radiusPx, ignoreShadowCasters)
    );
  }

  objectFilter(x: number, y: number, radiusPx = 0, ignoreShadowCasters = false): string | null {
    const brightness = this.objectBrightness(x, y, radiusPx, ignoreShadowCasters);
    return brightness < 1 ? `brightness(${brightness.toFixed(3)})` : null;
  }

  wallSilhouettes(face: WallFace): WallSilhouette[] {
    if (!this.active()) return EMPTY_SILHOUETTES;
    const scene = this.scene();
    if (!scene || !this.faceIsSeen(scene, face)) return EMPTY_SILHOUETTES;
    return this.recall(`sil:${faceKey(face)}`, () => computeWallSilhouettes(scene, face, scene.gridSize * 1.5));
  }

  wallLights(face: WallFace): WallLight[] {
    if (!this.active()) return EMPTY_WALL_LIGHTS;
    const scene = this.scene();
    if (!scene || !this.faceIsSeen(scene, face)) return EMPTY_WALL_LIGHTS;
    return this.recall(`wl:${faceKey(face)}`, () => computeWallLights(scene, face));
  }

  /**
   * A wall lit on the far side of another wall is still a wall nobody can see, so the pool and
   * the shadows thrown on it are left off rather than shining through what hides them.
   */
  private faceIsSeen(scene: VisionScene, face: WallFace): boolean {
    const viewer = this.viewer();
    if (viewer.isGameMaster) return true;
    const x = (face.ax + face.bx) / 2 + face.nx;
    const y = (face.ay + face.by) / 2 + face.ny;
    return this.recall(`face:${faceKey(face)}`, () => isPointVisible(scene, x, y, viewer));
  }

  private lightIsSeen(scene: VisionScene, light: SceneLight): boolean {
    const viewer = this.viewer();
    if (viewer.isGameMaster || light.revealToAll) return true;
    return this.recall(`lseen:${light.sourceId}`, () => isPointVisible(scene, light.x, light.y, viewer, light.z));
  }

  ambientBrightness(): number {
    if (!this.active()) return 1;
    const scene = this.scene();
    if (!scene) return 1;
    return 1 - darknessAlphaFor(scene, this.viewer());
  }

  private emissiveLights(): { lights: SceneLight[]; gridSize: number } {
    this.geometryEpoch();
    const table = this.currentTable();
    if (!table) return { lights: [], gridSize: 50 };
    const lights = this.collectLights(table, table.gridSize);
    const scene = this.scene();
    const seen = scene && this.active() ? lights.filter((light) => this.lightIsSeen(scene, light)) : lights;
    return { lights: seen, gridSize: table.gridSize };
  }

  lightBeams(): LightBeam[] {
    return this.recall('beams', () => {
      const beams: LightBeam[] = [];
      for (const light of this.emissiveLights().lights) {
        const beam = computeLightBeam(light);
        if (beam) beams.push(beam);
      }
      return beams;
    });
  }

  lightGlows(): LightGlow[] {
    return this.recall('glows', () => {
      const { lights, gridSize } = this.emissiveLights();
      const glows: LightGlow[] = [];
      for (const light of lights) {
        const glow = computeLightGlow(light, gridSize);
        if (glow) glows.push(glow);
      }
      return glows;
    });
  }

  isTokenVisible(character: GameCharacter): boolean {
    const scene = this.scene();
    if (!scene || !(scene.darknessEnabled || scene.fogEnabled)) return true;
    if (surfaceOf(character) !== 'floor') return true;
    const viewer = this.viewer();
    if (viewer.isGameMaster) return true;
    if (viewerShares(viewer, character.owner, character.partyIdentifier)) return true;
    const half = (scene.gridSize * (character.size || 1)) / 2;
    const x = character.location.x + half;
    const y = character.location.y + half;
    // Under fog the piece answers to the same cells the fog is drawn from. Asking the sight
    // lines again would answer for eyes the reader may not have: somebody with no piece of
    // their own has none, and a table with the dark switched off has nothing to stop a look,
    // so every piece on the board came out standing in plain view under the fog covering it.
    const fog = scene.fogEnabled ? this.overlayVision() : undefined;
    if (fog) {
      const cell = cellIndexAt(fog.grid, x, y);
      if (cell >= 0) return fog.visible.get(cell);
    }
    const z = this.objectZ(character.altitude, character.posZ, scene.gridSize);
    return this.recall(`tok:${x}:${y}:${z}`, () => isPointVisible(scene, x, y, viewer, z));
  }

  private objectZ(altitude: number, posZ: number, gridSize: number): number {
    return eyeHeightPx(altitude, posZ, gridSize);
  }

  private placeLight(obj: TabletopObject, centerX: number, centerY: number, gridSize: number, dims: SurfaceDims) {
    const surface = surfaceOf(obj);
    if (surface === 'floor') {
      const h = this.objectZ(obj.altitude, obj.posZ, gridSize);
      return {
        pos: surfacePointTo3D('floor', obj.location.x + centerX, obj.location.y + centerY, dims, h),
        dir: null,
        surface,
      };
    }
    return {
      pos: surfacePointTo3D(
        surface,
        obj.location.x + centerX,
        obj.location.y + centerY,
        dims,
        WALL_LIGHT_INSET_CELLS * gridSize
      ),
      dir: surfaceInwardDirection(surface),
      surface,
    };
  }

  private collectLights(table: GameTable, gridSize: number): SceneLight[] {
    const lights: SceneLight[] = [];
    const half = gridSize / 2;
    const dims: SurfaceDims = {
      widthPx: table.width * gridSize,
      depthPx: table.height * gridSize,
      wallHeightPx: table.wallHeight * gridSize,
    };

    for (const source of lightSourcesOn(table)) {
      if (!source.lightEnabled) continue;
      const followed = source.followingCharacterIdentifier
        ? this.objectStore.get<GameCharacter>(source.followingCharacterIdentifier)
        : null;
      const anchor = followed && followed.isVisibleOnTable ? followed : source;
      const center = followed && followed.isVisibleOnTable ? (gridSize * (followed.size || 1)) / 2 : half;
      const p = this.placeLight(anchor, center, center, gridSize, dims);
      lights.push(
        this.toSceneLight(source.lightSpec, p.pos.x, p.pos.y, p.pos.z, gridSize, source.identifier, p.dir, p.surface)
      );
    }

    for (const character of this.objectStore.getObjects(GameCharacter)) {
      if (!character.isVisibleOnTable || !character.lightEnabled) continue;
      const center = (gridSize * (character.size || 1)) / 2;
      const p = this.placeLight(character, center, center, gridSize, dims);
      lights.push(
        this.toSceneLight(
          character.lightSpec,
          p.pos.x,
          p.pos.y,
          p.pos.z,
          gridSize,
          character.identifier,
          p.dir,
          p.surface
        )
      );
    }

    for (const terrain of table.terrains) {
      if (!terrain.lightEnabled) continue;
      const cx = (terrain.width * gridSize) / 2;
      const cy = (terrain.depth * gridSize) / 2;
      const p = this.placeLight(terrain, cx, cy, gridSize, dims);
      lights.push(
        this.toSceneLight(terrain.lightSpec, p.pos.x, p.pos.y, p.pos.z, gridSize, terrain.identifier, p.dir, p.surface)
      );
    }
    return lights;
  }

  private toSceneLight(
    spec: LightSpec,
    x: number,
    y: number,
    z: number,
    gridSize: number,
    sourceId: string,
    dirOverride: number | null = null,
    surface: TableSurface = 'floor'
  ): SceneLight {
    const dim = Math.max(spec.brightRadius, spec.dimRadius);
    return {
      x,
      y,
      z,
      brightPx: spec.brightRadius * gridSize,
      dimPx: dim * gridSize,
      color: spec.color,
      angle: spec.angle,
      direction: dirOverride ?? spec.direction,
      pitch: spec.pitch,
      revealToAll: spec.revealToAll,
      castShadows: spec.castShadows,
      ignoreOcclusion: spec.ignoreOcclusion,
      animation: spec.animation,
      sourceId,
      surface,
    };
  }

  private collectSegments(
    table: GameTable,
    gridSize: number,
    widthPx: number,
    heightPx: number
  ): { sight: TallSegment[]; light: LightSegment[] } {
    const sight: TallSegment[] = [...perimeterSegments(widthPx, heightPx)];
    const light: LightSegment[] = [];
    const wallHeightPx = table.wallHeight * gridSize;
    const north: LightSegment = { x1: 0, y1: 0, x2: widthPx, y2: 0, heightPx: wallHeightPx };
    const south: LightSegment = { x1: 0, y1: heightPx, x2: widthPx, y2: heightPx, heightPx: wallHeightPx };
    const west: LightSegment = { x1: 0, y1: 0, x2: 0, y2: heightPx, heightPx: wallHeightPx };
    const east: LightSegment = { x1: widthPx, y1: 0, x2: widthPx, y2: heightPx, heightPx: wallHeightPx };
    if (table.showNorthWall) light.push(north);
    if (table.showSouthWall) light.push(south);
    if (table.showWestWall) light.push(west);
    if (table.showEastWall) light.push(east);

    for (const terrain of table.terrains) {
      if (!terrain.hasWall || surfaceOf(terrain) !== 'floor') continue;
      const edges = rectangleSegments(
        terrain.location.x,
        terrain.location.y,
        terrain.width * gridSize,
        terrain.depth * gridSize,
        terrain.rotate
      );
      const top = (terrain.altitude + terrain.height) * gridSize;
      if (terrain.blocksSightNow) for (const edge of edges) sight.push({ ...edge, heightPx: top });
      if (terrain.blocksLightNow && !terrain.lightEnabled) {
        for (const edge of edges) light.push({ ...edge, heightPx: top });
      }
    }
    return { sight, light };
  }

  private collectShadowCasters(gridSize: number): ShadowCaster[] {
    const casters: ShadowCaster[] = [];
    for (const character of this.objectStore.getObjects(GameCharacter)) {
      if (!character.isVisibleOnTable || !character.castsShadow) continue;
      if (surfaceOf(character) !== 'floor') continue;
      const size = (character.size || 1) * gridSize;
      const half = size / 2;
      casters.push({
        ownerId: character.identifier,
        x: character.location.x + half,
        y: character.location.y + half,
        radiusPx: half,
        segments: rectangleSegments(character.location.x, character.location.y, size, size, 0),
        imageUrl: character.imageFile?.url ?? '',
      });
    }
    return casters;
  }

  private collectVisionSources(gridSize: number): SceneVisionSource[] {
    const sources: SceneVisionSource[] = [];
    for (const character of this.objectStore.getObjects(GameCharacter)) {
      if (!character.isVisibleOnTable || !character.owner) continue;
      if (surfaceOf(character) !== 'floor') continue;
      const center = (gridSize * (character.size || 1)) / 2;
      const spec = character.visionSpec;
      sources.push({
        x: character.location.x + center,
        y: character.location.y + center,
        // The same height the light it carries is hung at: standing on a tower and being
        // written down as high up reach an eye the same way, so they reach it as one number.
        z: this.objectZ(character.altitude, character.posZ, gridSize),
        type: character.visionType as VisionType,
        rangePx: character.visionRange * gridSize,
        owner: character.owner,
        partyId: character.partyIdentifier,
        sourceId: character.identifier,
        direction: spec.direction,
        lobes: visionLobesOf(spec),
      });
    }
    return sources;
  }
}
