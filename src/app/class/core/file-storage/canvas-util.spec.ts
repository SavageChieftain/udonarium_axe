import { vi, describe, it, expect } from 'vitest';
import { CanvasUtil } from './canvas-util';

describe('CanvasUtil', () => {
  describe('resize', () => {
    function createMockCanvas(w: number, h: number) {
      const imgData = { data: new Uint8ClampedArray(w * h * 4) };
      const ctx = {
        getImageData: vi.fn().mockReturnValue(imgData),
        createImageData: vi.fn().mockImplementation((cw: number, ch: number) => ({
          data: new Uint8ClampedArray(cw * ch * 4),
        })),
        clearRect: vi.fn(),
        putImageData: vi.fn(),
      };
      const canvas = { width: w, height: h, getContext: vi.fn().mockReturnValue(ctx) };
      return { canvas: canvas as unknown as HTMLCanvasElement, ctx };
    }

    it('resize_canvas=trueの場合キャンバスサイズを変更する', () => {
      const { canvas } = createMockCanvas(100, 100);
      CanvasUtil.resize(canvas, 50, 50, true);
      expect(canvas.width).toBe(50);
      expect(canvas.height).toBe(50);
    });

    it('resize_canvas=falseの場合キャンバスサイズは変更しない', () => {
      const { canvas, ctx } = createMockCanvas(100, 100);
      CanvasUtil.resize(canvas, 50, 50, false);
      expect(canvas.width).toBe(100);
      expect(canvas.height).toBe(100);
      expect(ctx.clearRect).toHaveBeenCalled();
    });

    it('putImageDataが呼ばれる', () => {
      const { canvas, ctx } = createMockCanvas(100, 100);
      CanvasUtil.resize(canvas, 50, 50, true);
      expect(ctx.putImageData).toHaveBeenCalled();
    });
  });
});
