import { signal } from '@angular/core';
import { pieceImageView } from '@axe/ui/tabletop/piece-image-view';
import { supersampleFactor, supersampleTransform } from '@axe/ui/tabletop/supersample';

function loaded(naturalWidth: number, naturalHeight: number): Event {
  return { target: { naturalWidth, naturalHeight } } as unknown as Event;
}

describe('pieceImageView', () => {
  const url = signal('a.png');
  const poster = signal(false);
  const sizePx = signal(100);
  const specified = signal<number | null>(null);
  const billboard = signal(true);
  const billboardTransform = signal('rotateX(50deg)');

  function view(squarePoster = false) {
    return pieceImageView({
      imageUrl: url,
      isPoster: poster,
      sizePx,
      specifiedHeightPx: specified,
      billboardEnabled: billboard,
      billboardTransform,
      squarePoster,
    });
  }

  beforeEach(() => {
    url.set('a.png');
    poster.set(false);
    sizePx.set(100);
    specified.set(null);
    billboard.set(true);
  });

  it('draws at one to one until the picture is read', () => {
    const image = view();
    expect(image.supersample()).toBe(1);
    expect(image.supersamplePercent()).toBe('100%');
    expect(image.boxHeightPx()).toBeNull();
  });

  it('oversamples a picture wider than its box, and works out the box height from its shape', () => {
    const image = view();
    image.onImageLoad(loaded(400, 200));
    expect(image.supersample()).toBe(supersampleFactor(400, 100));
    expect(image.boxHeightPx()).toBe(50);
    expect(image.komaTransform()).toBe(
      supersampleTransform({
        factor: image.supersample(),
        anchor: 'bottom',
        outer: 'translateX(-50%) translateX(50px)',
        inner: 'rotateX(50deg)',
      })
    );
  });

  it('goes by the height a piece asks for when it asks for one', () => {
    const image = view();
    image.onImageLoad(loaded(400, 200));
    specified.set(80);
    expect(image.supersample()).toBe(supersampleFactor(200, 80));
    expect(image.boxHeightPx()).toBe(80);
  });

  it('forgets the picture size when the picture changes, and ignores an empty read', () => {
    const image = view();
    image.onImageLoad(loaded(400, 200));
    url.set('b.png');
    expect(image.supersample()).toBe(1);
    image.onImageLoad(loaded(0, 0));
    expect(image.supersample()).toBe(1);
  });

  it('fits a square poster by its shorter side and gives it no box height', () => {
    const image = view(true);
    poster.set(true);
    image.onImageLoad(loaded(400, 200));
    expect(image.supersample()).toBe(supersampleFactor(200, 100));
    expect(image.boxHeightPx()).toBeNull();
    expect(image.posterTransform()).toBe(supersampleTransform({ factor: image.supersample(), anchor: 'center' }));
  });

  it('leaves the billboard turn off the picture when the table does not billboard', () => {
    const image = view();
    billboard.set(false);
    expect(image.pieceTransform()).toBe(supersampleTransform({ factor: 1, anchor: 'bottom', inner: '' }));
  });
});
