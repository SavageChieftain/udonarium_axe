export interface SpotRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface SpotSize {
  width: number;
  height: number;
}

const MARGIN = 8;

/**
 * Where a panel opened from a control belongs: centred on it and just clear of it, above where
 * there is room and below where there is not, never off the edge of the screen.
 */
export function spotBeside(anchor: SpotRect, size: SpotSize, viewport: SpotSize): { left: number; top: number } {
  const above = anchor.top - size.height - MARGIN;
  const below = anchor.bottom + MARGIN;
  const top = above >= MARGIN ? above : below;
  const left = anchor.left + (anchor.right - anchor.left) / 2 - size.width / 2;

  return {
    left: clamp(left, viewport.width, size.width),
    top: clamp(top, viewport.height, size.height),
  };
}

function clamp(value: number, room: number, length: number): number {
  return Math.round(Math.max(MARGIN, Math.min(value, Math.max(MARGIN, room - length - MARGIN))));
}
