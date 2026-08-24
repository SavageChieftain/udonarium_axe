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
});
