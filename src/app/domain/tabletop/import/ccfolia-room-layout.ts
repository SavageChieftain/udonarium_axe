export interface RoomGridGeometry {
  fieldWidth: number;
  fieldHeight: number;
  gridSize: number;
}

export const DEFAULT_ROOM_FIELD_WIDTH = 20;
export const DEFAULT_ROOM_FIELD_HEIGHT = 20;

/** コマの座標だけはマス単位ではなくピクセル単位で、1 マスがこの値にあたる。 */
export const PIECE_UNITS_PER_CELL = 25;

export interface TablePosition {
  x: number;
  y: number;
}

/**
 * ココフォリアの盤面座標は原点が盤面の中央にあり、盤外へも置ける（負値・盤面サイズ超えを取る）。
 * AXE はテーブル左上を原点とするピクセル座標なので、盤面の半分だけ平行移動して拡大する。
 */
export function roomCellToTablePosition(cellX: number, cellY: number, geometry: RoomGridGeometry): TablePosition {
  return {
    x: (cellX + geometry.fieldWidth / 2) * geometry.gridSize,
    y: (cellY + geometry.fieldHeight / 2) * geometry.gridSize,
  };
}

export function pieceUnitToTablePosition(unitX: number, unitY: number, geometry: RoomGridGeometry): TablePosition {
  const scale = geometry.gridSize / PIECE_UNITS_PER_CELL;
  return {
    x: (unitX + (geometry.fieldWidth / 2) * PIECE_UNITS_PER_CELL) * scale,
    y: (unitY + (geometry.fieldHeight / 2) * PIECE_UNITS_PER_CELL) * scale,
  };
}

export function resolveFieldSize(fieldWidth: number, fieldHeight: number): { width: number; height: number } {
  return {
    width: fieldWidth >= 1 ? fieldWidth : DEFAULT_ROOM_FIELD_WIDTH,
    height: fieldHeight >= 1 ? fieldHeight : DEFAULT_ROOM_FIELD_HEIGHT,
  };
}
