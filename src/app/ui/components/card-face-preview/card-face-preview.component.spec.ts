import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Card } from '@axe/domain/card/card';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';
import { CardFacePreviewComponent } from '@axe/ui/components/card-face-preview/card-face-preview.component';

describe('CardFacePreviewComponent', () => {
  let fixture: ComponentFixture<CardFacePreviewComponent>;
  let card: Card;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardFacePreviewComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();

    card = Card.create('preview', 'front.png', 'back.png');
    card.faceText = 'scaled text';
    fixture = TestBed.createComponent(CardFacePreviewComponent);
    fixture.componentRef.setInput('card', card);
    fixture.componentRef.setInput('imageUrl', 'front.png');
    fixture.componentRef.setInput('frameWidth', 64);
    fixture.componentRef.setInput('frameHeight', 64);
  });

  afterEach(() => card.destroy());

  it('fits the text plane to the contained image and scales it from the tabletop width', () => {
    const component = fixture.componentInstance as unknown as {
      onImageLoad(image: HTMLImageElement): void;
    };
    component.onImageLoad({ naturalWidth: 200, naturalHeight: 300 } as HTMLImageElement);
    fixture.detectChanges();

    const rect = fixture.componentInstance.imageRect();
    expect(rect?.left).toBeCloseTo(10.67, 1);
    expect(rect?.top).toBe(0);
    expect(rect?.width).toBeCloseTo(42.67, 1);
    expect(rect?.height).toBe(64);
    expect(fixture.componentInstance.textScale()).toBeCloseTo(0.427, 2);
    expect(fixture.nativeElement.querySelector('card-face-text')?.textContent).toContain('scaled text');
  });

  it('fills the room it was given when no frame is named', () => {
    fixture.componentRef.setInput('frameWidth', 0);
    fixture.componentRef.setInput('frameHeight', 0);
    fixture.componentRef.setInput('framed', false);
    fixture.detectChanges();

    const frame = fixture.nativeElement.querySelector('div') as HTMLElement;
    expect(frame.style.width).toBe('100%');
    expect(frame.style.height).toBe('100%');
    expect(frame.classList.contains('bg-ui-input')).toBe(false);
  });

  it('reserves padding before fitting a popup image', () => {
    fixture.componentRef.setInput('frameWidth', 250);
    fixture.componentRef.setInput('frameHeight', 330);
    fixture.componentRef.setInput('padding', 8);
    const component = fixture.componentInstance as unknown as {
      onImageLoad(image: HTMLImageElement): void;
    };
    component.onImageLoad({ naturalWidth: 200, naturalHeight: 300 } as HTMLImageElement);

    const rect = fixture.componentInstance.imageRect();
    expect(rect?.top).toBe(8);
    expect(rect?.height).toBe(314);
    expect(rect?.width).toBeCloseTo(209.33, 1);
  });
});
