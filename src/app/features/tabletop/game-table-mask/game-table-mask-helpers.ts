import { GridType } from '@axe/domain/tabletop/game-table';
import {
  hexCellCenter,
  hexCircumradius,
  hexSpacing,
  hexStartAngle,
  isFlatTopGrid,
  isHexGrid,
} from '@axe/domain/tabletop/hex-geometry';

export interface BuildMaskCssParams {
  currentScratchingSet: Set<string> | null;
  gridSize: number;
  gridType: GridType;
  height: number;
  isNonScratched: boolean;
  isPreviewMode: boolean;
  scratchedGrids: string;
  scratchingGrids: string;
  width: number;
}

export interface BuildScratchingGridInfosParams {
  currentScratchingSet: Set<string> | null;
  gridSize: number;
  gridType: GridType;
  hasGameTableMask: boolean;
  height: number;
  isNonScratched: boolean;
  isNonScratching: boolean;
  scratchedGrids: string;
  scratchingGrids: string;
  width: number;
}

export interface ScratchGridInfo {
  cx: number;
  cy: number;
  hexPoints?: string;
  state: string;
  x: number;
  y: number;
}

function splitGridSet(value: string): Set<string> {
  return new Set(value.split(/,/g));
}

function isCellVisible(
  gridStr: string,
  scratchedSet: Set<string>,
  scratchingSet: Set<string>,
  isPreviewMode: boolean
): boolean {
  if (isPreviewMode) {
    if (scratchedSet.has(gridStr) && !scratchingSet.has(gridStr)) return false;
    if (scratchingSet.has(gridStr) && !scratchedSet.has(gridStr)) return false;
  } else if (scratchedSet.has(gridStr)) {
    return false;
  }
  return true;
}

function hexGridDimensions(
  width: number,
  height: number,
  gridSize: number,
  isFlatTop: boolean
): { cols: number; rows: number } {
  const { colSpacing, rowSpacing } = hexSpacing(gridSize, isFlatTop);
  return {
    cols: Math.ceil((width * gridSize) / colSpacing) + 1,
    rows: Math.ceil((height * gridSize) / rowSpacing) + 1,
  };
}

const EMPTY_MASK = 'radial-gradient(#000, #000) 0px 0px / 0px 0px no-repeat';

function buildHexMaskSvg(params: BuildMaskCssParams): string {
  const isFlatTop = isFlatTopGrid(params.gridType);
  const s = hexCircumradius(params.gridSize);
  const maskS = s + 1;
  const startAngle = hexStartAngle(isFlatTop);
  const { colSpacing, rowSpacing } = hexSpacing(params.gridSize, isFlatTop);
  const { cols, rows } = hexGridDimensions(params.width, params.height, params.gridSize, isFlatTop);
  const pixelW = params.width * params.gridSize;
  const pixelH = params.height * params.gridSize;

  const scratchedSet = splitGridSet(params.scratchedGrids);
  const scratchingSet = params.currentScratchingSet ?? splitGridSet(params.scratchingGrids);

  const vertOffsets: { x: number; y: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = startAngle + (i * Math.PI) / 3;
    vertOffsets.push({ x: maskS * Math.cos(angle), y: maskS * Math.sin(angle) });
  }

  const polygons: string[] = [];
  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      const gridStr = `${col}:${row}`;
      if (!isCellVisible(gridStr, scratchedSet, scratchingSet, params.isPreviewMode)) continue;

      const { x: cx, y: cy } = hexCellCenter(col, row, colSpacing, rowSpacing, isFlatTop);
      if (cx < -maskS || cx > pixelW + maskS || cy < -maskS || cy > pixelH + maskS) continue;

      const points = vertOffsets.map((v) => `${cx + v.x},${cy + v.y}`).join(' ');
      polygons.push(`<polygon points="${points}"/>`);
    }
  }

  if (!polygons.length) return EMPTY_MASK;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${pixelW}" height="${pixelH}"><g fill="#000">${polygons.join('')}</g></svg>`;
  return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}") 0px 0px / ${pixelW}px ${pixelH}px no-repeat`;
}

export function buildMaskCss(params: BuildMaskCssParams): string {
  if (!params.isPreviewMode && params.isNonScratched) return '';

  if (isHexGrid(params.gridType)) return buildHexMaskSvg(params);

  const masks: string[] = [];
  const scratchedSet = splitGridSet(params.scratchedGrids);
  const scratchingSet = params.currentScratchingSet ?? splitGridSet(params.scratchingGrids);

  for (let x = 0; x < params.width; x++) {
    for (let y = 0; y < params.height; y++) {
      const gridStr = `${x}:${y}`;
      if (!isCellVisible(gridStr, scratchedSet, scratchingSet, params.isPreviewMode)) continue;

      masks.push(
        `radial-gradient(#000, #000) ${x * params.gridSize - 1}px ${y * params.gridSize - 1}px / ${params.gridSize + 2}px ${params.gridSize + 2}px no-repeat`
      );
    }
  }

  return masks.length ? masks.join(',') : EMPTY_MASK;
}

export function buildScratchingGridInfos(params: BuildScratchingGridInfosParams): ScratchGridInfo[] {
  const ret: ScratchGridInfo[] = [];
  if (!params.hasGameTableMask || (params.isNonScratching && params.isNonScratched)) return ret;

  const scratchingGridSet = params.currentScratchingSet ?? splitGridSet(params.scratchingGrids);
  const scratchedGridSet = splitGridSet(params.scratchedGrids);

  const hex = isHexGrid(params.gridType);
  const isFlatTop = hex ? isFlatTopGrid(params.gridType) : false;
  const { colSpacing, rowSpacing } = hex ? hexSpacing(params.gridSize, isFlatTop) : { colSpacing: 0, rowSpacing: 0 };

  let cols: number;
  let rows: number;
  if (hex) {
    const dim = hexGridDimensions(params.width, params.height, params.gridSize, isFlatTop);
    cols = dim.cols;
    rows = dim.rows;
  } else {
    cols = Math.ceil(params.width);
    rows = Math.ceil(params.height);
  }

  let insetVertOffsets: { x: number; y: number }[] | null = null;
  if (hex) {
    const s = hexCircumradius(params.gridSize);
    const insetS = Math.max(s - 5, s * 0.7);
    const startAngle = hexStartAngle(isFlatTop);
    insetVertOffsets = [];
    for (let i = 0; i < 6; i++) {
      const angle = startAngle + (i * Math.PI) / 3;
      insetVertOffsets.push({ x: insetS * Math.cos(angle), y: insetS * Math.sin(angle) });
    }
  }

  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      const gridStr = `${x}:${y}`;
      if (!scratchingGridSet.has(gridStr) && !scratchedGridSet.has(gridStr)) continue;

      const state = !scratchingGridSet.has(gridStr)
        ? 'scrached'
        : !scratchedGridSet.has(gridStr)
          ? 'scraching'
          : 'restore';

      let cx: number;
      let cy: number;
      let hexPoints: string | undefined;

      if (hex) {
        const center = hexCellCenter(x, y, colSpacing, rowSpacing, isFlatTop);
        cx = center.x;
        cy = center.y;
        hexPoints = insetVertOffsets!.map((v) => `${cx + v.x},${cy + v.y}`).join(' ');
      } else {
        cx = (x + 0.5) * params.gridSize;
        cy = (y + 0.5) * params.gridSize;
      }

      ret.push({ x, y, cx, cy, state, hexPoints });
    }
  }

  return ret;
}
