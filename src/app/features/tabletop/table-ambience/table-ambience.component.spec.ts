import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TabletopService } from '@axe/application/tabletop/tabletop.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { TableAmbience } from '@axe/domain/tabletop/table-ambience';
import { TableAmbienceComponent } from '@axe/features/tabletop/table-ambience/table-ambience.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';
import { MovableDirective } from '@axe/ui/directives/movable.directive';

describe('TableAmbienceComponent', () => {
  let fixture: ComponentFixture<TableAmbienceComponent>;
  let ambience: TableAmbience;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TableAmbienceComponent],
      providers: [...TEST_PROVIDERS],
    });

    // What the particles look like is settled by the domain specs. This watches only the
    // placement, so it never takes hold of a 2D context, which differs between runtimes.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null as never);

    ambience = TableAmbience.create('毒沼', 'swamp', 4, 4);
    fixture = TestBed.createComponent(TableAmbienceComponent);
    fixture.componentRef.setInput('ambience', ambience);
  });

  afterEach(() => {
    ObjectStore.instance.remove(ambience);
    vi.restoreAllMocks();
  });

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  it('sizes itself by the cells it covers', () => {
    const gridSize = TestBed.inject(TabletopService).gridSize();
    fixture.detectChanges();

    const root = element().querySelector<HTMLElement>('div')!;
    expect(root.style.width).toBe(`${4 * gridSize}px`);
    expect(root.style.height).toBe(`${4 * gridSize}px`);
  });

  it('lays the surface down', () => {
    fixture.detectChanges();

    const surface = element().querySelectorAll<HTMLElement>('div')[1];
    expect(surface.style.background.length).toBeGreaterThan(0);
  });

  it('draws the flat surface and the upright part on separate canvases', () => {
    fixture.detectChanges();

    const canvases = Array.from(element().querySelectorAll<HTMLElement>('effect-canvas'));
    expect(canvases.length).toBeGreaterThanOrEqual(2);

    const [surface, ...vapors] = canvases;
    // The surface stays flat on the board while only the upright part faces the camera.
    expect(surface.style.transform).toBe('');
    expect(vapors.length).toBeGreaterThan(0);
    for (const vapor of vapors) expect(vapor.style.transform).toContain('rotateX(');
  });

  it('layers the upright part deeper over a wider area', async () => {
    // A single sheet puts the far and the near at the same depth, which reads as a band.
    fixture.detectChanges();
    const narrow = fixture.componentInstance.vaporSlices().length;

    ambience.width = 16;
    ambience.height = 16;
    await new Promise((resolve) => setTimeout(resolve, 20));
    fixture.detectChanges();

    expect(fixture.componentInstance.vaporSlices().length).toBeGreaterThan(narrow);
  });

  it('raises the far sheets above the near ones', async () => {
    ambience.height = 16;
    await new Promise((resolve) => setTimeout(resolve, 20));
    fixture.detectChanges();

    const grounds = fixture.componentInstance.vaporSlices().map((slice) => slice.groundY);
    expect(grounds.length).toBeGreaterThan(1);
    for (let index = 1; index < grounds.length; index++) {
      expect(grounds[index]).toBeGreaterThan(grounds[index - 1]);
    }
  });

  it('lets the board take the pointer while it is locked', () => {
    ambience.isLock = true;
    fixture.detectChanges();

    const surface = element().querySelectorAll<HTMLElement>('div')[1];
    expect(surface.hasAttribute('data-table-passthrough')).toBe(true);
  });

  describe('changing it after it is placed', () => {
    /**
     * A computed that reads the version and returns the object hands back the same reference,
     * so nothing downstream hears the change and neither the lock nor the size takes effect.
     */
    async function applyChange(change: () => void): Promise<void> {
      fixture.detectChanges();
      change();
      await new Promise((resolve) => setTimeout(resolve, 20));
      fixture.detectChanges();
    }

    it('cannot be moved once locked', async () => {
      const movable = fixture.debugElement.query(By.directive(MovableDirective)).injector.get(MovableDirective);
      expect(movable.isDisable()).toBe(false);

      await applyChange(() => (ambience.isLock = true));

      expect(movable.isDisable()).toBe(true);
    });

    it('takes a change of size at once', async () => {
      const gridSize = TestBed.inject(TabletopService).gridSize();

      await applyChange(() => {
        ambience.width = 12;
        ambience.height = 20;
      });

      expect(fixture.componentInstance.pixelWidth()).toBe(12 * gridSize);
      expect(fixture.componentInstance.pixelHeight()).toBe(20 * gridSize);
    });

    it('takes a change of kind at once', async () => {
      const before = fixture.componentInstance.surfaceWash();

      await applyChange(() => (ambience.ambienceKind = 'lava'));

      expect(fixture.componentInstance.surfaceWash()).not.toBe(before);
    });
  });
});
