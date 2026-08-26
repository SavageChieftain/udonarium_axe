import {
  clampFieldDensity,
  clampFieldSize,
  FieldAtmosphere,
  fieldAtmosphereById,
  FieldAtmosphereId,
} from '@axe/domain/tabletop/field/field-atmosphere';
import { fieldToBlocks } from '@axe/domain/tabletop/field/field-blocks';
import { FieldLayout, generateField } from '@axe/domain/tabletop/field/field-layout';
import { MapBlocks } from '@axe/domain/tabletop/map-blocks';

export interface FieldRequest {
  atmosphere: FieldAtmosphereId;
  /** How many cells across. The board is laid out three deep for every four across. */
  size: number;
  density: number;
  seed: number;
}

export interface FieldPlan {
  atmosphere: FieldAtmosphere;
  layout: FieldLayout;
  blocks: MapBlocks;
}

export function fieldBoardSize(size: number): { width: number; height: number } {
  const width = clampFieldSize(size);
  return { width, height: Math.max(12, Math.round(width * 0.75)) };
}

export function planField(request: FieldRequest): FieldPlan {
  const atmosphere = fieldAtmosphereById(request.atmosphere);
  const { width, height } = fieldBoardSize(request.size);
  const density = clampFieldDensity(request.density);
  const layout = generateField(atmosphere, width, height, request.seed, density);
  return { atmosphere, layout, blocks: fieldToBlocks(layout, atmosphere, request.seed) };
}
