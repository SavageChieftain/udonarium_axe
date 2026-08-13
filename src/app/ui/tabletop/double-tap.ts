/** 2 度目を待つ間(ms)。指は狙いが甘くなるぶん長めに取る。 */
const MOUSE_WINDOW_MS = 300;
const TOUCH_WINDOW_MS = 500;
/** 2 度目が「同じ場所」と言える範囲(px)。 */
const SLOP_PX = 10;

interface PointerInput {
  pointer: { x: number; y: number };
  onEnd: ((event: MouseEvent | TouchEvent) => void) | null;
}

/**
 * 盤上の駒を 2 度叩いたことの判定。
 *
 * 指で叩いたときは、2 度目を離した瞬間に効かせる。押した瞬間だと、めくるつもりで
 * 置いた指がそのまま移動になってしまう。
 */
export class DoubleTap {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private firstPoint = { x: 0, y: 0 };

  constructor(private readonly inputOf: () => PointerInput | null) {}

  /** 1 度目なら覚えるだけ。2 度目なら `run` を呼ぶ。 */
  handle(event: MouseEvent | TouchEvent, run: () => void): void {
    const input = this.inputOf();
    if (!input) return;

    if (!this.timer) {
      this.cancel();
      this.timer = setTimeout(() => this.cancel(), isTouch(event) ? TOUCH_WINDOW_MS : MOUSE_WINDOW_MS);
      this.firstPoint = input.pointer;
      return;
    }

    if (isTouch(event)) input.onEnd = () => run();
    else run();
  }

  /** 2 度目が 1 度目と同じ場所か。離れていれば、狙ったのは別の場所。 */
  isInPlace(): boolean {
    const input = this.inputOf();
    if (!input) return false;
    const dx = this.firstPoint.x - input.pointer.x;
    const dy = this.firstPoint.y - input.pointer.y;
    return dx * dx + dy * dy < SLOP_PX * SLOP_PX;
  }

  cancel(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    const input = this.inputOf();
    if (input) input.onEnd = null;
  }
}

function isTouch(event: MouseEvent | TouchEvent): boolean {
  return (event as TouchEvent).touches != null;
}
