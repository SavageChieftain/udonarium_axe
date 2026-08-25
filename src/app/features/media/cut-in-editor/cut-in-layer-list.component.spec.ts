import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ObjectStore } from '@axe/core/sync/object-store';
import { CutInLayer } from '@axe/domain/media/cut-in-layer';
import { CutInLayerListComponent } from '@axe/features/media/cut-in-editor/cut-in-layer-list.component';
import { TIMELINE_ROW_H_PX } from '@axe/features/media/cut-in-editor/cut-in-timeline-geometry';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('CutInLayerListComponent', () => {
  let fixture: ComponentFixture<CutInLayerListComponent>;
  let component: CutInLayerListComponent;
  let store: ObjectStore;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [CutInLayerListComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    store = ObjectStore.instance;
    store.getObjects().forEach((object) => store.delete(object, false));
    store.clearDeleteHistory();
    fixture = TestBed.createComponent(CutInLayerListComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    store.getObjects().forEach((object) => store.delete(object, false));
    store.clearDeleteHistory();
  });

  function makeLayer(name: string): CutInLayer {
    const layer = new CutInLayer();
    layer.initialize();
    layer.name = name;
    return layer;
  }

  function show(layers: CutInLayer[]): void {
    fixture.componentRef.setInput('layers', layers);
    fixture.componentRef.setInput('isEditable', true);
    fixture.detectChanges();
  }

  function rowText(): string[] {
    return [...fixture.nativeElement.querySelectorAll('li span')].map((el) => (el as HTMLElement).textContent?.trim());
  }

  it('has no heads to show where there are no layers', () => {
    show([]);

    expect(fixture.nativeElement.querySelectorAll('li')).toHaveLength(0);
  });

  it('stands each head as tall as the band it sits beside', () => {
    show([makeLayer('上'), makeLayer('下')]);

    const rows = [...fixture.nativeElement.querySelectorAll('li')] as HTMLElement[];
    for (const row of rows) expect(row.style.height).toBe(`${TIMELINE_ROW_H_PX}px`);
  });

  it('reads the stack from the top down', () => {
    show([makeLayer('下'), makeLayer('中'), makeLayer('上')]);

    expect(rowText()).toEqual(['上', '中', '下']);
  });

  it('names a layer that was never named', () => {
    show([makeLayer('')]);

    expect(rowText()).toEqual(['（名称未設定）']);
  });

  it('hands out the layer that was clicked', () => {
    const layers = [makeLayer('下'), makeLayer('上')];
    show(layers);
    let picked: CutInLayer | null = null;
    component.selectLayer.subscribe((layer) => (picked = layer));

    (fixture.nativeElement.querySelectorAll('li')[0] as HTMLElement).click();

    expect(picked).toBe(layers[1]);
  });

  it('asks for a layer to be turned off', () => {
    const layers = [makeLayer('下')];
    show(layers);
    let toggled: CutInLayer | null = null;
    component.toggleHidden.subscribe((layer) => (toggled = layer));

    (fixture.nativeElement.querySelector('li button') as HTMLElement).click();

    expect(toggled).toBe(layers[0]);
  });
});
