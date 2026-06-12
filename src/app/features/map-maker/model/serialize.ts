import {
  DEFAULT_SCENE_BACKGROUND,
  DEFAULT_SCENE_GRID_COLOR,
  MAP_SCENE_VERSION,
  MapLayer,
  MapScene,
} from '@axe/features/map-maker/model/scene';

export function serializeScene(scene: MapScene): string {
  return JSON.stringify({ ...scene, version: MAP_SCENE_VERSION });
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function isPositiveFiniteNumber(v: unknown): v is number {
  return isFiniteNumber(v) && (v as number) > 0;
}

const VALID_KINDS = new Set(['cell', 'shape', 'wall', 'stamp', 'freehand', 'text']);

function isValidLayer(layer: unknown): boolean {
  if (typeof layer !== 'object' || layer === null) return false;
  const l = layer as Record<string, unknown>;
  if (typeof l['id'] !== 'string') return false;
  if (!VALID_KINDS.has(l['kind'] as string)) return false;
  if (typeof l['name'] !== 'string') return false;
  return true;
}

export function isMapScene(value: unknown): value is MapScene {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (!isFiniteNumber(v['version'])) return false;
  if (!isPositiveFiniteNumber(v['cols'])) return false;
  if (!isPositiveFiniteNumber(v['rows'])) return false;
  if (!isPositiveFiniteNumber(v['cellPx'])) return false;
  if (!Array.isArray(v['layers'])) return false;
  for (const layer of v['layers']) {
    if (!isValidLayer(layer)) return false;
  }
  return true;
}

function sanitizeLayer(raw: Record<string, unknown>): MapLayer {
  const base = {
    id: String(raw['id'] ?? ''),
    kind: raw['kind'] as MapLayer['kind'],
    name: String(raw['name'] ?? ''),
    visible: raw['visible'] !== false,
    locked: raw['locked'] === true,
    opacity: Math.max(0, Math.min(1, isFiniteNumber(raw['opacity']) ? (raw['opacity'] as number) : 1)),
  };

  switch (raw['kind']) {
    case 'cell':
      return {
        ...base,
        kind: 'cell',
        cells: (typeof raw['cells'] === 'object' && raw['cells'] !== null && !Array.isArray(raw['cells'])
          ? raw['cells']
          : {}) as Record<string, never>,
      };
    case 'shape':
      return { ...base, kind: 'shape', items: Array.isArray(raw['items']) ? raw['items'] : [] };
    case 'wall':
      return { ...base, kind: 'wall', segments: Array.isArray(raw['segments']) ? raw['segments'] : [] };
    case 'stamp':
      return { ...base, kind: 'stamp', items: Array.isArray(raw['items']) ? raw['items'] : [] };
    case 'freehand':
      return { ...base, kind: 'freehand', strokes: Array.isArray(raw['strokes']) ? raw['strokes'] : [] };
    case 'text':
      return { ...base, kind: 'text', items: Array.isArray(raw['items']) ? raw['items'] : [] };
    default:
      return { ...base, kind: 'cell', cells: {} };
  }
}

export function deserializeScene(json: string): MapScene | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null) return null;
  const raw = parsed as Record<string, unknown>;

  if (!Array.isArray(raw['layers'])) return null;
  const rawLayers = (raw['layers'] as unknown[]).filter((l) => {
    if (typeof l !== 'object' || l === null) return false;
    return VALID_KINDS.has((l as Record<string, unknown>)['kind'] as string);
  });

  const filtered = { ...raw, layers: rawLayers };
  if (!isMapScene(filtered)) return null;

  return {
    version: MAP_SCENE_VERSION,
    cols: raw['cols'] as number,
    rows: raw['rows'] as number,
    cellPx: raw['cellPx'] as number,
    background: typeof raw['background'] === 'string' ? raw['background'] : DEFAULT_SCENE_BACKGROUND,
    gridColor: typeof raw['gridColor'] === 'string' ? raw['gridColor'] : DEFAULT_SCENE_GRID_COLOR,
    gridVisible: raw['gridVisible'] !== false,
    layers: rawLayers.map((l) => sanitizeLayer(l as Record<string, unknown>)),
  };
}
