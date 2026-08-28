import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { partyIdsOwnedBy } from '@axe/domain/party/party-membership';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { GameTable } from '@axe/domain/tabletop/game-table';
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
import { LightSpec, VisionType } from '@axe/domain/tabletop/vision-types';

const GEOMETRY_THROTTLE_MS = 40;
const RELEVANT_ALIASES = new Set(['character', 'light-source', 'terrain', 'game-table']);
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
    const value = compute();
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

  readonly viewer = computed<SceneViewer>(() => {
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
  });

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

  readonly active = computed(() => this.currentTable()?.darknessEnabled ?? false);

  readonly scene = computed<VisionScene | null>(() => {
    this.geometryEpoch();
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
  });

  objectBrightness(x: number, y: number, radiusPx = 0, ignoreShadowCasters = false): number {
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
    const scene = this.scene();
    if (!scene || !scene.darknessEnabled) return EMPTY_SILHOUETTES;
    return this.recall(`sil:${faceKey(face)}`, () => computeWallSilhouettes(scene, face, scene.gridSize * 1.5));
  }

  wallLights(face: WallFace): WallLight[] {
    const scene = this.scene();
    if (!scene || !scene.darknessEnabled) return EMPTY_WALL_LIGHTS;
    return this.recall(`wl:${faceKey(face)}`, () => computeWallLights(scene, face));
  }

  ambientBrightness(): number {
    const scene = this.scene();
    if (!scene) return 1;
    return 1 - darknessAlphaFor(scene, this.viewer());
  }

  private emissiveLights(): { lights: SceneLight[]; gridSize: number } {
    this.geometryEpoch();
    const table = this.currentTable();
    if (!table) return { lights: [], gridSize: 50 };
    return { lights: this.collectLights(table, table.gridSize), gridSize: table.gridSize };
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
    if (!scene || !scene.darknessEnabled) return true;
    if (surfaceOf(character) !== 'floor') return true;
    const viewer = this.viewer();
    if (viewer.isGameMaster) return true;
    if (viewerShares(viewer, character.owner, character.partyIdentifier)) return true;
    const half = (scene.gridSize * (character.size || 1)) / 2;
    const x = character.location.x + half;
    const y = character.location.y + half;
    return this.recall(`tok:${x}:${y}`, () => isPointVisible(scene, x, y, viewer));
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
      });
    }
    return sources;
  }
}
