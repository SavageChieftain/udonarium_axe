import { EffectParticle, EffectParticleLayer } from '@axe/domain/effect/effect-particles';
import { drawParticleLayer } from '@axe/features/effect/effect-canvas/draw-particles';
import { withAlpha } from '@axe/features/effect/effect-canvas/particle-texture';

describe('withAlpha()', () => {
  it('6 桁の hex を rgba に変換すること', () => {
    expect(withAlpha('#ff5a33', 0.5)).toBe('rgba(255, 90, 51, 0.5)');
  });

  it('3 桁の hex を展開すること', () => {
    expect(withAlpha('#fff', 1)).toBe('rgba(255, 255, 255, 1)');
  });

  it('hex でなければそのまま返すこと', () => {
    expect(withAlpha('rgb(1, 2, 3)', 0.4)).toBe('rgb(1, 2, 3)');
  });
});

describe('drawParticleLayer()', () => {
  interface Call {
    op: string;
    alpha: number;
  }

  function makeContext(calls: Call[]): CanvasRenderingContext2D {
    const state = { globalCompositeOperation: 'source-over', globalAlpha: 1 };
    return {
      get globalCompositeOperation() {
        return state.globalCompositeOperation;
      },
      set globalCompositeOperation(value: string) {
        state.globalCompositeOperation = value;
      },
      get globalAlpha() {
        return state.globalAlpha;
      },
      set globalAlpha(value: number) {
        state.globalAlpha = value;
      },
      setTransform: () => undefined,
      clearRect: () => undefined,
      translate: () => undefined,
      rotate: () => undefined,
      drawImage: () => calls.push({ op: state.globalCompositeOperation, alpha: state.globalAlpha }),
    } as unknown as CanvasRenderingContext2D;
  }

  function makeParticle(overrides: Partial<EffectParticle>): EffectParticle {
    return {
      x: 0,
      y: 0,
      size: 10,
      angle: 0,
      stretch: 1,
      color: '#ffffff',
      alpha: 1,
      shape: 'glow',
      ...overrides,
    };
  }

  function makeLayer(particles: EffectParticle[]): EffectParticleLayer {
    return { width: 100, height: 100, originX: 50, originY: 70, particles };
  }

  const stubTexture = () => ({}) as CanvasImageSource;

  it('煙は通常合成、光る粒は加算合成で描くこと', () => {
    const calls: Call[] = [];
    drawParticleLayer(
      makeContext(calls),
      makeLayer([makeParticle({ shape: 'glow' }), makeParticle({ shape: 'smoke' })]),
      1,
      stubTexture
    );

    expect(calls).toHaveLength(2);
    // 煙を先に敷いてから光を重ねる。順序が逆だと光が煙に覆われる。
    expect(calls[0].op).toBe('source-over');
    expect(calls[1].op).toBe('lighter');
  });

  it('見えない粒を描かないこと', () => {
    const calls: Call[] = [];
    drawParticleLayer(
      makeContext(calls),
      makeLayer([makeParticle({ alpha: 0 }), makeParticle({ size: 0 }), makeParticle({ alpha: 0.5 })]),
      1,
      stubTexture
    );

    expect(calls).toHaveLength(1);
    expect(calls[0].alpha).toBe(0.5);
  });

  it('描き終わりに合成モードを戻すこと', () => {
    const calls: Call[] = [];
    const context = makeContext(calls);
    drawParticleLayer(context, makeLayer([makeParticle({})]), 2, stubTexture);

    expect(context.globalCompositeOperation).toBe('source-over');
    expect(context.globalAlpha).toBe(1);
  });
});
