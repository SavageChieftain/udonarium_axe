import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ObjectStore } from '@axe/core/sync/object-store';
import { encodeCutInTracks } from '@axe/domain/media/cut-in-keyframe';
import { CutInLayer } from '@axe/domain/media/cut-in-layer';
import { CutInLayerPropertiesComponent } from '@axe/features/media/cut-in-editor/cut-in-layer-properties.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('CutInLayerPropertiesComponent', () => {
  let fixture: ComponentFixture<CutInLayerPropertiesComponent>;
  let component: CutInLayerPropertiesComponent;
  let store: ObjectStore;
  let layer: CutInLayer;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [CutInLayerPropertiesComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    store = ObjectStore.instance;
    store.getObjects().forEach((object) => store.delete(object, false));
    store.clearDeleteHistory();

    layer = new CutInLayer();
    layer.initialize();
    layer.x = 100;

    fixture = TestBed.createComponent(CutInLayerPropertiesComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('layer', layer);
    fixture.componentRef.setInput('isEditable', true);
    fixture.detectChanges();
  });

  afterEach(() => {
    store.getObjects().forEach((object) => store.delete(object, false));
    store.clearDeleteHistory();
  });

  function atPlayhead(ms: number): void {
    fixture.componentRef.setInput('playheadMs', ms);
    fixture.detectChanges();
  }

  it('says nothing without a layer', () => {
    fixture.componentRef.setInput('layer', null);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('レイヤーを選ぶ');
  });

  it('moves where the layer rests while nothing moves it', () => {
    component.x = 250;

    expect(layer.x).toBe(250);
    expect(layer.tracks).toBe('');
  });

  it('reads what a track says at the scrubber', () => {
    layer.tracks = encodeCutInTracks({
      x: [
        { t: 0, v: 0, e: 'linear' },
        { t: 1000, v: 200 },
      ],
    });
    atPlayhead(500);

    expect(component.x).toBe(100);
  });

  it('writes onto the track once one is there', () => {
    layer.tracks = encodeCutInTracks({
      x: [
        { t: 0, v: 0 },
        { t: 1000, v: 200 },
      ],
    });
    atPlayhead(500);

    component.x = 42;

    expect(component.x).toBe(42);
    expect(layer.x).toBe(100);
  });

  it('puts a key down at the scrubber and takes it up again', () => {
    atPlayhead(400);

    expect(component.keyed('x')).toBe(false);

    component.toggleKey('x');
    expect(component.keyed('x')).toBe(true);

    component.toggleKey('x');
    expect(component.keyed('x')).toBe(false);
  });

  it('keys both directions of the scale together', () => {
    atPlayhead(400);

    component.toggleKey('scaleX');

    expect(component.keyed('scaleX')).toBe(true);
    expect(layer.trackSet.scaleY).toHaveLength(1);
  });

  it('tells the editor after every change', () => {
    let commits = 0;
    component.commit.subscribe(() => commits++);

    component.x = 10;
    component.rotation = 45;

    expect(commits).toBe(2);
  });

  it('changes nothing for a reader', () => {
    fixture.componentRef.setInput('isEditable', false);
    fixture.detectChanges();

    component.x = 999;

    expect(layer.x).toBe(100);
  });

  describe('what a text layer is told', () => {
    beforeEach(() => {
      layer.kind = 'text';
      fixture.detectChanges();
    });

    it('takes the words and the way they look', () => {
      component.text = '見せ場だ';
      component.fontSizePx = 64;
      component.color = '#ff8800';
      component.textAlign = 'left';

      expect(layer.text).toBe('見せ場だ');
      expect(layer.fontSizePx).toBe(64);
      expect(layer.color).toBe('#ff8800');
      expect(layer.textAlign).toBe('left');
    });

    it('holds the weight to what a font has', () => {
      component.fontWeight = 5000;
      expect(layer.fontWeight).toBe(900);

      component.fontWeight = 0;
      expect(layer.fontWeight).toBe(400);
    });

    it('turns away an alignment that means nothing', () => {
      component.textAlign = 'sideways' as never;

      expect(layer.textAlign).toBe('center');
    });

    it('never gives the outline a negative width', () => {
      component.strokeWidthPx = -4;

      expect(layer.strokeWidthPx).toBe(0);
    });
  });

  describe('what a band layer is told', () => {
    beforeEach(() => {
      layer.kind = 'fill';
      fixture.detectChanges();
    });

    it('starts as one flat colour', () => {
      expect(component.fillGradient).toBe(false);
    });

    it('shades into another colour when asked, starting from the one it has', () => {
      component.fillFrom = '#102030';
      component.fillGradient = true;

      expect(layer.fillTo).toBe('#102030');
      expect(component.fillGradient).toBe(true);
    });

    it('goes back to one colour when told to', () => {
      component.fillGradient = true;
      component.fillGradient = false;

      expect(layer.fillTo).toBe('');
    });

    it('takes the angle it shades along', () => {
      component.fillAngleDeg = 45;

      expect(layer.fillAngleDeg).toBe(45);
    });
  });
});
