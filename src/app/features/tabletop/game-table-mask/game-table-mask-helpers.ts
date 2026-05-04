import { GridType } from '@axe/domain/tabletop/game-table';
import {
  hexCellCenter,
  hexCircumradius,
  hexSpacing,
  hexStartAngle,
  isFlatTopGrid,
  isHexGrid,
} from '@axe/domain/tabletop/hex-geometry';

// ---------------------------------------------------------------------------
// Hex mask geometry
// ---------------------------------------------------------------------------

/**
 * ヘクスグリッドマスクのピクセルバウンディングボックスとオフセット。
 *
 * width/height をヘクスのセル数として扱い、各セルが完全にSVG内に
 * 収まるようオフセットする。
 */
export interface HexMaskGeometry {
  /** オフセット済みピクセル幅 */
  pixelW: number;
  /** オフセット済みピクセル高さ */
  pixelH: number;
  /** 最初のセル中心の X オフセット */
  offsetX: number;
  /** 最初のセル中心の Y オフセット */
  offsetY: number;
}

export function computeHexMaskGeometry(
  cols: number,
  rows: number,
  gridSize: number,
  gridType: GridType
): HexMaskGeometry | null {
  if (!isHexGrid(gridType) || cols <= 0 || rows <= 0) return null;
  const isFlatTop = isFlatTopGrid(gridType);
  const s = hexCircumradius(gridSize);
  const { colSpacing, rowSpacing } = hexSpacing(gridSize, isFlatTop);

  if (isFlatTop) {
    const offsetX = s;
    const offsetY = gridSize / 2;
    const pixelW = 2 * s + (cols - 1) * colSpacing;
    const hasOddCol = cols >= 2;
    const pixelH = hasOddCol ? rows * gridSize + gridSize / 2 : rows * gridSize;
    return { pixelW, pixelH, offsetX, offsetY };
  } else {
    const offsetX = gridSize / 2;
    const offsetY = s;
    const hasOddRow = rows >= 2;
    const pixelW = hasOddRow ? cols * gridSize + gridSize / 2 : cols * gridSize;
    const pixelH = 2 * s + (rows - 1) * rowSpacing;
    return { pixelW, pixelH, offsetX, offsetY };
  }
}

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

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

function hexVertOffsets(s: number, isFlatTop: boolean): { x: number; y: number }[] {
  const startAngle = hexStartAngle(isFlatTop);
  const offsets: { x: number; y: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = startAngle + (i * Math.PI) / 3;
    offsets.push({ x: s * Math.cos(angle), y: s * Math.sin(angle) });
  }
  return offsets;
}

function buildHexSvgMask(polygons: string[], pixelW: number, pixelH: number): string {
  if (!polygons.length) return EMPTY_MASK;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${pixelW}" height="${pixelH}"><g fill="#000">${polygons.join('')}</g></svg>`;
  return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}") 0px 0px / ${pixelW}px ${pixelH}px no-repeat`;
}

const EMPTY_MASK = 'radial-gradient(#000, #000) 0px 0px / 0px 0px no-repeat';

// ---------------------------------------------------------------------------
// Hex mask SVG (scratching-aware)
// ---------------------------------------------------------------------------

function buildHexMaskSvg(params: BuildMaskCssParams): string {
  const geo = computeHexMaskGeometry(params.width, params.height, params.gridSize, params.gridType);
  if (!geo) return EMPTY_MASK;
  const isFlatTop = isFlatTopGrid(params.gridType);
  const s = hexCircumradius(params.gridSize);
  const maskS = s + 1;
  const { colSpacing, rowSpacing } = hexSpacing(params.gridSize, isFlatTop);

  const scratchedSet = splitGridSet(params.scratchedGrids);
  const scratchingSet = params.currentScratchingSet ?? splitGridSet(params.scratchingGrids);

  const verts = hexVertOffsets(maskS, isFlatTop);

  const polygons: string[] = [];
  for (let col = 0; col < params.width; col++) {
    for (let row = 0; row < params.height; row++) {
      const gridStr = `${col}:${row}`;
      if (!isCellVisible(gridStr, scratchedSet, scratchingSet, params.isPreviewMode)) continue;

      const { x, y } = hexCellCenter(col, row, colSpacing, rowSpacing, isFlatTop);
      const cx = x + geo.offsetX;
      const cy = y + geo.offsetY;
      const points = verts.map((v) => `${cx + v.x},${cy + v.y}`).join(' ');
      polygons.push(`<polygon points="${points}"/>`);
    }
  }

  return buildHexSvgMask(polygons, geo.pixelW, geo.pixelH);
}

// ---------------------------------------------------------------------------
// Hex outline mask (full outline for clipping)
// ---------------------------------------------------------------------------

