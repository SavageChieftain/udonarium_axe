export interface BuildMaskCssParams {
  currentScratchingSet: Set<string> | null;
  gridSize: number;
  height: number;
  isNonScratched: boolean;
  isPreviewMode: boolean;
  scratchedGrids: string;
  scratchingGrids: string;
  width: number;
}

export interface BuildScratchingGridInfosParams {
  currentScratchingSet: Set<string> | null;
  hasGameTableMask: boolean;
  height: number;
  isNonScratched: boolean;
  isNonScratching: boolean;
  scratchedGrids: string;
  scratchingGrids: string;
  width: number;
}

export interface ScratchGridInfo {
  x: number;
  y: number;
  state: string;
}

function splitGridSet(value: string): Set<string> {
  return new Set(value.split(/,/g));
}

export function buildMaskCss(params: BuildMaskCssParams): string {
  if (!params.isPreviewMode && params.isNonScratched) return '';

  const masks: string[] = [];
  const scratchedSet = splitGridSet(params.scratchedGrids);
  const scratchingSet = params.currentScratchingSet ?? splitGridSet(params.scratchingGrids);

  for (let x = 0; x < params.width; x++) {
    for (let y = 0; y < params.height; y++) {
      const gridStr = `${x}:${y}`;
      if (params.isPreviewMode) {
        if (scratchedSet.has(gridStr) && !scratchingSet.has(gridStr)) continue;
        if (scratchingSet.has(gridStr) && !scratchedSet.has(gridStr)) continue;
      } else if (scratchedSet.has(gridStr)) {
        continue;
      }

      masks.push(
        `radial-gradient(#000, #000) ${x * params.gridSize - 1}px ${y * params.gridSize - 1}px / ${params.gridSize + 2}px ${params.gridSize + 2}px no-repeat`
      );
    }
  }

  return masks.length ? masks.join(',') : 'radial-gradient(#000, #000) 0px 0px / 0px 0px no-repeat';
}

export function buildScratchingGridInfos(params: BuildScratchingGridInfosParams): ScratchGridInfo[] {
  const ret: ScratchGridInfo[] = [];
  if (!params.hasGameTableMask || (params.isNonScratching && params.isNonScratched)) return ret;

  const scratchingGridSet = params.currentScratchingSet ?? splitGridSet(params.scratchingGrids);
  const scratchedGridSet = splitGridSet(params.scratchedGrids);

  for (let x = 0; x < Math.ceil(params.width); x++) {
    for (let y = 0; y < Math.ceil(params.height); y++) {
      const gridStr = `${x}:${y}`;
      if (scratchingGridSet.has(gridStr) || scratchedGridSet.has(gridStr)) {
        ret.push({
          x,
          y,
          state: !scratchingGridSet.has(gridStr)
            ? 'scrached'
            : !scratchedGridSet.has(gridStr)
              ? 'scraching'
              : 'restore',
        });
      }
    }
  }

  return ret;
}
