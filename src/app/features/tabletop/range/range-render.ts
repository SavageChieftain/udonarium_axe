export * from '@axe/features/tabletop/range/range-render-types';

import {
  CustomRenderBoundingBox,
  CustomRenderInput,
  renderCustom,
} from '@axe/features/tabletop/range/range-render-custom';
import {
  renderHexagon,
  renderLine,
  renderPentagon,
  renderSquare,
  renderTriangle,
} from '@axe/features/tabletop/range/range-render-polygon';
import { renderCircle, renderCorn } from '@axe/features/tabletop/range/range-render-radial';
import type {
  ClipAreaCorn,
  ClipAreaHexagon,
  ClipAreaLine,
  ClipAreaPentagon,
  ClipAreaSquare,
  ClipAreaTriangle,
  RangeRenderSetting,
} from '@axe/features/tabletop/range/range-render-types';

export class RangeRender {
  constructor(
    readonly canvasElement: HTMLCanvasElement,
    readonly canvasElementRange: HTMLCanvasElement
  ) {}

  renderCircle(setting: RangeRenderSetting): void {
    renderCircle(this.canvasElement, this.canvasElementRange, setting);
  }

  renderLine(setting: RangeRenderSetting): ClipAreaLine {
    return renderLine(this.canvasElement, this.canvasElementRange, setting);
  }

  renderSquare(setting: RangeRenderSetting): ClipAreaSquare {
    return renderSquare(this.canvasElement, this.canvasElementRange, setting);
  }

  renderCorn(setting: RangeRenderSetting): ClipAreaCorn {
    return renderCorn(this.canvasElement, this.canvasElementRange, setting);
  }

  renderTriangle(setting: RangeRenderSetting): ClipAreaTriangle {
    return renderTriangle(this.canvasElement, this.canvasElementRange, setting);
  }

  renderPentagon(setting: RangeRenderSetting): ClipAreaPentagon {
    return renderPentagon(this.canvasElement, this.canvasElementRange, setting);
  }

  renderHexagon(setting: RangeRenderSetting): ClipAreaHexagon {
    return renderHexagon(this.canvasElement, this.canvasElementRange, setting);
  }

  renderCustom(setting: RangeRenderSetting, input: CustomRenderInput): CustomRenderBoundingBox {
    return renderCustom(this.canvasElement, this.canvasElementRange, setting, input);
  }
}