export function buildHexOutlineMask(gridSize: number, gridType: GridType, width: number, height: number): string {
  const geo = computeHexMaskGeometry(width, height, gridSize, gridType);
  if (!geo) return '';
  const isFlatTop = isFlatTopGrid(gridType);
  const s = hexCircumradius(gridSize);
  const maskS = s + 1;
  const { colSpacing, rowSpacing } = hexSpacing(gridSize, isFlatTop);

  const verts = hexVertOffsets(maskS, isFlatTop);

  const polygons: string[] = [];
  for (let col = 0; col < width; col++) {
    for (let row = 0; row < height; row++) {
      const { x, y } = hexCellCenter(col, row, colSpacing, rowSpacing, isFlatTop);
      const cx = x + geo.offsetX;
      const cy = y + geo.offsetY;
      const points = verts.map((v) => `${cx + v.x},${cy + v.y}`).join(' ');
      polygons.push(`<polygon points="${points}"/>`);
    }
  }

  if (!polygons.length) return '';
  return buildHexSvgMask(polygons, geo.pixelW, geo.pixelH);
}

// ---------------------------------------------------------------------------
// Hex outer border SVG
// ---------------------------------------------------------------------------

/**
 * 隣接セルの (col, row) オフセットを辺インデックスで返す。
 *
 * 辺インデックスは hexVertOffsets の頂点 i→i+1 に対応する。
 */
function hexNeighborOffset(col: number, row: number, edgeIdx: number, isFlatTop: boolean): readonly [number, number] {
  if (isFlatTop) {
    /* flat-top: 偶数列はオフセットなし、奇数列は +rowSpacing/2 */
    const even = col % 2 === 0;
    //                  edge: 0       1       2        3        4       5
    return even
      ? (
          [
            [1, 0],
            [0, 1],
            [-1, 0],
            [-1, -1],
            [0, -1],
            [1, -1],
          ] as const
        )[edgeIdx]
      : (
          [
            [1, 1],
            [0, 1],
            [-1, 1],
            [-1, 0],
            [0, -1],
            [1, 0],
          ] as const
        )[edgeIdx];
  }
  /* pointy-top: 偶数行はオフセットなし、奇数行は +colSpacing/2 */
  const even = row % 2 === 0;
  //                  edge: 0        1       2       3        4        5
  return even
    ? (
        [
          [0, -1],
          [1, 0],
          [0, 1],
          [-1, 1],
          [-1, 0],
          [-1, -1],
        ] as const
      )[edgeIdx]
    : (
        [
          [1, -1],
          [1, 0],
          [1, 1],
          [0, 1],
          [-1, 0],
          [0, -1],
        ] as const
      )[edgeIdx];
}

/**
 * ヘクスグリッドの外周境界線のみを SVG で返す。
 *
 * 全セルを走査し、隣接セルが存在しない辺だけを `<line>` として出力する。
 * CSS background-image 用の data URI 文字列を返す。
 */
export function buildHexOuterBorderSvg(gridSize: number, gridType: GridType, width: number, height: number): string {
  const geo = computeHexMaskGeometry(width, height, gridSize, gridType);
  if (!geo) return '';
  const isFlatTop = isFlatTopGrid(gridType);
  const s = hexCircumradius(gridSize);
  const { colSpacing, rowSpacing } = hexSpacing(gridSize, isFlatTop);
  const verts = hexVertOffsets(s, isFlatTop);

  const lines: string[] = [];
  for (let col = 0; col < width; col++) {
    for (let row = 0; row < height; row++) {
      const { x, y } = hexCellCenter(col, row, colSpacing, rowSpacing, isFlatTop);
      const cx = x + geo.offsetX;
      const cy = y + geo.offsetY;

      for (let i = 0; i < 6; i++) {
        const [dq, dr] = hexNeighborOffset(col, row, i, isFlatTop);
        const nq = col + dq;
        const nr = row + dr;
        if (nq >= 0 && nq < width && nr >= 0 && nr < height) continue;

        const v1 = verts[i];
        const v2 = verts[(i + 1) % 6];
        lines.push(`<line x1="${cx + v1.x}" y1="${cy + v1.y}" x2="${cx + v2.x}" y2="${cy + v2.y}"/>`);
      }
    }
  }

  if (!lines.length) return '';
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${geo.pixelW}" height="${geo.pixelH}">` +
    `<g stroke="#ccc" stroke-width="2" stroke-linecap="round">${lines.join('')}</g></svg>`;
  return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}") 0px 0px / ${geo.pixelW}px ${geo.pixelH}px no-repeat`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function buildMaskCss(params: BuildMaskCssParams): string {
  if (isHexGrid(params.gridType)) return buildHexMaskSvg(params);

  if (!params.isPreviewMode && params.isNonScratched) return '';

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

  let cols: number;
  let rows: number;
  let geo: HexMaskGeometry | null = null;
  if (hex) {
    geo = computeHexMaskGeometry(params.width, params.height, params.gridSize, params.gridType);
    cols = params.width;
    rows = params.height;
  } else {
    cols = Math.ceil(params.width);
    rows = Math.ceil(params.height);
  }

  let insetVertOffsets: { x: number; y: number }[] | null = null;
  if (hex) {
    const s = hexCircumradius(params.gridSize);
    const insetS = Math.max(s - 5, s * 0.7);
    insetVertOffsets = hexVertOffsets(insetS, isFlatTop);
  }

  const { colSpacing, rowSpacing } = hex ? hexSpacing(params.gridSize, isFlatTop) : { colSpacing: 0, rowSpacing: 0 };

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

      if (hex && geo) {
        const center = hexCellCenter(x, y, colSpacing, rowSpacing, isFlatTop);
        cx = center.x + geo.offsetX;
        cy = center.y + geo.offsetY;
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
