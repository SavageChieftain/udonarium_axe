import { computed, linkedSignal, Signal } from '@angular/core';
import { supersampleFactor, supersampleInsetPercent, supersampleTransform } from '@axe/ui/tabletop/supersample';

export interface PieceImageViewInputs {
  imageUrl: Signal<string>;
  isPoster: Signal<boolean>;
  sizePx: Signal<number>;
  specifiedHeightPx: Signal<number | null>;
  billboardEnabled: Signal<boolean>;
  billboardTransform: Signal<string>;
  squarePoster?: boolean;
}

export interface PieceImageView {
  readonly naturalSize: Signal<{ width: number; height: number } | null>;
  readonly supersample: Signal<number>;
  readonly supersamplePercent: Signal<string>;
  readonly supersampleInset: Signal<string>;
  readonly boxHeightPx: Signal<number | null>;
  readonly komaTransform: Signal<string>;
  readonly pieceTransform: Signal<string>;
  readonly posterTransform: Signal<string>;
  onImageLoad(event: Event): void;
}

export function pieceImageView(inputs: PieceImageViewInputs): PieceImageView {
  const natural = linkedSignal<string, { width: number; height: number } | null>({
    source: inputs.imageUrl,
    computation: () => null,
  });
  const squarePoster = () => inputs.squarePoster === true && inputs.isPoster();

  const supersample = computed(() => {
    const size = natural();
    if (!size) return 1;
    if (squarePoster()) return supersampleFactor(Math.min(size.width, size.height), inputs.sizePx());
    const specified = inputs.specifiedHeightPx();
    if (specified !== null) return supersampleFactor(size.height, specified);
    return supersampleFactor(size.width, inputs.sizePx());
  });

  const boxHeightPx = computed(() => {
    const size = natural();
    if (!size || supersample() <= 1 || squarePoster()) return null;
    const specified = inputs.specifiedHeightPx();
    if (specified !== null) return specified;
    return (inputs.sizePx() * size.height) / size.width;
  });

  const inner = () => (inputs.billboardEnabled() ? inputs.billboardTransform() : '');

  return {
    naturalSize: natural.asReadonly(),
    supersample,
    supersamplePercent: computed(() => supersample() * 100 + '%'),
    supersampleInset: computed(() => supersampleInsetPercent(supersample()) + '%'),
    boxHeightPx,
    komaTransform: computed(() =>
      supersampleTransform({
        factor: supersample(),
        anchor: 'bottom',
        outer: `translateX(-50%) translateX(${inputs.sizePx() / 2}px)`,
        inner: inner(),
      })
    ),
    pieceTransform: computed(() => supersampleTransform({ factor: supersample(), anchor: 'bottom', inner: inner() })),
    posterTransform: computed(() => supersampleTransform({ factor: supersample(), anchor: 'center' })),
    onImageLoad(event: Event): void {
      const img = event.target as HTMLImageElement;
      if (img.naturalWidth <= 0 || img.naturalHeight <= 0) return;
      natural.set({ width: img.naturalWidth, height: img.naturalHeight });
    },
  };
}
