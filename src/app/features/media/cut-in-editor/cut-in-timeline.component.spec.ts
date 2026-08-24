import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ObjectStore } from '@axe/core/sync/object-store';
import { encodeCutInTracks } from '@axe/domain/media/cut-in-keyframe';
import { CutInLayer } from '@axe/domain/media/cut-in-layer';
import { CutInTimelineComponent } from '@axe/features/media/cut-in-editor/cut-in-timeline.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('CutInTimelineComponent', () => {
  let fixture: ComponentFixture<CutInTimelineComponent>;
  let component: CutInTimelineComponent;
  let store: ObjectStore;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [CutInTimelineComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    store = ObjectStore.instance;
    store.getObjects().forEach((object) => store.delete(object, false));
    store.clearDeleteHistory();
    fixture = TestBed.createComponent(CutInTimelineComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    store.getObjects().forEach((object) => store.delete(object, false));
    store.clearDeleteHistory();
  });

  function makeLayer(name: string, fields: Partial<CutInLayer> = {}): CutInLayer {
    const layer = new CutInLayer();
    layer.initialize();
    layer.name = name;
    Object.assign(layer, fields);
    return layer;
  }

  function show(layers: CutInLayer[], durationMs = 2000): void {
    fixture.componentRef.setInput('layers', layers);
    fixture.componentRef.setInput('durationMs', durationMs);
    fixture.componentRef.setInput('isEditable', true);
    fixture.detectChanges();
  }

  it('says so when there is nothing to lay out', () => {
    show([]);

    expect(component.rows()).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('レイヤーがありません');
  });

  it('reads the stack from the top down, as the layer list does', () => {
    show([makeLayer('下'), makeLayer('上')]);

    expect(component.rows().map((row) => row.layer.name)).toEqual(['上', '下']);
  });

  it('runs a bar across the whole scene for a layer with no end', () => {
    show([makeLayer('背景')]);

    const row = component.rows()[0];
    expect(row.left).toBe(0);
    expect(row.width).toBeCloseTo(component.pxPerSec() * 2, 5);
  });

  it('starts and ends the bar where the layer does', () => {
    show([makeLayer('文字', { startMs: 500, endMs: 1500 })]);

    const row = component.rows()[0];
    expect(row.left).toBeCloseTo(component.pxPerSec() * 0.5, 5);
    expect(row.width).toBeCloseTo(component.pxPerSec(), 5);
  });

  it('marks every moment a key stands at', () => {
    const layer = makeLayer('立ち絵', {
      tracks: encodeCutInTracks({
        x: [
          { t: 0, v: 0 },
          { t: 800, v: 100 },
        ],
        opacity: [{ t: 800, v: 1 }],
      }),
    });

    show([layer]);

    expect(component.rows()[0].keys.map((key) => key.ms)).toEqual([0, 800]);
  });

  it('writes the clock out for the scrubber and the scene', () => {
    show([makeLayer('背景')], 2500);
    fixture.componentRef.setInput('playheadMs', 1234);
    fixture.detectChanges();

    expect(component.clock()).toBe('0:01.23 / 0:02.50');
  });

  it('lays a ruler with something to read along it', () => {
    show([makeLayer('背景')]);

    expect(component.ticks().length).toBeGreaterThan(2);
    expect(component.ticks()[0].ms).toBe(0);
  });
});
