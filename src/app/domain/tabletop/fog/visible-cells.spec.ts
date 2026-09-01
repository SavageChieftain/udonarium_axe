import { CellGrid, cellGridOf, cellIndexOf } from '@axe/domain/tabletop/fog/cell-grid';
import { computeVisibleCellsFor, VisibleCellsOptions } from '@axe/domain/tabletop/fog/visible-cells';
import { GridType } from '@axe/domain/tabletop/game-table';
import { SegmentIndexes } from '@axe/domain/tabletop/los/segment-index';
import { rectangleSegments, TallSegment } from '@axe/domain/tabletop/los/segments';
import { isLit, SceneLight, SceneVisionSource, VisionScene } from '@axe/domain/tabletop/vision-scene';
import { DOME_LOBES, VisionLobe, visionLobesOf, VisionShape } from '@axe/domain/tabletop/vision-shape';
import { VisionType } from '@axe/domain/tabletop/vision-types';
import { describe, expect, it } from 'vitest';

const GRID: CellGrid = cellGridOf(20, 20, 50, GridType.SQUARE);
const WALL_HEIGHT = 500;

function roomWalls(withDoorway = false): TallSegment[] {
  const edges = rectangleSegments(200, 200, 200, 200, 0);
  const walls = edges.map((edge) => ({ ...edge, heightPx: WALL_HEIGHT }));
  if (!withDoorway) return walls;
  const solid = walls.filter((wall) => !(wall.y1 === 400 && wall.y2 === 400));
  return [
    ...solid,
    { x1: 200, y1: 400, x2: 280, y2: 400, heightPx: WALL_HEIGHT },
    { x1: 320, y1: 400, x2: 400, y2: 400, heightPx: WALL_HEIGHT },
  ];
}

function torch(): SceneLight {
  return {
    x: 300,
    y: 300,
    z: 25,
    brightPx: 100,
    dimPx: 200,
    color: '#ffffff',
    angle: 360,
    direction: 0,
    pitch: 0,
    revealToAll: false,
    castShadows: false,
    ignoreOcclusion: false,
    animation: 'none',
    sourceId: 'torch',
    surface: 'floor',
  };
}

function scene(partial: Partial<VisionScene> = {}): VisionScene {
  const walls = roomWalls();
  return {
    darknessEnabled: true,
    fogEnabled: true,
    darknessLevel: 0.9,
    ambientColor: '#05060a',
    globalIllumination: 0,
    gridSize: 50,
    gridType: GridType.SQUARE,
    widthPx: 1000,
    heightPx: 1000,
    lights: [torch()],
    visionSources: [],
    sightSegments: walls,
    lightSegments: walls,
    shadowCasters: [],
    ...partial,
  };
}

function eyes(partial: Partial<SceneVisionSource> = {}): SceneVisionSource {
  return {
    x: 700,
    y: 700,
    z: 25,
    type: VisionType.NORMAL,
    rangePx: 0,
    owner: 'p1',
    sourceId: 'eye',
    direction: 0,
    lobes: DOME_LOBES,
    ...partial,
  };
}

function optionsFor(built: VisionScene): VisibleCellsOptions {
  return { scene: built, grid: GRID, indexes: new SegmentIndexes(built.sightSegments, 100), sightRangePx: 0 };
}

const INSIDE = cellIndexOf(GRID, 6, 6);

describe('computeVisibleCellsFor', () => {
  it('keeps a torch shut in a room from showing that room to eyes outside it', () => {
    const built = scene();
    // The cell really is lit; what it is not is seen.
    expect(isLit(built, 325, 325, true, 0)).toBe(true);
    expect(computeVisibleCellsFor(eyes({ x: 700, y: 300 }), optionsFor(built)).get(INSIDE)).toBe(false);
  });

  it('shows the room once the eyes are in it', () => {
    const built = scene();
    expect(computeVisibleCellsFor(eyes({ x: 250, y: 250 }), optionsFor(built)).get(INSIDE)).toBe(true);
  });

  it('lets what is through a doorway be seen and no more', () => {
    const built = scene({ sightSegments: roomWalls(true), lightSegments: roomWalls(true) });
    const cells = computeVisibleCellsFor(eyes({ x: 300, y: 500 }), optionsFor(built));
    expect(cells.get(INSIDE)).toBe(true);
    expect(cells.get(cellIndexOf(GRID, 4, 4))).toBe(false);
  });

  it('leaves the ground behind a piece dark when it only looks one way', () => {
    const facingEast = visionLobesOf({
      shape: VisionShape.CONE,
      coneAngle: 90,
      coneCount: 1,
      backAngle: 90,
      backScale: 0.4,
      peripheralScale: 0.3,
      direction: 0,
      lobes: '',
    }) as readonly VisionLobe[];
    const built = scene({ lights: [{ ...torch(), x: 500, y: 500, dimPx: 400 }], sightSegments: [], lightSegments: [] });
    const options = optionsFor(built);
    const ahead = computeVisibleCellsFor(eyes({ x: 500, y: 500, direction: 0, lobes: facingEast }), options);
    expect(ahead.get(cellIndexOf(GRID, 12, 10))).toBe(true);
    expect(ahead.get(cellIndexOf(GRID, 7, 10))).toBe(false);
  });

  it('turns what a piece sees along with the piece', () => {
    const lobes = visionLobesOf({
      shape: VisionShape.CONE,
      coneAngle: 90,
      coneCount: 1,
      backAngle: 90,
      backScale: 0.4,
      peripheralScale: 0.3,
      direction: 0,
      lobes: '',
    });
    const built = scene({ lights: [{ ...torch(), x: 500, y: 500, dimPx: 400 }], sightSegments: [], lightSegments: [] });
    const options = optionsFor(built);
    const west = computeVisibleCellsFor(eyes({ x: 500, y: 500, direction: 180, lobes }), options);
    expect(west.get(cellIndexOf(GRID, 7, 10))).toBe(true);
    expect(west.get(cellIndexOf(GRID, 12, 10))).toBe(false);
  });

  it('sees nothing at all when it is blind', () => {
    const built = scene();
    expect(computeVisibleCellsFor(eyes({ x: 250, y: 250, type: VisionType.BLIND }), optionsFor(built)).isEmpty).toBe(
      true
    );
  });
});
