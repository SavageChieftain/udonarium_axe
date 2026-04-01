export * from '@axe/features/tabletop/range/range-render-types';

import { renderDiamond, renderLine, renderSquare } from '@axe/features/tabletop/range/range-render-polygon';
import { renderCircle, renderCorn } from '@axe/features/tabletop/range/range-render-radial';
import type {
  ClipAreaCorn,
  ClipAreaDiamond,
  ClipAreaLine,
  ClipAreaSquare,
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

  renderDiamond(setting: RangeRenderSetting): ClipAreaDiamond {
    return renderDiamond(this.canvasElement, this.canvasElementRange, setting);
  }

  renderCorn(setting: RangeRenderSetting): ClipAreaCorn {
    return renderCorn(this.canvasElement, this.canvasElementRange, setting);
  }
}
