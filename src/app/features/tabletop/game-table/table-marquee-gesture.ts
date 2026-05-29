export interface MarqueePoint {
  x: number;
  y: number;
}

export interface MarqueeRect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface MarqueeModifiers {
  shift: boolean;
  ctrl: boolean;
}

export type MarqueeStartHandler = (point: MarqueePoint, modifiers: MarqueeModifiers) => void;
export type MarqueeUpdateHandler = (point: MarqueePoint) => void;
export type MarqueeEndHandler = (rect: MarqueeRect, modifiers: MarqueeModifiers) => void;

type ScreenToTablePoint = (screenX: number, screenY: number) => MarqueePoint;

export const MARQUEE_MOUSE_LONG_PRESS_MS = 350;
export const MARQUEE_TOUCH_LONG_PRESS_MS = 500;
export const MARQUEE_MOVE_CANCEL_THRESHOLD_PX = 6;

export class TableMarqueeGesture {
  onMarqueeStart: MarqueeStartHandler | null = null;
  onMarqueeUpdate: MarqueeUpdateHandler | null = null;
  onMarqueeEnd: MarqueeEndHandler | null = null;

  private timer: ReturnType<typeof setTimeout> | null = null;
  private active = false;
  private startScreenX = 0;
  private startScreenY = 0;
  private startTablePoint: MarqueePoint | null = null;
  private currentTablePoint: MarqueePoint | null = null;

  constructor(private readonly toTablePoint: ScreenToTablePoint) {}

  arm(event: PointerEvent | MouseEvent): boolean {
    this.cancel();
    if (event.button !== 0) return false;
    if (event.ctrlKey || event.metaKey || event.altKey) return false;
    const pointerType = (event as PointerEvent).pointerType ?? 'mouse';
    const isTouchLike = pointerType === 'touch' || pointerType === 'pen';
    const delay = isTouchLike ? MARQUEE_TOUCH_LONG_PRESS_MS : MARQUEE_MOUSE_LONG_PRESS_MS;
    this.startScreenX = event.pageX;
    this.startScreenY = event.pageY;
    const modifiers: MarqueeModifiers = { shift: event.shiftKey, ctrl: event.ctrlKey };
    this.timer = setTimeout(() => {
      this.timer = null;
      this.fire(modifiers);
    }, delay);
    return true;
  }

  private fire(modifiers: MarqueeModifiers): void {
    const point = this.toTablePoint(this.startScreenX, this.startScreenY);
    this.active = true;
    this.startTablePoint = point;
    this.currentTablePoint = point;
    this.onMarqueeStart?.(point, modifiers);
  }

  updatePointer(screenX: number, screenY: number): void {
    if (!this.active) {
      if (this.timer != null) {
        const dx = screenX - this.startScreenX;
        const dy = screenY - this.startScreenY;
        if (dx * dx + dy * dy > MARQUEE_MOVE_CANCEL_THRESHOLD_PX ** 2) {
          this.cancel();
        }
      }
      return;
    }
    const point = this.toTablePoint(screenX, screenY);
    this.currentTablePoint = point;
    this.onMarqueeUpdate?.(point);
  }

  release(event?: PointerEvent | MouseEvent): boolean {
    if (!this.active) {
      this.cancel();
      return false;
    }
    const start = this.startTablePoint;
    const end = this.currentTablePoint ?? this.startTablePoint;
    if (!start || !end) {
      this.reset();
      return false;
    }
    const modifiers: MarqueeModifiers = {
      shift: event?.shiftKey ?? false,
      ctrl: event?.ctrlKey ?? false,
    };
    const rect: MarqueeRect = { x1: start.x, y1: start.y, x2: end.x, y2: end.y };
    this.reset();
    this.onMarqueeEnd?.(rect, modifiers);
    return true;
  }

  cancel(): void {
    if (this.timer != null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.reset();
  }

  private reset(): void {
    this.active = false;
    this.startTablePoint = null;
    this.currentTablePoint = null;
  }

  get isActive(): boolean {
    return this.active;
  }

  get isArmed(): boolean {
    return this.timer != null;
  }
}
